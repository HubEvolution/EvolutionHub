import { withAuthApiMiddleware } from '@/lib/api-middleware';
import { createSecureErrorResponse, createSecureRedirect } from '@/lib/response-helpers';
import Stripe from 'stripe';
import { sanitizeReturnTo } from '@/utils/sanitizeReturnTo';

function parsePricingTable(raw: unknown): Record<string, string> {
  try {
    if (!raw) return {};
    if (typeof raw === 'string') return JSON.parse(raw);
    if (typeof raw === 'object') return raw as Record<string, string>;
  } catch (_err) {
    // Intentionally ignore parsing errors; return empty object
  }
  return {};
}

function invert<K extends string, V extends string>(obj: Record<K, V>): Record<V, K> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(obj) as K[]) {
    out[obj[k] as unknown as string] = k as string;
  }
  return out as Record<V, K>;
}


export const GET = withAuthApiMiddleware(
  async (context) => {
    const { locals, request } = context;
    const user = locals.user;
    const env: any = locals?.runtime?.env ?? {};

    if (!user) {
      return createSecureErrorResponse('Unauthorized', 401);
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id') || '';
    const ws = url.searchParams.get('ws') || 'default';
    const returnToRaw = url.searchParams.get('return_to') || '';

    const requestUrl = new URL(context.request.url);
    const baseUrl: string = env.BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

    if (!env.STRIPE_SECRET) {
      return createSecureRedirect(
        `${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=stripe_not_configured`
      );
    }
    if (!sessionId) {
      return createSecureRedirect(
        `${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=missing_session`
      );
    }

    // Build priceId -> plan mapping (monthly + annual)
    const monthlyMap = invert(parsePricingTable(env.PRICING_TABLE));
    const annualMap = invert(parsePricingTable(env.PRICING_TABLE_ANNUAL));
    const priceMap: Record<string, 'free' | 'pro' | 'premium' | 'enterprise'> = {
      ...(monthlyMap as any),
      ...(annualMap as any),
    } as any;

    let session: Stripe.Checkout.Session;
    try {
      const stripe = new Stripe(env.STRIPE_SECRET);
      session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    } catch (err) {
      return createSecureRedirect(
        `${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=sync_error`
      );
    }

    // Basic safety: enforce user matches the session's reference
    const refUserId =
      (session.client_reference_id as string) || (session.metadata?.userId as string) || '';
    if (refUserId && refUserId !== user.id) {
      return createSecureRedirect(
        `${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}&billing=forbidden`
      );
    }

    const customerId = (session.customer as string) || '';
    const sub = session.subscription as Stripe.Subscription | null;

    let plan: 'free' | 'pro' | 'premium' | 'enterprise' = (session.metadata?.plan as any) || 'pro';
    if (sub && sub.items?.data?.[0]?.price?.id) {
      const priceId = sub.items.data[0].price.id as string;
      const mapped = priceMap[priceId] as any;
      if (mapped) plan = mapped;
    }

    // DB handles
    const db = env.DB;

    // Upsert stripe_customers
    if (customerId) {
      await db
        .prepare(
          'INSERT INTO stripe_customers (user_id, customer_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET customer_id = excluded.customer_id'
        )
        .bind(user.id, customerId)
        .run();
    }

    // Upsert subscription row if available
    if (sub) {
      const status = sub.status as string;
      const cpeRaw: any = (sub as any)?.current_period_end;
      const currentPeriodEnd = typeof cpeRaw === 'number' ? cpeRaw : null;
      const cancelAtPeriodEnd = !!(sub as any)?.cancel_at_period_end;
      const cape = cancelAtPeriodEnd ? 1 : 0;

      await db
        .prepare(
          `INSERT INTO subscriptions (id, user_id, customer_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           user_id = excluded.user_id,
           customer_id = excluded.customer_id,
           plan = excluded.plan,
           status = excluded.status,
           current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end,
           updated_at = CURRENT_TIMESTAMP`
        )
        .bind(sub.id, user.id, customerId, plan, status, currentPeriodEnd, cape)
        .run();

      // Apply policy similar to webhook
      if (status === 'active' || status === 'trialing' || status === 'past_due') {
        await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, user.id).run();
      } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
        await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind('free', user.id).run();
      }
    } else {
      // No subscription object (rare) — still set plan from metadata for UX
      try {
        await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, user.id).run();
      } catch (_err) {
        // Ignore plan update failures; webhook will eventually sync
      }
    }

    // Redirect to original page if provided and valid; otherwise to dashboard
    const safeReturnTo = sanitizeReturnTo(returnToRaw);
    if (safeReturnTo) {
      return createSecureRedirect(`${baseUrl}${safeReturnTo}`);
    }
    return createSecureRedirect(`${baseUrl}/dashboard?ws=${encodeURIComponent(ws)}`);
  },
  {
    onError: (_ctx, _err) => createSecureErrorResponse('sync_error', 500),
  }
);
