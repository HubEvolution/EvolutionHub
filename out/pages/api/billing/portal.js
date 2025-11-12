'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = void 0;
const stripe_1 = require('stripe');
const api_middleware_1 = require('@/lib/api-middleware');
const response_helpers_1 = require('@/lib/response-helpers');
const sanitizeReturnTo_1 = require('@/utils/sanitizeReturnTo');
const logger_factory_1 = require('@/server/utils/logger-factory');
exports.GET = (0, api_middleware_1.withRedirectMiddleware)(async (context) => {
  const rawEnv = context.locals?.runtime?.env ?? {};
  const user = context.locals?.user;
  const reqUrl = new URL(context.request.url);
  const baseUrl =
    (typeof rawEnv.BASE_URL === 'string' ? rawEnv.BASE_URL : '') ||
    `${reqUrl.protocol}//${reqUrl.host}`;
  // Fallback to pricing when portal cannot be opened
  const pricingHref = '/pricing';
  const fallback = (reason) => {
    const u = new URL(pricingHref, baseUrl);
    u.searchParams.set('billing', reason);
    const returnToRaw = reqUrl.searchParams.get('return_to') || '';
    const safeReturnTo = (0, sanitizeReturnTo_1.sanitizeReturnTo)(returnToRaw);
    if (safeReturnTo) u.searchParams.set('return_to', safeReturnTo);
    return (0, response_helpers_1.createSecureRedirect)(u.toString());
  };
  if (!user) return fallback('unauthorized');
  const stripeSecret = typeof rawEnv.STRIPE_SECRET === 'string' ? rawEnv.STRIPE_SECRET : '';
  if (!stripeSecret) return fallback('stripe_not_configured');
  const dbUnknown = rawEnv.DB;
  const hasPrepare = typeof dbUnknown?.prepare === 'function';
  if (!dbUnknown || !hasPrepare) return fallback('db_unavailable');
  const db = dbUnknown;
  try {
    const row = await db
      .prepare('SELECT customer_id FROM stripe_customers WHERE user_id = ? LIMIT 1')
      .bind(user.id)
      .first();
    const customerId = row?.customer_id || '';
    if (!customerId) return fallback('no_customer');
    const stripe = new stripe_1.default(stripeSecret);
    const returnToRaw = reqUrl.searchParams.get('return_to') || '';
    const safeReturnTo = (0, sanitizeReturnTo_1.sanitizeReturnTo)(returnToRaw) || '/dashboard';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}${safeReturnTo}`,
    });
    // Extract Stripe request id if available and attach it for support correlation
    const reqId = session?.lastResponse?.requestId;
    if (reqId) {
      try {
        const secLogger = logger_factory_1.loggerFactory.createSecurityLogger();
        secLogger.logSecurityEvent(
          'USER_EVENT',
          {
            reason: 'stripe_portal_session_created',
            requestId: reqId,
          },
          {
            userId: user.id,
            ipAddress: context.clientAddress || 'unknown',
          }
        );
      } catch {}
    }
    if (session?.url) {
      return (0, response_helpers_1.createSecureRedirect)(
        session.url,
        302,
        reqId ? { 'X-Stripe-Request-Id': reqId } : {}
      );
    }
    return fallback('portal_unavailable');
  } catch (_err) {
    return fallback('portal_error');
  }
});
