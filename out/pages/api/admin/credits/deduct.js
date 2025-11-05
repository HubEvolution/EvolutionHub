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
    const isProd = String(env.ENVIRONMENT || '').toLowerCase() === 'production';
    if (!enabled && isProd) {
        return (0, api_middleware_1.createApiError)('forbidden', 'Credit adjust is disabled');
    }
    const db = env.DB;
    const kv = env.KV_AI_ENHANCER;
    if (!db || !kv) {
        return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
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
    const strict = body?.strict !== false;
    const row = await db
        .prepare(`SELECT id FROM users WHERE lower(email) = ?1 LIMIT 1`)
        .bind(targetEmail)
        .first();
    if (!row?.id) {
        return (0, api_middleware_1.createApiError)('not_found', 'User not found');
    }
    const userId = row.id;
    const reqTenths = Math.round(amount * 10);
    if (strict) {
        const balTenths = await (0, usage_1.getCreditsBalanceTenths)(kv, userId);
        if (reqTenths > balTenths) {
            return (0, api_middleware_1.createApiError)('validation_error', 'insufficient_credits');
        }
    }
    const idem = (body?.idempotencyKey || '').trim() ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const jobId = `admin-deduct-${idem}`;
    const result = await (0, usage_1.consumeCreditsTenths)(kv, userId, reqTenths, jobId);
    const balanceTenths = await (0, usage_1.getCreditsBalanceTenths)(kv, userId);
    const balance = Math.floor(balanceTenths / 10);
    // Audit log
    const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
    try {
        await db
            .prepare(`INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
            .bind(crypto.randomUUID(), 'ADMIN_ACTION', locals.user?.id || null, ip, 'credits', 'credit_deduct', JSON.stringify({
            email: targetEmail,
            userId,
            requested: amount,
            deducted: Math.floor(result.totalConsumedTenths / 10),
            strict,
            jobId,
        }), Date.now())
            .run();
    }
    catch { }
    return (0, api_middleware_1.createApiSuccess)({
        email: targetEmail,
        userId,
        requested: amount,
        deducted: Math.floor(result.totalConsumedTenths / 10),
        requestedTenths: reqTenths,
        deductedTenths: result.totalConsumedTenths,
        remainingTenths: result.remainingTenths,
        balance,
        breakdown: result.breakdown,
        idempotent: result.idempotent,
        jobId,
    });
}, {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_credit_deduct' },
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
