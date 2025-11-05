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
    try {
        const service = new backup_service_1.BackupService((0, d1_1.drizzle)(db));
        const jobs = await service.getBackupJobs(1000);
        const stats = {
            totalJobs: jobs.length,
            completedJobs: jobs.filter((j) => j.status === 'completed').length,
            failedJobs: jobs.filter((j) => j.status === 'failed').length,
            runningJobs: jobs.filter((j) => j.status === 'running').length,
            totalSize: jobs.filter((j) => j.fileSize).reduce((s, j) => s + (j.fileSize || 0), 0),
            averageSize: 0,
            lastBackup: jobs
                .filter((j) => j.completedAt)
                .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0]?.completedAt,
            jobsByType: {},
        };
        const completed = jobs.filter((j) => j.status === 'completed' && j.fileSize);
        if (completed.length > 0) {
            stats.averageSize = Math.round(stats.totalSize / completed.length);
        }
        for (const j of jobs) {
            const t = String(j.type);
            stats.jobsByType[t] = (stats.jobsByType[t] || 0) + 1;
        }
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
