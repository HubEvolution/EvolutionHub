"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const validation_1 = require("@/lib/validation");
const billing_1 = require("@/lib/validation/schemas/billing");
const stripe_1 = require("stripe");
const security_logger_1 = require("@/lib/security-logger");
const sanitizeReturnTo_1 = require("@/utils/sanitizeReturnTo");
/**
 * POST /api/billing/credits
 * Creates a Stripe Checkout Session for one-time credit packs (200 / 1000 images)
 * Body: { pack: 200 | 1000, workspaceId?: string }
 */
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, clientAddress } = context;
    const user = locals.user;
    // Parse body
    const unknownBody = await context.request.json().catch(() => null);
    const parsed = billing_1.billingCreditsRequestSchema.safeParse(unknownBody);
    if (!parsed.success) {
        return new Response(JSON.stringify({
            success: false,
            error: {
                type: 'validation_error',
                message: 'Invalid JSON body',
                details: (0, validation_1.formatZodError)(parsed.error),
            },
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const body = parsed.data;
    const rawEnv = (locals?.runtime?.env ?? {});
    const stripeSecret = typeof rawEnv.STRIPE_SECRET === 'string' ? rawEnv.STRIPE_SECRET : '';
    if (!stripeSecret) {
        return new Response(JSON.stringify({ error: 'stripe_not_configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    // Map pack -> price id via env
    let table = {};
    try {
        const raw = rawEnv.CREDITS_PRICING_TABLE;
        table =
            typeof raw === 'string'
                ? JSON.parse(raw)
                : raw || {};
    }
    catch {
        table = {};
    }
    const priceId = table[String(body.pack)];
    if (!priceId) {
        return new Response(JSON.stringify({ error: 'pack_not_configured' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    const requestUrl = new URL(context.request.url);
    const baseUrl = (typeof rawEnv.BASE_URL === 'string' ? rawEnv.BASE_URL : '') ||
        `${requestUrl.protocol}//${requestUrl.host}`;
    const safeReturnTo = (0, sanitizeReturnTo_1.sanitizeReturnTo)(body.returnTo);
    // Audit log
    (0, security_logger_1.logUserEvent)(user?.id ?? 'anonymous', 'credits_checkout_session_created', {
        ipAddress: clientAddress,
        pack: String(body.pack),
    });
    const stripe = new stripe_1.default(stripeSecret);
    let successUrl = `${baseUrl}/dashboard?ws=${body.workspaceId || 'default'}&credits=1`;
    try {
        if (safeReturnTo) {
            const u = new URL(`${baseUrl}${safeReturnTo}`);
            u.searchParams.set('credits', '1');
            successUrl = u.toString();
        }
    }
    catch {
        // ignore malformed returnTo; fallback to dashboard successUrl
    }
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl,
        cancel_url: `${baseUrl}/pricing`,
        allow_promotion_codes: false,
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: { purpose: 'credits', userId: user.id, pack: String(body.pack) },
    });
    return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
});
