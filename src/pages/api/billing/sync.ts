import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createMethodNotAllowed } from '@/lib/api-middleware';
import { createSecureErrorResponse, createSecureRedirect } from '@/lib/response-helpers';
import Stripe from 'stripe';
import { sanitizeReturnTo } from '@/utils/sanitizeReturnTo';
import type { Plan } from '@/config/ai-image/entitlements';

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

// Safe helper types for Stripe SDK return shapes without using the namespace as a type directly
type StripeClient = InstanceType<typeof Stripe>;
type CheckoutRetrieve = StripeClient['checkout']['sessions']['retrieve'];
type StripeCheckoutSession = Awaited<ReturnType<CheckoutRetrieve>>;

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;
    const user = locals.user;
    const rawEnv = (locals?.runtime?.env ?? {}) as Record<string, unknown>;

    if (!user) {
      return createSecureErrorResponse('Unauthorized', 401);
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id') || '';
    const ws = url.searchParams.get('ws') || 'default';
    const returnToRaw = url.searchParams.get('return_to') || '';

    const requestUrl = new URL(context.request.url);
    const baseUrl: string =
      (typeof rawEnv.BASE_URL === 'string' ? (rawEnv.BASE_URL as string) : '') ||
      `${requestUrl.protocol}//${requestUrl.host}`;

    const stripeSecret =
      typeof rawEnv.STRIPE_SECRET === 'string' ? (rawEnv.STRIPE_SECRET as string) : '';
    if (!stripeSecret) {
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
    const monthlyMap = invert(
      parsePricingTable((rawEnv as { PRICING_TABLE?: unknown }).PRICING_TABLE)
    );
    const annualMap = invert(
      parsePricingTable((rawEnv as { PRICING_TABLE_ANNUAL?: unknown }).PRICING_TABLE_ANNUAL)
    );
    const priceMap: Record<string, Plan> = { ...monthlyMap, ...annualMap } as Record<string, Plan>;

    let session: StripeCheckoutSession;
    try {
      const stripe = new Stripe(stripeSecret);
      session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    } catch (_err) {
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
    const sub = (session as { subscription?: unknown }).subscription as
      | {
          id: string;
          status?: string;
          current_period_end?: number;
          cancel_at_period_end?: boolean;
          items?: { data?: Array<{ price?: { id?: string } | null | undefined }> };
        }
      | null
      | undefined;

    let plan: Plan = ((session.metadata?.plan as Plan | undefined) || 'pro') as Plan;
    if (sub && sub.items?.data && sub.items.data[0]?.price?.id) {
      const priceId = String(sub.items.data[0].price?.id || '');
      const mapped = priceMap[priceId] as Plan | undefined;
      if (mapped) plan = mapped;
    }

    // DB handles
    const db = (rawEnv as { DB?: unknown }).DB as {
      prepare: (sql: string) => {
        bind: (...args: unknown[]) => { run: () => Promise<unknown> };
      };
    };

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
      const currentPeriodEnd =
        typeof sub.current_period_end === 'number' ? sub.current_period_end : null;
      const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
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
    onError: (_ctx: APIContext, _err: unknown): Response =>
      createSecureErrorResponse('sync_error', 500),
  }
);

// 405 for unsupported methods (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
