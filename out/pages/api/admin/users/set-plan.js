"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const auth_helpers_1 = require("@/lib/auth-helpers");
const validation_1 = require("@/lib/validation");
const admin_1 = require("@/lib/validation/schemas/admin");
const stripe_1 = require("stripe");
function getAdminEnv(context) {
    const env = (context.locals?.runtime?.env ?? {});
    return (env ?? {});
}
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { request } = context;
    const env = getAdminEnv(context);
    const db = env.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    try {
        await (0, auth_helpers_1.requireAdmin)({ request, env: { DB: db } });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    let json;
    try {
        json = await request.json();
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON');
    }
    const parsed = admin_1.adminSetPlanRequestSchema.safeParse(json);
    if (!parsed.success) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid request', {
            details: (0, validation_1.formatZodError)(parsed.error),
        });
    }
    const body = parsed.data;
    let userId = body.userId?.trim() || '';
    const targetEmail = body.email?.trim().toLowerCase() || '';
    if (!userId && targetEmail) {
        try {
            const row = await db
                .prepare('SELECT id, plan FROM users WHERE lower(email) = ?1 LIMIT 1')
                .bind(targetEmail)
                .first();
            if (!row?.id)
                return (0, api_middleware_1.createApiError)('not_found', 'User not found');
            userId = row.id;
        }
        catch {
            return (0, api_middleware_1.createApiError)('server_error', 'Lookup failed');
        }
    }
    if (!userId)
        return (0, api_middleware_1.createApiError)('validation_error', 'email or userId required');
    let prevPlan = null;
    try {
        const row = await db
            .prepare('SELECT plan FROM users WHERE id = ?1 LIMIT 1')
            .bind(userId)
            .first();
        prevPlan = row?.plan ?? null;
    }
    catch { }
    // Orchestrate Stripe subscription changes; webhook will sync users.plan
    const envRaw = (context.locals.runtime?.env ?? {});
    const stripeSecret = typeof envRaw.STRIPE_SECRET === 'string' ? envRaw.STRIPE_SECRET : '';
    const targetPlan = body.plan;
    const interval = body.interval === 'annual' ? 'annual' : 'monthly';
    const prorationBehavior = body.prorationBehavior === 'none' ? 'none' : 'create_prorations';
    const parsePricingTable = (raw) => {
        try {
            if (!raw)
                return {};
            if (typeof raw === 'string')
                return JSON.parse(raw);
            if (typeof raw === 'object')
                return raw;
        }
        catch { }
        return {};
    };
    const priceTables = {
        monthly: parsePricingTable(envRaw.PRICING_TABLE),
        annual: parsePricingTable(envRaw.PRICING_TABLE_ANNUAL),
    };
    const planToPrice = priceTables[interval];
    if (targetPlan === 'free') {
        // cancel existing subscription (immediately or at period end)
        const subRow = await db
            .prepare('SELECT id, status, cancel_at_period_end FROM subscriptions WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 1')
            .bind(userId)
            .first();
        if (subRow &&
            (subRow.status === 'active' || subRow.status === 'trialing' || subRow.status === 'past_due')) {
            if (!stripeSecret) {
                return (0, api_middleware_1.createApiError)('server_error', 'Stripe not configured');
            }
            const stripe = new stripe_1.default(stripeSecret);
            try {
                if (body.cancelImmediately) {
                    await stripe.subscriptions.cancel(subRow.id);
                    await db
                        .prepare('UPDATE subscriptions SET status = ?1, cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?2')
                        .bind('canceled', subRow.id)
                        .run();
                }
                else {
                    await stripe.subscriptions.update(subRow.id, { cancel_at_period_end: true });
                    await db
                        .prepare('UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1')
                        .bind(subRow.id)
                        .run();
                }
            }
            catch {
                return (0, api_middleware_1.createApiError)('server_error', 'Failed to update subscription in Stripe');
            }
        }
        // do not update users.plan directly; webhook will set to 'free'
    }
    else {
        // upgrade/downgrade to paid plan
        const priceId = planToPrice?.[targetPlan];
        if (!priceId || !stripeSecret) {
            return (0, api_middleware_1.createApiError)('server_error', 'Stripe not configured or price mapping missing');
        }
        const stripe = new stripe_1.default(stripeSecret);
        // ensure customer exists
        let customerId = await db
            .prepare('SELECT customer_id FROM stripe_customers WHERE user_id = ?1 LIMIT 1')
            .bind(userId)
            .first()
            .then((r) => r?.customer_id || '');
        if (!customerId) {
            // resolve email
            let email = targetEmail;
            if (!email) {
                const row = await db
                    .prepare('SELECT email FROM users WHERE id = ?1 LIMIT 1')
                    .bind(userId)
                    .first();
                email = row?.email || '';
            }
            try {
                const cust = await stripe.customers.create(email ? { email } : {});
                customerId = cust.id;
                await db
                    .prepare('INSERT INTO stripe_customers (user_id, customer_id) VALUES (?1, ?2) ON CONFLICT(user_id) DO UPDATE SET customer_id = excluded.customer_id')
                    .bind(userId, customerId)
                    .run();
            }
            catch {
                return (0, api_middleware_1.createApiError)('server_error', 'Failed to create Stripe customer');
            }
        }
        const subRow = await db
            .prepare('SELECT id, status FROM subscriptions WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 1')
            .bind(userId)
            .first();
        try {
            if (subRow &&
                (subRow.status === 'active' ||
                    subRow.status === 'trialing' ||
                    subRow.status === 'past_due')) {
                const current = await stripe.subscriptions.retrieve(subRow.id, {
                    expand: ['items.data'],
                });
                const itemId = current.items.data?.[0]?.id;
                if (!itemId) {
                    return (0, api_middleware_1.createApiError)('server_error', 'Subscription item not found');
                }
                await stripe.subscriptions.update(subRow.id, {
                    cancel_at_period_end: false,
                    proration_behavior: prorationBehavior,
                    items: [{ id: itemId, price: priceId }],
                });
            }
            else {
                const created = await stripe.subscriptions.create({
                    customer: customerId,
                    items: [{ price: priceId }],
                    proration_behavior: prorationBehavior,
                });
                await db
                    .prepare(`INSERT INTO subscriptions (id, user_id, customer_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, customer_id = excluded.customer_id, plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end, updated_at = CURRENT_TIMESTAMP`)
                    .bind(created.id, userId, customerId, targetPlan, created.status || 'active', typeof created.current_period_end ===
                    'number'
                    ? created.current_period_end
                    : null)
                    .run();
            }
        }
        catch {
            return (0, api_middleware_1.createApiError)('server_error', 'Failed to apply plan in Stripe');
        }
    }
    try {
        const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
        await db
            .prepare(`INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
            .bind(crypto.randomUUID(), 'ADMIN_ACTION', context.locals.user?.id || null, ip, 'user', 'set_plan', JSON.stringify({
            userId,
            email: targetEmail || undefined,
            from: prevPlan,
            to: body.plan,
            reason: body.reason || undefined,
        }), Date.now())
            .run();
    }
    catch { }
    return (0, api_middleware_1.createApiSuccess)({ userId, plan: body.plan });
}, {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_set_plan' },
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
