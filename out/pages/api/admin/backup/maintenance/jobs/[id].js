"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const auth_helpers_1 = require("@/lib/auth-helpers");
const d1_1 = require("drizzle-orm/d1");
const backup_service_1 = require("@/lib/services/backup-service");
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
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
    const jobId = context.params?.id?.toString().trim();
    if (!jobId)
        return (0, api_middleware_1.createApiError)('validation_error', 'Maintenance ID required');
    try {
        const service = new backup_service_1.BackupService((0, d1_1.drizzle)(db));
        const job = await service.getMaintenanceJob(jobId);
        if (!job)
            return (0, api_middleware_1.createApiError)('not_found', 'Maintenance job not found');
        return (0, api_middleware_1.createApiSuccess)({ job });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch maintenance job';
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
}, { logMetadata: { action: 'admin_maintenance_job_details' } });
const methodNotAllowed = (allow) => () => (0, api_middleware_1.createMethodNotAllowed)(allow);
exports.POST = methodNotAllowed('GET');
exports.PUT = methodNotAllowed('GET');
exports.PATCH = methodNotAllowed('GET');
exports.DELETE = methodNotAllowed('GET');
exports.OPTIONS = methodNotAllowed('GET');
exports.HEAD = methodNotAllowed('GET');
