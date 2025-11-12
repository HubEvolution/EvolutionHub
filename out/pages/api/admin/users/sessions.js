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
const auth_helpers_1 = require('@/lib/auth-helpers');
function parseExpiresMs(expires) {
  // Accept ISO or numeric string
  const n = Number(expires);
  if (Number.isFinite(n)) return Math.floor(n);
  const t = Date.parse(expires);
  return Number.isFinite(t) ? t : 0;
}
function getAdminEnv(context) {
  const env = context.locals?.runtime?.env ?? {};
  return env ?? {};
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const { request, url } = context;
    const env = getAdminEnv(context);
    if (!env.DB) {
      return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    try {
      await (0, auth_helpers_1.requireAdmin)({ request, env: { DB: env.DB } });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const userIdParam = url.searchParams.get('userId');
    const userId = userIdParam ? userIdParam.trim() : '';
    if (!userId) {
      return (0, api_middleware_1.createApiError)('validation_error', 'userId is required');
    }
    const res = await env.DB.prepare(
      `SELECT id, user_id, expires_at FROM sessions WHERE user_id = ?1 ORDER BY expires_at DESC LIMIT 200`
    )
      .bind(userId)
      .all();
    const items =
      (res.results || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        expiresAt: parseExpiresMs(r.expires_at),
      })) || [];
    return (0, api_middleware_1.createApiSuccess)({ items });
  },
  {
    rateLimiter: rate_limiter_1.apiRateLimiter,
  }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
