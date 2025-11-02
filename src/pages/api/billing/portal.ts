import Stripe from 'stripe';
import type { APIContext } from 'astro';
import { withRedirectMiddleware } from '@/lib/api-middleware';
import { createSecureRedirect } from '@/lib/response-helpers';
import { sanitizeReturnTo } from '@/utils/sanitizeReturnTo';
import { loggerFactory } from '@/server/utils/logger-factory';

export const GET = withRedirectMiddleware(async (context: APIContext) => {
  const rawEnv = (context.locals?.runtime?.env ?? {}) as Record<string, unknown>;
  const user = context.locals?.user as { id: string } | undefined;
  const reqUrl = new URL(context.request.url);
  const baseUrl: string =
    (typeof rawEnv.BASE_URL === 'string' ? (rawEnv.BASE_URL as string) : '') ||
    `${reqUrl.protocol}//${reqUrl.host}`;

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
  const stripeSecret =
    typeof rawEnv.STRIPE_SECRET === 'string' ? (rawEnv.STRIPE_SECRET as string) : '';
  if (!stripeSecret) return fallback('stripe_not_configured');

  const dbUnknown = (rawEnv as { DB?: unknown }).DB;
  const hasPrepare = typeof (dbUnknown as { prepare?: unknown })?.prepare === 'function';
  if (!dbUnknown || !hasPrepare) return fallback('db_unavailable');
  type D1Stmt = { bind: (...args: unknown[]) => { first: () => Promise<unknown | null> } };
  type D1Like = { prepare: (sql: string) => D1Stmt };
  const db = dbUnknown as D1Like;

  try {
    const row = (await db
      .prepare('SELECT customer_id FROM stripe_customers WHERE user_id = ? LIMIT 1')
      .bind(user.id)
      .first()) as { customer_id?: string } | null;

    const customerId = row?.customer_id || '';
    if (!customerId) return fallback('no_customer');

    const stripe = new Stripe(stripeSecret);
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
