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
const audit_log_service_1 = require('@/lib/services/audit-log-service');
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const { locals, request, params } = context;
    const env = locals.runtime?.env ?? {};
    if (!env.DB) {
      return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    try {
      await (0, auth_helpers_1.requireAdmin)({ request, env: { DB: env.DB } });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const id = params?.id || '';
    if (!id) return (0, api_middleware_1.createApiError)('validation_error', 'Missing id');
    const svc = new audit_log_service_1.AuditLogService(env.DB);
    const row = await svc.getById(id);
    if (!row) return (0, api_middleware_1.createApiError)('not_found', 'Not found');
    return (0, api_middleware_1.createApiSuccess)(row);
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
