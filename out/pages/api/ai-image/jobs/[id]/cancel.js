'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.GET =
  exports.POST =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const rate_limiter_1 = require('@/lib/rate-limiter');
const ai_jobs_service_1 = require('@/lib/services/ai-jobs-service');
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
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { locals, params } = context;
    const { id } = params;
    if (typeof id !== 'string' || !id) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Job ID fehlt');
    }
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId =
      ownerType === 'user' && locals.user?.id ? locals.user.id : ensureGuestIdCookie(context);
    const env = locals.runtime?.env ?? {};
    const deps = { db: env.DB, isDevelopment: env.ENVIRONMENT !== 'production' };
    const service = new ai_jobs_service_1.AiJobsService(deps, {
      R2_AI_IMAGES: env.R2_AI_IMAGES,
      KV_AI_ENHANCER: env.KV_AI_ENHANCER,
      REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
      ENVIRONMENT: env.ENVIRONMENT,
    });
    try {
      const job = await service.cancelJob({ id, ownerType, ownerId });
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
  { rateLimiter: rate_limiter_1.aiJobsLimiter, enforceCsrfToken: true }
);
// 405s for unsupported methods (standardized error shape)
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
