"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const d1_1 = require("drizzle-orm/d1");
const backup_service_1 = require("@/lib/services/backup-service");
const auth_helpers_1 = require("@/lib/auth-helpers");
const rate_limiter_1 = require("@/lib/rate-limiter");
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const env = (context.locals?.runtime?.env || {});
    const db = env.DB;
    if (!db)
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    try {
        await (0, auth_helpers_1.requireAdmin)({
            req: { header: (n) => context.request.headers.get(n) || undefined },
            request: context.request,
            env: { DB: db },
        });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    let retentionDays = 30;
    try {
        const body = (await context.request.json());
        if (body && typeof body.retentionDays === 'number' && body.retentionDays > 0) {
            retentionDays = Math.min(365, Math.floor(body.retentionDays));
        }
    }
    catch { }
    try {
        const service = new backup_service_1.BackupService((0, d1_1.drizzle)(db));
        const deletedCount = await service.cleanupOldBackups(retentionDays);
        return (0, api_middleware_1.createApiSuccess)({ deletedCount, message: `${deletedCount} old backups cleaned up` });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to cleanup old backups';
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
}, {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_backup_cleanup' },
});
const methodNotAllowed = (allow) => () => (0, api_middleware_1.createMethodNotAllowed)(allow);
exports.GET = methodNotAllowed('POST');
exports.PUT = methodNotAllowed('POST');
exports.PATCH = methodNotAllowed('POST');
exports.DELETE = methodNotAllowed('POST');
exports.OPTIONS = methodNotAllowed('POST');
exports.HEAD = methodNotAllowed('POST');
