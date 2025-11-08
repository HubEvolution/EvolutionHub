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
    const { locals, params } = context;
    const { id } = params;
    if (typeof id !== 'string' || !id) {
      return createApiError('validation_error', 'Job ID fehlt');
    }

    const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
    const ownerId =
      ownerType === 'user' && locals.user?.id ? locals.user.id : ensureGuestIdCookie(context);

    const env = (locals.runtime?.env ?? {}) as App.Locals['runtime']['env'];
    const deps = { db: env.DB, isDevelopment: env.ENVIRONMENT !== 'production' };
    const service = new AiJobsService(deps, {
      R2_AI_IMAGES: env.R2_AI_IMAGES,
      KV_AI_ENHANCER: env.KV_AI_ENHANCER,
      REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
      ENVIRONMENT: env.ENVIRONMENT,
    });

    try {
      const job = await service.cancelJob({ id, ownerType, ownerId });
      return createApiSuccess(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      if (message.includes('not authorized'))
        return createApiError('forbidden', 'Zugriff verweigert');
      if (message.includes('not found')) return createApiError('not_found', 'Job nicht gefunden');
      return createApiError('server_error', message);
    }
  },
  { rateLimiter: aiJobsLimiter, enforceCsrfToken: true }
);

// 405s for unsupported methods (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
