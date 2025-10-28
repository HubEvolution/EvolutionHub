import Stripe from 'stripe';
import type { APIContext } from 'astro';
import { withRedirectMiddleware } from '@/lib/api-middleware';
import { createSecureRedirect } from '@/lib/response-helpers';
import { sanitizeReturnTo } from '@/utils/sanitizeReturnTo';
import { loggerFactory } from '@/server/utils/logger-factory';

export const GET = withRedirectMiddleware(async (context: APIContext) => {
  const env: any = context.locals?.runtime?.env ?? {};
  const user = context.locals?.user as { id: string } | undefined;
  const reqUrl = new URL(context.request.url);
  const baseUrl: string = env.BASE_URL || `${reqUrl.protocol}//${reqUrl.host}`;

  // Fallback to pricing when portal cannot be opened
  const pricingHref = '/pricing';
  const fallback = (reason: string) => {
    const u = new URL(pricingHref, baseUrl);
    u.searchParams.set('billing', reason);
    const returnToRaw = reqUrl.searchParams.get('return_to') || '';
    const safeReturnTo = sanitizeReturnTo(returnToRaw);
    if (safeReturnTo) u.searchParams.set('return_to', safeReturnTo);
    return createSecureRedirect(u.toString());
  };

  if (!user) return fallback('unauthorized');
  if (!env.STRIPE_SECRET) return fallback('stripe_not_configured');

  const db = env.DB;
  if (!db) return fallback('db_unavailable');

  try {
    const row = (await db
      .prepare('SELECT customer_id FROM stripe_customers WHERE user_id = ? LIMIT 1')
      .bind(user.id)
      .first()) as { customer_id?: string } | null;

    const customerId = row?.customer_id || '';
    if (!customerId) return fallback('no_customer');

    const stripe = new Stripe(env.STRIPE_SECRET);
    const returnToRaw = reqUrl.searchParams.get('return_to') || '';
    const safeReturnTo = sanitizeReturnTo(returnToRaw) || '/dashboard';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}${safeReturnTo}`,
    });

    // Extract Stripe request id if available and attach it for support correlation
    const reqId = (session as unknown as { lastResponse?: { requestId?: string } })?.lastResponse
      ?.requestId;
    if (reqId) {
      try {
        const secLogger = loggerFactory.createSecurityLogger();
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
      return createSecureRedirect(session.url, 302, reqId ? { 'X-Stripe-Request-Id': reqId } : {});
    }
    return fallback('portal_unavailable');
  } catch (_err) {
    return fallback('portal_error');
  }
});
