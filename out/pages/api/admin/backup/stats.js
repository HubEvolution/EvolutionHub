"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const auth_helpers_1 = require("@/lib/auth-helpers");
const d1_1 = require("drizzle-orm/d1");
const backup_service_1 = require("@/lib/services/backup-service");
function getAdminEnv(context) {
    const env = (context.locals?.runtime?.env ?? {});
    return (env ?? {});
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
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
    try {
        const service = new backup_service_1.BackupService((0, d1_1.drizzle)(db));
        const jobs = await service.getBackupJobs(1000);
        let totalSize = 0;
        let completedWithSize = 0;
        let lastBackup = null;
        const jobsByType = {};
        for (const job of jobs) {
            const type = typeof job.type === 'string' ? job.type : String(job.type);
            jobsByType[type] = (jobsByType[type] || 0) + 1;
            if (job.fileSize) {
                totalSize += job.fileSize;
            }
            if (job.status === 'completed' && job.fileSize) {
                completedWithSize += 1;
            }
            if (job.completedAt) {
                const completedAt = Number(job.completedAt);
                if (Number.isFinite(completedAt)) {
                    lastBackup = lastBackup === null ? completedAt : Math.max(lastBackup, completedAt);
                }
            }
        }
        const stats = {
            totalJobs: jobs.length,
            completedJobs: jobs.filter((j) => j.status === 'completed').length,
            failedJobs: jobs.filter((j) => j.status === 'failed').length,
            runningJobs: jobs.filter((j) => j.status === 'running').length,
            totalSize,
            averageSize: completedWithSize > 0 ? Math.round(totalSize / completedWithSize) : 0,
            lastBackup,
            jobsByType,
        };
        return (0, api_middleware_1.createApiSuccess)({ stats });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch backup stats';
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
}, { logMetadata: { action: 'admin_backup_stats' } });
const methodNotAllowed = (allow) => () => (0, api_middleware_1.createMethodNotAllowed)(allow);
exports.POST = methodNotAllowed('GET');
exports.PUT = methodNotAllowed('GET');
exports.PATCH = methodNotAllowed('GET');
exports.DELETE = methodNotAllowed('GET');
exports.OPTIONS = methodNotAllowed('GET');
exports.HEAD = methodNotAllowed('GET');
