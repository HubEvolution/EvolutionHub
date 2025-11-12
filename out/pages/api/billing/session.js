'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const stripe_1 = require('stripe');
const security_logger_1 = require('@/lib/security-logger');
const sanitizeReturnTo_1 = require('@/utils/sanitizeReturnTo');
/**
 * POST /api/billing/session
 * Erstellt eine neue Stripe Checkout Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    // Benutzeraktion protokollieren (user kann null sein → anonym loggen)
    const uid = user?.id ?? 'anonymous';
    (0, security_logger_1.logUserEvent)(uid, 'checkout_session_created', {
      ipAddress: clientAddress,
    });
    // Stripe-Checkout mit Astro APIContext
    const rawEnv = locals?.runtime?.env ?? {};
    // BASE_URL aus Env oder aus Request ableiten (Fallback)
    const requestUrl = new URL(context.request.url);
    const baseUrl =
      (typeof rawEnv.BASE_URL === 'string' ? rawEnv.BASE_URL : '') ||
      `${requestUrl.protocol}//${requestUrl.host}`;
    // PRICING_TABLE kann als JSON-String oder Objekt hinterlegt sein
    let pricingTable = {};
    try {
      const pt = rawEnv.PRICING_TABLE;
      pricingTable = typeof pt === 'string' ? JSON.parse(pt) : pt || {};
    } catch {
      pricingTable = {};
    }
    // PRICING_TABLE_ANNUAL kann als JSON-String oder Objekt hinterlegt sein
    let pricingTableAnnual = {};
    try {
      const pt = rawEnv.PRICING_TABLE_ANNUAL;
      pricingTableAnnual = typeof pt === 'string' ? JSON.parse(pt) : pt || {};
    } catch {
      pricingTableAnnual = {};
    }
    const body = await context.request.json().catch(() => null);
    if (!body || !body.plan || !body.workspaceId) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'plan and workspaceId are required'
      );
    }
    let refererPath = '';
    try {
      const ref = context.request.headers.get('referer') || '';
      if (ref) {
        const ru = new URL(ref);
        const origin = `${requestUrl.protocol}//${requestUrl.host}`;
        if (ru.origin === origin) {
          refererPath = `${ru.pathname}${ru.search}`;
        }
      }
    } catch {}
    const safeReturnTo =
      (0, sanitizeReturnTo_1.sanitizeReturnTo)(body.returnTo) ||
      (0, sanitizeReturnTo_1.sanitizeReturnTo)(refererPath);
    const interval = body.interval || 'monthly';
    const priceId = interval === 'annual' ? pricingTableAnnual[body.plan] : pricingTable[body.plan];
    if (!priceId) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Unknown plan');
    }
    const stripeSecret = typeof rawEnv.STRIPE_SECRET === 'string' ? rawEnv.STRIPE_SECRET : '';
    if (!stripeSecret) {
      return (0, api_middleware_1.createApiError)('server_error', 'Stripe not configured');
    }
    if (!user) {
      return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    // Do not pin apiVersion here to avoid TS literal mismatches; use package default
    const stripe = new stripe_1.default(stripeSecret);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${baseUrl}/api/billing/sync?session_id={CHECKOUT_SESSION_ID}&ws=${encodeURIComponent(body.workspaceId)}${safeReturnTo ? `&return_to=${encodeURIComponent(safeReturnTo)}` : ''}`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { workspaceId: body.workspaceId, userId: user.id, plan: body.plan },
    });
    return (0, api_middleware_1.createApiSuccess)({ url: session.url });
  },
  {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'create_checkout_session' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
      const { clientAddress, locals } = context;
      const user = locals.user;
      // Fehler protokollieren
      (0, security_logger_1.logUserEvent)(user?.id ?? 'anonymous', 'checkout_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress,
      });
      return new Response(JSON.stringify({ error: 'An error occurred during checkout' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    },
  }
);
