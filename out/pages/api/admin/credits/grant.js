"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const usage_1 = require("@/lib/kv/usage");
const auth_helpers_1 = require("@/lib/auth-helpers");
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals } = context;
    const env = (locals.runtime?.env ?? {});
    if (!locals.user?.id) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const enabled = String(env.INTERNAL_CREDIT_GRANT || '').trim() === '1';
    // For safety, only allow in non-production unless explicitly enabled
    const isProd = String(env.ENVIRONMENT || '').toLowerCase() === 'production';
    if (!enabled && isProd) {
        return (0, api_middleware_1.createApiError)('forbidden', 'Credit grant is disabled');
    }
    const db = env.DB;
    const kv = env.KV_AI_ENHANCER;
    if (!db || !kv) {
        return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    // Require admin role for performing grants
    try {
        await (0, auth_helpers_1.requireAdmin)({ request: context.request, env: { DB: env.DB } });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    let body = null;
    try {
        body = (await context.request.json());
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON');
    }
    const targetEmail = (body?.email || '').trim().toLowerCase();
    const amount = Math.max(1, Math.min(100000, Math.floor(Number(body?.amount ?? 1000))));
    // Lookup user id by email
    const row = await db
        .prepare(`SELECT id FROM users WHERE lower(email) = ?1 LIMIT 1`)
        .bind(targetEmail)
        .first();
    if (!row?.id) {
        return (0, api_middleware_1.createApiError)('not_found', 'User not found');
    }
    const userId = row.id;
    const packId = `manual-topup-${Date.now()}`;
    const unitsTenths = Math.round(amount * 10);
    await (0, usage_1.addCreditPackTenths)(kv, userId, packId, unitsTenths);
    const balanceTenths = await (0, usage_1.getCreditsBalanceTenths)(kv, userId);
    const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
    try {
        await db
            .prepare(`INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
            .bind(crypto.randomUUID(), 'ADMIN_ACTION', locals.user?.id || null, ip, 'credits', 'credit_grant', JSON.stringify({ email: targetEmail, userId, amount, packId }), Date.now())
            .run();
    }
    catch { }
    const balance = Math.floor(balanceTenths / 10);
    return (0, api_middleware_1.createApiSuccess)({
        email: targetEmail,
        userId,
        granted: amount,
        balance,
        packId,
    });
}, {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_credit_grant' },
});
// 405 for unsupported methods
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
