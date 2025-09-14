import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess, createMethodNotAllowed } from '@/lib/api-middleware';
import { aiJobsLimiter } from '@/lib/rate-limiter';
import { AiJobsService } from '@/lib/services/ai-jobs-service';
import { type OwnerType, type Plan } from '@/config/ai-image';
import { getEntitlementsFor } from '@/config/ai-image/entitlements';

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

export const GET = withApiMiddleware(async (context) => {
  const { locals, request, params } = context;
  const id = params.id as string | undefined;
  if (!id) return createApiError('validation_error', 'Job ID fehlt');

  const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);
  const plan = ownerType === 'user' ? ((locals.user as { plan?: Plan } | null)?.plan ?? 'free') as Plan : undefined;
  const ent = getEntitlementsFor(ownerType, plan);
  const effectiveLimit = ent.dailyBurstCap;
  
  const env = (locals.runtime?.env || {}) as App.Locals['runtime']['env'];
  const deps = { db: env.DB, isDevelopment: env.ENVIRONMENT !== 'production' };
  const service = new AiJobsService(deps, {
    R2_AI_IMAGES: env.R2_AI_IMAGES,
    KV_AI_ENHANCER: env.KV_AI_ENHANCER,
    REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
    ENVIRONMENT: env.ENVIRONMENT
  });

  const origin = new URL(request.url).origin;

  try {
    const job = await service.getAndProcessIfNeeded({ id, ownerType, ownerId, requestOrigin: origin, limitOverride: effectiveLimit, monthlyLimitOverride: ent.monthlyImages });
    return createApiSuccess(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    if (message.includes('not authorized')) return createApiError('forbidden', 'Zugriff verweigert');
    if (message.includes('not found')) return createApiError('not_found', 'Job nicht gefunden');
    return createApiError('server_error', message);
  }
}, { rateLimiter: aiJobsLimiter });

// 405s for unsupported methods on this route (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
