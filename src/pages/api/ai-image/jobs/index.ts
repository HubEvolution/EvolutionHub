import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { aiJobsLimiter } from '@/lib/rate-limiter';
import { AiJobsService } from '@/lib/services/ai-jobs-service';
import type { OwnerType } from '@/config/ai-image';
import { getEntitlementsFor, type Plan } from '@/config/ai-image/entitlements';
import type { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

function ensureGuestIdCookie(context: APIContext): string {
  const existing = context.cookies.get('guest_id')?.value;
  if (existing) return existing;

  const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).toString();
  const url = new URL(context.request.url);
  context.cookies.set('guest_id', id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return id;
}

export const POST = withApiMiddleware(
  async (context: APIContext) => {
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
    const ownerId =
      ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);
    const plan =
      ownerType === 'user'
        ? (((locals.user as { plan?: Plan } | null)?.plan ?? 'free') as Plan)
        : undefined;
    const ent = getEntitlementsFor(ownerType, plan);
    const effectiveLimit = ent.dailyBurstCap;

    const rawEnv = (locals.runtime?.env ?? {}) as Record<string, unknown>;
    const deps = {
      db: (rawEnv as { DB?: D1Database }).DB as D1Database,
      isDevelopment: ((rawEnv as { ENVIRONMENT?: string }).ENVIRONMENT || '') !== 'production',
    };
    const service = new AiJobsService(deps, {
      R2_AI_IMAGES: (rawEnv as { R2_AI_IMAGES?: R2Bucket }).R2_AI_IMAGES,
      KV_AI_ENHANCER: (rawEnv as { KV_AI_ENHANCER?: KVNamespace }).KV_AI_ENHANCER,
      REPLICATE_API_TOKEN: (rawEnv as { REPLICATE_API_TOKEN?: string }).REPLICATE_API_TOKEN,
      ENVIRONMENT: (rawEnv as { ENVIRONMENT?: string }).ENVIRONMENT,
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
        limitOverride: effectiveLimit,
        monthlyLimitOverride: ent.monthlyImages,
      });

      return createApiSuccess(job, 202);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      const e = err as { code?: string; details?: Record<string, unknown> };
      if (typeof e?.code === 'string' && e.code === 'quota_exceeded') {
        return createApiError(
          'forbidden',
          'Kostenloses Nutzungslimit erreicht',
          e.details || undefined
        );
      }
      if (
        message.includes('Unsupported content type') ||
        message.includes('File too large') ||
        message.includes('Unsupported model') ||
        message.includes('Invalid file')
      ) {
        return createApiError('validation_error', message);
      }
      return createApiError('server_error', message);
    }
  },
  { rateLimiter: aiJobsLimiter, enforceCsrfToken: true }
);

// 405s (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
