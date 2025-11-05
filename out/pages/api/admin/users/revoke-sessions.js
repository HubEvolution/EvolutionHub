"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const auth_helpers_1 = require("@/lib/auth-helpers");
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, request } = context;
    const env = (locals.runtime?.env ?? {});
    if (!env.DB) {
        return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    try {
        await (0, auth_helpers_1.requireAdmin)({ request, env: { DB: env.DB } });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    let body = null;
    try {
        body = (await request.json());
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON');
    }
    const userId = (body?.userId || '').trim();
    const sessionId = (body?.sessionId || '').trim();
    if (!userId && !sessionId) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Provide userId or sessionId');
    }
    let deleted = 0;
    if (sessionId) {
        const res = await env.DB.prepare(`DELETE FROM sessions WHERE id = ?1`).bind(sessionId).run();
        deleted += Number(res.meta.changes || 0);
    }
    if (userId) {
        const res = await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`)
            .bind(userId)
            .run();
        deleted += Number(res.meta.changes || 0);
    }
    return (0, api_middleware_1.createApiSuccess)({ deleted });
}, {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_sessions_revoke' },
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
