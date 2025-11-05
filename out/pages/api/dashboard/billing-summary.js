"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
const usage_1 = require("@/lib/kv/usage");
const entitlements_1 = require("@/config/ai-image/entitlements");
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const opStart = Date.now();
    const { locals, clientAddress } = context;
    const user = locals.user;
    const env = (locals.runtime?.env ?? {});
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const db = env.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const dbStart = Date.now();
    const d1 = db;
    const subRow = (await d1
        .prepare(`SELECT id, plan, status, current_period_end, cancel_at_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`)
        .bind(user.id)
        .first());
    const subscription = subRow;
    const dbDur = Date.now() - dbStart;
    const creditsKv = env.KV_AI_ENHANCER;
    let creditsRemaining = null;
    let kvDur = 0;
    if (creditsKv) {
        try {
            const kvStart = Date.now();
            const useV2 = String(env.USAGE_KV_V2 || '').trim() === '1';
            if (useV2) {
                const tenths = await (0, usage_1.getCreditsBalanceTenths)(creditsKv, user.id);
                creditsRemaining = Math.floor((typeof tenths === 'number' ? tenths : 0) / 10);
                kvDur = Date.now() - kvStart;
            }
            else {
                const timeoutMs = 250;
                const key = `ai:credits:user:${user.id}`;
                const result = await Promise.race([
                    creditsKv.get(key),
                    new Promise((resolve) => setTimeout(() => resolve('__timeout__'), timeoutMs)),
                ]);
                kvDur = Date.now() - kvStart;
                const rawCredits = result === '__timeout__' ? null : result;
                if (rawCredits !== null) {
                    const parsed = parseInt(rawCredits, 10);
                    creditsRemaining = Number.isFinite(parsed) ? parsed : null;
                }
            }
        }
        catch (error) {
            (0, security_logger_1.logUserEvent)(user.id, 'billing_summary_kv_error', {
                error: error instanceof Error ? error.message : String(error),
                ipAddress: clientAddress,
            });
        }
    }
    // Plan fallback: if no subscription and user.plan missing, read from users table
    let planFallback = user?.plan;
    if (!subscription && !planFallback) {
        try {
            const row = (await d1
                .prepare(`SELECT plan FROM users WHERE id = ?1 LIMIT 1`)
                .bind(user.id)
                .first());
            const p = row?.plan ?? undefined;
            planFallback = p;
        }
        catch { }
    }
    // Determine whether a subscription should be considered active for plan purposes
    const activeStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);
    const isActiveSub = Boolean(subscription && activeStatuses.has(subscription.status));
    // Resolve plan and base fields
    const result = {
        // Prefer user's entitled plan unless there is an active subscription overriding it
        plan: (isActiveSub ? subscription.plan : planFallback) ?? 'free',
        status: isActiveSub ? subscription.status : 'inactive',
        subscriptionId: isActiveSub ? subscription.id : null,
        currentPeriodEnd: isActiveSub ? subscription.current_period_end : null,
        cancelAtPeriodEnd: isActiveSub ? Boolean(subscription.cancel_at_period_end) : false,
        lastSyncedAt: subscription?.updated_at ?? null,
        creditsRemaining,
    };
    // Compute monthly usage/limit and period end for progress UI
    let monthlyLimit = 0;
    try {
        const plan = result.plan;
        monthlyLimit = (0, entitlements_1.getEntitlementsFor)('user', plan).monthlyImages;
    }
    catch { }
    const creditsKv2 = env.KV_AI_ENHANCER;
    let monthlyUsed = 0;
    if (creditsKv2) {
        try {
            const useV2 = String(env.USAGE_KV_V2 || '').trim() === '1';
            if (useV2) {
                const key = (0, usage_1.legacyMonthlyKey)('ai', 'user', user.id);
                const raw = await creditsKv2.get(key);
                if (raw) {
                    try {
                        const obj = JSON.parse(raw);
                        monthlyUsed =
                            typeof obj.countTenths === 'number' ? obj.countTenths / 10 : obj.count || 0;
                    }
                    catch { }
                }
            }
            else {
                const key = (0, usage_1.monthlyKey)('ai', 'user', user.id);
                const raw = await creditsKv2.get(key);
                if (raw) {
                    try {
                        const obj = JSON.parse(raw);
                        monthlyUsed = obj.count || 0;
                    }
                    catch { }
                }
            }
        }
        catch { }
    }
    function endOfMonthUtcMs() {
        const d = new Date();
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth();
        const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        return end.getTime();
    }
    const periodEndsAt = result.currentPeriodEnd
        ? result.currentPeriodEnd * 1000
        : endOfMonthUtcMs();
    (0, security_logger_1.logUserEvent)(user.id, 'billing_summary_requested', {
        ipAddress: clientAddress,
        plan: result.plan,
        status: result.status,
    });
    const resp = (0, api_middleware_1.createApiSuccess)({
        ...result,
        monthlyLimit,
        monthlyUsed,
        periodEndsAt,
    });
    try {
        const total = Date.now() - opStart;
        const timing = `db;dur=${dbDur}, kv;dur=${kvDur}, total;dur=${total}`;
        resp.headers.set('Server-Timing', timing);
    }
    catch { }
    return resp;
}, {
    logMetadata: { action: 'billing_summary_accessed' },
});
