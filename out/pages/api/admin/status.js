"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const usage_1 = require("@/lib/kv/usage");
const auth_helpers_1 = require("@/lib/auth-helpers");
function getAdminEnv(context) {
    const env = (context.locals?.runtime?.env ?? {});
    return (env ?? {});
}
// Read-only admin status for the logged-in user
// Response shape (consistent): { success: boolean, data?: T, error?: string }
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals } = context;
    const user = locals.user;
    const env = getAdminEnv(context);
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const db = env.DB;
    const kv = env.KV_AI_ENHANCER;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    // Enforce admin-only access
    try {
        await (0, auth_helpers_1.requireAdmin)({ request: context.request, env: { DB: db } });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    // Fetch plan from users (source of truth)
    const row = await db
        .prepare('SELECT plan FROM users WHERE id = ?')
        .bind(user.id)
        .first();
    const plan = row?.plan ?? 'free';
    // Fetch credits using credit packs (tenths -> integer credits)
    let credits = 0;
    if (kv) {
        try {
            const tenths = await (0, usage_1.getCreditsBalanceTenths)(kv, user.id);
            credits = Math.floor((typeof tenths === 'number' ? tenths : 0) / 10);
        }
        catch { }
    }
    // Last subscription events (DB snapshot)
    const subsRes = await db
        .prepare(`SELECT id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at
       FROM subscriptions
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 5`)
        .bind(user.id)
        .all();
    return (0, api_middleware_1.createApiSuccess)({
        user: { id: user.id, email: user.email },
        plan,
        credits,
        subscriptions: subsRes?.results ?? [],
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
