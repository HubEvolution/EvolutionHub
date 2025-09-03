import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess, createMethodNotAllowed } from '@/lib/api-middleware';
import { AiImageService } from '@/lib/services/ai-image-service';
import { FREE_LIMIT_GUEST, FREE_LIMIT_USER, type OwnerType } from '@/config/ai-image';
import { aiGenerateLimiter } from '@/lib/rate-limiter';

function ensureGuestIdCookie(context: Parameters<APIRoute>[0]): string {
  const existing = context.cookies.get('guest_id')?.value;
  if (existing) return existing;

  // Generate a stable guest ID
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
  let scale: 2 | 4 | undefined;
  let faceEnhance: boolean | undefined;

  try {
    const form = await request.formData();
    const f = form.get('image');
    const m = form.get('model');
    const s = form.get('scale');
    const fe = form.get('face_enhance');
    if (f instanceof File) imageFile = f;
    if (typeof m === 'string') modelSlug = m.trim();
    if (typeof s === 'string') {
      const n = Number(s);
      if (n === 2 || n === 4) scale = n;
    }
    if (typeof fe === 'string') {
      const v = fe.trim().toLowerCase();
      if (v === 'true' || v === '1' || v === 'on' || v === 'yes') faceEnhance = true;
      else if (v === 'false' || v === '0' || v === 'off' || v === 'no') faceEnhance = false;
    }
  } catch (e) {
    return createApiError('validation_error', 'Ungültige Formulardaten');
  }

  if (!imageFile) {
    return createApiError('validation_error', 'Bilddatei (field "image") ist erforderlich');
  }
  if (!modelSlug) {
    return createApiError('validation_error', 'Model (field "model") ist erforderlich');
  }

  // Owner detection: user or guest
  const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

  // Init service with runtime env
  const env = locals.runtime?.env ?? {};
  const service = new AiImageService({
    R2_AI_IMAGES: env.R2_AI_IMAGES,
    KV_AI_ENHANCER: env.KV_AI_ENHANCER,
    REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
    ENVIRONMENT: env.ENVIRONMENT
  });

  const origin = new URL(request.url).origin;

  try {
    const result = await service.generate({
      ownerType,
      ownerId,
      modelSlug,
      file: imageFile,
      requestOrigin: origin,
      scale,
      faceEnhance,
    });
    // Standard success shape
    return createApiSuccess({
      model: result.model,
      imageUrl: result.imageUrl,
      originalUrl: result.originalUrl,
      usage: result.usage,
      limits: {
        user: FREE_LIMIT_USER,
        guest: FREE_LIMIT_GUEST,
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    if (typeof (err as any)?.code === 'string' && (err as any).code === 'quota_exceeded') {
      return createApiError('forbidden', 'Kostenloses Nutzungslimit erreicht', (err as any).details || undefined);
    }
    // Map common validation failures
    if (message.includes('Unsupported content type') || message.includes('File too large') || message.includes('Unsupported model') || message.includes('Invalid file')) {
      return createApiError('validation_error', message);
    }
    return createApiError('server_error', message);
  }
}, { rateLimiter: aiGenerateLimiter, enforceCsrfToken: true });

// Explicit 405 for unsupported methods (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
