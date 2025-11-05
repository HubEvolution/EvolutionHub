"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const response_helpers_1 = require("@/lib/response-helpers");
const stripe_1 = require("stripe");
const sanitizeReturnTo_1 = require("@/utils/sanitizeReturnTo");
function parsePricingTable(raw) {
    try {
        if (!raw)
            return {};
        if (typeof raw === 'string')
            return JSON.parse(raw);
        if (typeof raw === 'object')
            return raw;
    }
    catch (_err) {
        // Intentionally ignore parsing errors; return empty object
    }
    return {};
}
function invert(obj) {
    const out = {};
    for (const k of Object.keys(obj)) {
        out[obj[k]] = k;
    }
    return out;
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, request } = context;
    const user = locals.user;
    const rawEnv = (locals?.runtime?.env ?? {});
    if (!user) {
        return (0, response_helpers_1.createSecureErrorResponse)('Unauthorized', 401);
    }
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id') || '';
    const ws = url.searchParams.get('ws') || 'default';
    const returnToRaw = url.searchParams.get('return_to') || '';
    const requestUrl = new URL(context.request.url);
    const baseUrl = (typeof rawEnv.BASE_URL === 'string' ? rawEnv.BASE_URL : '') ||
        `${requestUrl.protocol}//${requestUrl.host}`;
    const stripeSecret = typeof rawEnv.STRIPE_SECRET === 'string' ? rawEnv.STRIPE_SECRET : '';
    if (!stripeSecret) {
        return (0, response_helpers_1.createSecureRedirect)(`${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=stripe_not_configured`);
    }
    if (!sessionId) {
        return (0, response_helpers_1.createSecureRedirect)(`${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=missing_session`);
    }
    // Build priceId -> plan mapping (monthly + annual)
    const monthlyMap = invert(parsePricingTable(rawEnv.PRICING_TABLE));
    const annualMap = invert(parsePricingTable(rawEnv.PRICING_TABLE_ANNUAL));
    const priceMap = { ...monthlyMap, ...annualMap };
    let session;
    try {
        const stripe = new stripe_1.default(stripeSecret);
        session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    }
    catch (_err) {
        return (0, response_helpers_1.createSecureRedirect)(`${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=sync_error`);
    }
    // Basic safety: enforce user matches the session's reference
    const refUserId = session.client_reference_id || session.metadata?.userId || '';
    if (refUserId && refUserId !== user.id) {
        return (0, response_helpers_1.createSecureRedirect)(`${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=forbidden`);
    }
    const customerId = session.customer || '';
    const sub = session.subscription;
    let plan = (session.metadata?.plan || 'pro');
    if (sub && sub.items?.data && sub.items.data[0]?.price?.id) {
        const priceId = String(sub.items.data[0].price?.id || '');
        const mapped = priceMap[priceId];
        if (mapped)
            plan = mapped;
    }
    // DB handles
    const db = rawEnv.DB;
    // Upsert stripe_customers
    if (customerId) {
        await db
            .prepare('INSERT INTO stripe_customers (user_id, customer_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET customer_id = excluded.customer_id')
            .bind(user.id, customerId)
            .run();
    }
    // Upsert subscription row if available
    if (sub) {
        const status = sub.status;
        const currentPeriodEnd = typeof sub.current_period_end === 'number' ? sub.current_period_end : null;
        const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
        const cape = cancelAtPeriodEnd ? 1 : 0;
        await db
            .prepare(`INSERT INTO subscriptions (id, user_id, customer_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           user_id = excluded.user_id,
           customer_id = excluded.customer_id,
           plan = excluded.plan,
           status = excluded.status,
           current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end,
           updated_at = CURRENT_TIMESTAMP`)
            .bind(sub.id, user.id, customerId, plan, status, currentPeriodEnd, cape)
            .run();
        // Apply policy similar to webhook
        if (status === 'active' || status === 'trialing' || status === 'past_due') {
            await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, user.id).run();
        }
        else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
            await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind('free', user.id).run();
        }
    }
    else {
        // No subscription object (rare) — still set plan from metadata for UX
        try {
            await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, user.id).run();
        }
        catch (_err) {
            // Ignore plan update failures; webhook will eventually sync
        }
    }
    // Redirect to original page if provided and valid; otherwise to dashboard
    const safeReturnTo = (0, sanitizeReturnTo_1.sanitizeReturnTo)(returnToRaw);
    if (safeReturnTo) {
        return (0, response_helpers_1.createSecureRedirect)(`${baseUrl}${safeReturnTo}`);
    }
    return (0, response_helpers_1.createSecureRedirect)(`${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}`);
}, {
    onError: (_ctx, _err) => (0, response_helpers_1.createSecureErrorResponse)('sync_error', 500),
});
