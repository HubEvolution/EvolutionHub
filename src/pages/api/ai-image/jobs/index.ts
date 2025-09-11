import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess, createMethodNotAllowed } from '@/lib/api-middleware';
import { aiJobsLimiter } from '@/lib/rate-limiter';
import { AiJobsService } from '@/lib/services/ai-jobs-service';
import type { OwnerType } from '@/config/ai-image';

function ensureGuestIdCookie(context: Parameters<APIRoute>[0]): string {
  const existing = context.cookies.get('guest_id')?.value;
  if (existing) return existing;

  const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).toString();
  const url = new URL(context.request.url);
  context.cookies.set('guest_id', id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 60 * 60 * 24 * 180 // 180 days
  });
  return id;
}

export const POST = withApiMiddleware(async (context) => {
  const { locals, request } = context;

  // FormData parsing
  let imageFile: File | null = null;
  let modelSlug: string | null = null;

  try {
    const form = await request.formData();
    const f = form.get('image');
    const m = form.get('model');
    if (f instanceof File) imageFile = f;
    if (typeof m === 'string') modelSlug = m.trim();
  } catch {
    return createApiError('validation_error', 'Ungültige Formulardaten');
  }

  if (!imageFile) {
    return createApiError('validation_error', 'Bilddatei (field "image") ist erforderlich');
  }
  if (!modelSlug) {
    return createApiError('validation_error', 'Model (field "model") ist erforderlich');
  }

  // Owner detection
  const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

  const env = locals.runtime?.env ?? {} as any;
  const deps = { db: env.DB, isDevelopment: env.ENVIRONMENT !== 'production' };
  const service = new AiJobsService(deps, {
    R2_AI_IMAGES: env.R2_AI_IMAGES,
    KV_AI_ENHANCER: env.KV_AI_ENHANCER,
    REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
    ENVIRONMENT: env.ENVIRONMENT
  });

  const origin = new URL(request.url).origin;

  try {
    const job = await service.createJob({
      ownerType,
      ownerId,
      userId: ownerType === 'user' ? (locals.user as { id: string }).id : null,
      modelSlug,
      file: imageFile,
      requestOrigin: origin,
    });

    return createApiSuccess(job, 202);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    if (typeof (err as any)?.code === 'string' && (err as any).code === 'quota_exceeded') {
      return createApiError('forbidden', 'Kostenloses Nutzungslimit erreicht', (err as any).details || undefined);
    }
    if (message.includes('Unsupported content type') || message.includes('File too large') || message.includes('Unsupported model') || message.includes('Invalid file')) {
      return createApiError('validation_error', message);
    }
    return createApiError('server_error', message);
  }
}, { rateLimiter: aiJobsLimiter, enforceCsrfToken: true });

// 405s (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
