'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.POST =
  exports.GET =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const rate_limiter_1 = require('@/lib/rate-limiter');
const ai_jobs_service_1 = require('@/lib/services/ai-jobs-service');
const entitlements_1 = require('@/config/ai-image/entitlements');
function ensureGuestIdCookie(context) {
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
exports.GET = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { locals, request, params } = context;
    const { id } = params;
    if (typeof id !== 'string' || !id) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Job ID fehlt');
    }
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId =
      ownerType === 'user' && locals.user?.id ? locals.user.id : ensureGuestIdCookie(context);
    const plan = ownerType === 'user' ? (locals.user?.plan ?? 'free') : undefined;
    const ent = (0, entitlements_1.getEntitlementsFor)(ownerType, plan);
    const effectiveLimit = ent.dailyBurstCap;
    const env = locals.runtime?.env ?? {};
    const deps = { db: env.DB, isDevelopment: env.ENVIRONMENT !== 'production' };
    const service = new ai_jobs_service_1.AiJobsService(deps, {
      R2_AI_IMAGES: env.R2_AI_IMAGES,
      KV_AI_ENHANCER: env.KV_AI_ENHANCER,
      REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
      ENVIRONMENT: env.ENVIRONMENT,
    });
    const origin = new URL(request.url).origin;
    try {
      const job = await service.getAndProcessIfNeeded({
        id,
        ownerType,
        ownerId,
        requestOrigin: origin,
        limitOverride: effectiveLimit,
        monthlyLimitOverride: ent.monthlyImages,
      });
      return (0, api_middleware_1.createApiSuccess)(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      if (message.includes('not authorized'))
        return (0, api_middleware_1.createApiError)('forbidden', 'Zugriff verweigert');
      if (message.includes('not found'))
        return (0, api_middleware_1.createApiError)('not_found', 'Job nicht gefunden');
      return (0, api_middleware_1.createApiError)('server_error', message);
    }
  },
  { rateLimiter: rate_limiter_1.aiJobsLimiter }
);
// 405s for unsupported methods on this route (standardized error shape)
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
