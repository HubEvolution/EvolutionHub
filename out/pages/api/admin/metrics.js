"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const auth_helpers_1 = require("@/lib/auth-helpers");
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const rawEnv = (context.locals
        ?.runtime?.env || {});
    const dbMaybe = rawEnv.DB;
    if (!dbMaybe)
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    const db = dbMaybe;
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
    // Helpers to run scalar queries safely
    async function scalar(sql, ...binds) {
        try {
            const row = await db
                .prepare(sql)
                .bind(...binds)
                .first();
            return row?.v ?? null;
        }
        catch {
            return null;
        }
    }
    // Active sessions and users (expires_at treated as ISO or epoch seconds)
    const activeSessionsByIso = await scalar(`SELECT COUNT(*) as v FROM sessions WHERE datetime(expires_at) > datetime('now')`);
    const activeSessionsByEpoch = await scalar(`SELECT COUNT(*) as v FROM sessions WHERE CAST(expires_at AS INTEGER) > strftime('%s','now')`);
    const activeSessions = (activeSessionsByIso ?? 0) || (activeSessionsByEpoch ?? 0) || 0;
    const activeUsersByIso = await scalar(`SELECT COUNT(DISTINCT user_id) as v FROM sessions WHERE datetime(expires_at) > datetime('now')`);
    const activeUsersByEpoch = await scalar(`SELECT COUNT(DISTINCT user_id) as v FROM sessions WHERE CAST(expires_at AS INTEGER) > strftime('%s','now')`);
    const activeUsers = (activeUsersByIso ?? 0) || (activeUsersByEpoch ?? 0) || 0;
    const usersTotal = (await scalar(`SELECT COUNT(*) as v FROM users`)) ?? 0;
    const usersNew24hIso = await scalar(`SELECT COUNT(*) as v FROM users WHERE datetime(created_at) >= datetime('now','-1 day')`);
    const usersNew24hEpoch = await scalar(`SELECT COUNT(*) as v FROM users WHERE CAST(created_at AS INTEGER) >= strftime('%s','now','-1 day')`);
    const usersNew24h = (usersNew24hIso ?? 0) || (usersNew24hEpoch ?? 0) || 0;
    return (0, api_middleware_1.createApiSuccess)({
        activeSessions,
        activeUsers,
        usersTotal,
        usersNew24h,
        ts: Date.now(),
    });
});
// 405 for unsupported methods
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
