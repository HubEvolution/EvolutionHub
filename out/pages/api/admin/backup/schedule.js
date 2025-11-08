"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const d1_1 = require("drizzle-orm/d1");
const backup_service_1 = require("@/lib/services/backup-service");
const auth_helpers_1 = require("@/lib/auth-helpers");
const rate_limiter_1 = require("@/lib/rate-limiter");
function getAdminEnv(context) {
    const env = (context.locals?.runtime?.env ?? {});
    return (env ?? {});
}
function isBackupJobType(value) {
    return ['full', 'comments', 'users', 'incremental'].includes(value);
}
function isCronExpression(value) {
    if (typeof value !== 'string')
        return false;
    const trimmed = value.trim();
    return trimmed.length > 0;
}
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
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
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    let body;
    try {
        body = await context.request.json();
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body');
    }
    if (!body || typeof body !== 'object') {
        return (0, api_middleware_1.createApiError)('validation_error', 'Backup type and cron expression are required');
    }
    const { type, cronExpression } = body;
    if (typeof type !== 'string' || !isBackupJobType(type) || !isCronExpression(cronExpression)) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid backup type or cron expression');
    }
    const jobType = type;
    const cron = cronExpression.trim();
    try {
        const service = new backup_service_1.BackupService((0, d1_1.drizzle)(db));
        await service.scheduleAutomatedBackup(jobType, cron);
        return (0, api_middleware_1.createApiSuccess)({ message: 'Automated backup scheduled successfully' });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to schedule backup';
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
}, {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_backup_schedule' },
});
const methodNotAllowed = (allow) => () => (0, api_middleware_1.createMethodNotAllowed)(allow);
exports.GET = methodNotAllowed('POST');
exports.PUT = methodNotAllowed('POST');
exports.PATCH = methodNotAllowed('POST');
exports.DELETE = methodNotAllowed('POST');
exports.OPTIONS = methodNotAllowed('POST');
exports.HEAD = methodNotAllowed('POST');
