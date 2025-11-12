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
const usage_1 = require('@/lib/kv/usage');
const validation_1 = require('@/lib/validation');
function getAdminEnv(context) {
  const env = context.locals?.runtime?.env ?? {};
  return env ?? {};
}
const querySchema = validation_1.z
  .object({
    userId: validation_1.z.string().min(1),
    limit: validation_1.z.coerce.number().int().min(1).max(100).optional(),
    cursor: validation_1.z.string().optional(),
  })
  .strict();
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const { url } = context;
    const env = getAdminEnv(context);
    if (!env.DB || !env.KV_AI_ENHANCER) {
      return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    try {
      await (0, auth_helpers_1.requireAdmin)({ request: context.request, env: { DB: env.DB } });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const q = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!q.success) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid query', {
        details: (0, validation_1.formatZodError)(q.error),
      });
    }
    const { userId } = q.data;
    const packs = await (0, usage_1.listActiveCreditPacksTenths)(env.KV_AI_ENHANCER, userId);
    const items = packs.map((p) => ({
      id: p.id,
      unitsTenths: p.unitsTenths,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    }));
    return (0, api_middleware_1.createApiSuccess)({ items });
  },
  { rateLimiter: rate_limiter_1.apiRateLimiter }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
