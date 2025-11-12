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
const d1_1 = require('drizzle-orm/d1');
const backup_service_1 = require('@/lib/services/backup-service');
const auth_helpers_1 = require('@/lib/auth-helpers');
const rate_limiter_1 = require('@/lib/rate-limiter');
const MAINTENANCE_TYPES = ['cleanup', 'optimization', 'migration', 'repair'];
function getAdminEnv(context) {
  const env = context.locals?.runtime?.env ?? {};
  return env ?? {};
}
function isMaintenanceType(value) {
  return typeof value === 'string' && MAINTENANCE_TYPES.includes(value);
}
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const env = getAdminEnv(context);
    const db = env.DB;
    if (!db) {
      return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    try {
      await (0, auth_helpers_1.requireAdmin)({
        req: { header: (n) => context.request.headers.get(n) || undefined },
        request: context.request,
        env: { DB: db },
      });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    let body;
    try {
      body = await context.request.json();
    } catch {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body');
    }
    if (!body || typeof body !== 'object') {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Maintenance type and description are required'
      );
    }
    const { type, description } = body;
    if (
      !isMaintenanceType(type) ||
      typeof description !== 'string' ||
      description.trim().length === 0
    ) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Maintenance type and description are required'
      );
    }
    try {
      const service = new backup_service_1.BackupService((0, d1_1.drizzle)(db));
      const maintenanceId = await service.performMaintenance(type, description.trim());
      return (0, api_middleware_1.createApiSuccess)({
        maintenanceId,
        message: 'Maintenance job started successfully',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start maintenance';
      return (0, api_middleware_1.createApiError)('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_maintenance_perform' },
  }
);
const methodNotAllowed = (allow) => () => (0, api_middleware_1.createMethodNotAllowed)(allow);
exports.GET = methodNotAllowed('POST');
exports.PUT = methodNotAllowed('POST');
exports.PATCH = methodNotAllowed('POST');
exports.DELETE = methodNotAllowed('POST');
exports.OPTIONS = methodNotAllowed('POST');
exports.HEAD = methodNotAllowed('POST');
