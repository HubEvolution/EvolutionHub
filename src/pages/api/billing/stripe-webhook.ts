import type { APIContext } from 'astro';
import Stripe from 'stripe';
// Avoid strict KV typings in src-only typecheck scope
import { withApiMiddleware } from '@/lib/api-middleware';
import { createRateLimiter } from '@/lib/rate-limiter';
import { createSecureErrorResponse, createSecureJsonResponse } from '@/lib/response-helpers';
import { addCreditPackTenths, getCreditsBalanceTenths } from '@/lib/kv/usage';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

const stripeWebhookLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
  name: 'stripeWebhook',
});

// Stripe Webhook to synchronize subscriptions and set users.plan
// Events handled:
// - checkout.session.completed -> map user, customer, subscription, set plan
// - customer.subscription.updated/deleted -> update status, maybe downgrade

function parsePricingTable(raw: unknown): Record<string, string> {
  try {
    if (!raw) return {};
    if (typeof raw === 'string') return JSON.parse(raw);
    if (typeof raw === 'object') return raw as Record<string, string>;
  } catch {
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

export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const rawEnv = (context.locals?.runtime?.env || {}) as Record<string, unknown>;
    const stripeSecret =
      typeof (rawEnv as { STRIPE_SECRET?: string }).STRIPE_SECRET === 'string'
        ? ((rawEnv as { STRIPE_SECRET?: string }).STRIPE_SECRET as string)
        : '';
    const webhookSecret =
      typeof (rawEnv as { STRIPE_WEBHOOK_SECRET?: string }).STRIPE_WEBHOOK_SECRET === 'string'
        ? ((rawEnv as { STRIPE_WEBHOOK_SECRET?: string }).STRIPE_WEBHOOK_SECRET as string)
        : '';

    if (!stripeSecret || !webhookSecret) {
      return createSecureErrorResponse('Stripe not configured', 500);
    }

    const sig = context.request.headers.get('stripe-signature') || '';
    const rawBody = await context.request.text();

    let event: { id: string; type: string; data: { object: unknown } };
    try {
      const stripe = new Stripe(stripeSecret);
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
      console.log('[stripe_webhook] received', {
        id: event.id,
        type: event.type,
      });
    } catch (err) {
      try {
        console.error('[stripe_webhook] signature_verify_failed', {
          hasSig: !!sig,
          sigLen: typeof sig === 'string' ? sig.length : 0,
          err: err instanceof Error ? err.message : String(err),
        });
      } catch {}
      return createSecureErrorResponse('Invalid signature', 400);
    }

    const dbMaybe = (rawEnv as { DB?: D1Database }).DB as D1Database | undefined;
    const kv = (rawEnv as { KV_AI_ENHANCER?: KVNamespace }).KV_AI_ENHANCER as
      | KVNamespace
      | undefined;
    if (!dbMaybe) {
      return createSecureErrorResponse('Database unavailable', 500);
    }
    const db: D1Database = dbMaybe;

    // Helper: set user plan in users table
    async function setUserPlan(userId: string, plan: 'free' | 'pro' | 'premium' | 'enterprise') {
      await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, userId).run();
    }

    // Helper: upsert stripe_customers
    async function upsertCustomer(userId: string, customerId: string) {
      await db
        .prepare(
          'INSERT INTO stripe_customers (user_id, customer_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET customer_id = excluded.customer_id'
        )
        .bind(userId, customerId)
        .run();
    }

    // Helper: upsert subscription row
    async function upsertSubscription(params: {
      id: string;
      userId: string;
      customerId: string;
      plan: 'free' | 'pro' | 'premium' | 'enterprise';
      status: string;
      currentPeriodEnd?: number | null;
      cancelAtPeriodEnd?: boolean | null;
    }) {
      const cpe = params.currentPeriodEnd ?? null;
      const cape = params.cancelAtPeriodEnd ? 1 : 0;
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
        .bind(params.id, params.userId, params.customerId, params.plan, params.status, cpe, cape)
        .run();
    }

    // Map priceId -> plan via env tables (monthly + annual), where PRICING_TABLE* is plan->priceId
    const monthlyRaw = (rawEnv as { PRICING_TABLE?: unknown }).PRICING_TABLE;
    const annualRaw = (rawEnv as { PRICING_TABLE_ANNUAL?: unknown }).PRICING_TABLE_ANNUAL;
    const monthlyMap = invert(parsePricingTable(monthlyRaw));
    const annualMap = invert(parsePricingTable(annualRaw));
    const priceMap: Record<string, 'free' | 'pro' | 'premium' | 'enterprise'> = {};
    const isPlan = (v: string): v is 'free' | 'pro' | 'premium' | 'enterprise' =>
      v === 'free' || v === 'pro' || v === 'premium' || v === 'enterprise';
    for (const [price, plan] of Object.entries({ ...monthlyMap, ...annualMap })) {
      if (typeof plan === 'string' && isPlan(plan)) priceMap[price] = plan;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as {
            id?: string;
            mode?: string;
            customer?: unknown;
            subscription?: unknown;
            client_reference_id?: unknown;
            customer_details?: { email?: unknown } | null;
            metadata?: Record<string, unknown> | null;
            created?: number;
          };
          const customerId = (session.customer as string) || '';
          const subscriptionId = (session.subscription as string) || '';
          const meta = (session.metadata || {}) as Record<string, unknown>;
          const userId =
            (meta['userId'] as string | undefined) || (session.client_reference_id as string) || '';
          // Handle credit packs (one-time payments)
          if (session.mode === 'payment' && meta['purpose'] === 'credits' && kv) {
            const rawPack = meta['pack'] as string | undefined;
            const units = rawPack ? Number(rawPack) : 0;
            if (userId && Number.isFinite(units) && units > 0) {
              const packId = session.id || `sess_${Date.now()}`; // idempotency key fallback
              // store as tenths and compute expiry internally
              await addCreditPackTenths(
                kv,
                userId,
                packId,
                units * 10,
                typeof session.created === 'number' ? session.created * 1000 : Date.now()
              );
              // update legacy summary key for compatibility with existing UI
              const totalTenths = await getCreditsBalanceTenths(kv, userId);
              const legacyKey = `ai:credits:user:${userId}`;
              const legacyInt = Math.floor(totalTenths / 10);
              await kv.put(legacyKey, String(legacyInt));
              console.log('[stripe_webhook] credits_pack_applied', {
                userId,
                packId,
                units,
                total: legacyInt,
              });
            }
            break; // for credits we are done here
          }

          // If we don't have a userId but we do have an email, try to resolve the user by email.
          let resolvedUserId = userId;
          const customerEmail =
            (session.customer_details?.email as string | undefined) || undefined;
          if (!resolvedUserId && customerEmail) {
            try {
              const row = await db!
                .prepare('SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1')
                .bind(customerEmail)
                .first<{ id: string }>();
              if (row && row.id) {
                resolvedUserId = row.id as string;
              }
            } catch (_err) {
              // Ignore database lookup failures; continue without resolved user
            }
          }

          if ((!resolvedUserId || !customerId) && customerEmail && kv) {
            // Store a pending association for later (after user logs in)
            try {
              const payload = JSON.stringify({
                customerId,
                subscriptionId,
                plan:
                  (meta['plan'] as 'free' | 'pro' | 'premium' | 'enterprise' | undefined) || 'pro',
                ts: Date.now(),
                reason: 'checkout_completed_no_user_context',
              });
              await kv.put(`stripe:pending:email:${customerEmail.toLowerCase()}`, payload);
            } catch (_err) {
              // Ignore KV storage failures; pending association will retry via webhook
            }
          }

          if (!resolvedUserId || !customerId) break;

          // Determine plan from metadata or price mapping
          let plan =
            (meta['plan'] as 'free' | 'pro' | 'premium' | 'enterprise' | undefined) || undefined;
          if (!plan) {
            // Try reading line items when available (not included by default in event)
            // Fallback to mapping by default price id from subscription when it arrives in a later event
            plan = 'pro'; // safe default if metadata absent; will be corrected on subscription.updated
          }

          await upsertCustomer(resolvedUserId, customerId);
          if (subscriptionId) {
            await upsertSubscription({
              id: subscriptionId,
              userId: resolvedUserId,
              customerId,
              plan: plan || 'pro',
              status: 'active',
              currentPeriodEnd: null,
              cancelAtPeriodEnd: null,
            });
          }
          // Set user plan immediately for better UX
          await setUserPlan(resolvedUserId, plan || 'pro');
          console.log('[stripe_webhook] handled checkout.session.completed', {
            userId: resolvedUserId,
            customerId: customerId ? 'set' : 'missing',
            subscriptionId: subscriptionId ? 'set' : 'missing',
            plan: plan || 'pro',
          });
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.created':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as {
            id: string;
            customer?: unknown;
            status?: string;
            items?: { data?: Array<{ price?: { id?: unknown } | null }> };
            current_period_end?: unknown;
            cancel_at_period_end?: unknown;
          };
          const customerId = (sub.customer as string) || '';
          if (!customerId) break;
          // Lookup user by customer
          const row = (await db!
            .prepare('SELECT user_id FROM stripe_customers WHERE customer_id = ?')
            .bind(customerId)
            .first()) as { user_id: string } | null;
          const userId = row?.user_id;
          if (!userId) break;

          // Determine plan via price mapping; default to existing or 'free'
          const priceId = (sub.items?.data?.[0]?.price?.id as string) || '';
          const plan =
            (priceMap[priceId] as 'free' | 'pro' | 'premium' | 'enterprise' | undefined) || 'free';
          const status = sub.status as string;
          const subRec = sub as unknown as Record<string, unknown>;
          const cpeRaw = subRec['current_period_end'];
          const currentPeriodEnd = typeof cpeRaw === 'number' ? cpeRaw : null;
          const capeRaw = subRec['cancel_at_period_end'];
          const cancelAtPeriodEnd = !!capeRaw;

          await upsertSubscription({
            id: sub.id,
            userId,
            customerId,
            plan,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd,
          });

          // Apply downgrade/upgrade policy
          if (status === 'active' || status === 'trialing' || status === 'past_due') {
            await setUserPlan(userId, plan);
          } else if (
            status === 'canceled' ||
            status === 'unpaid' ||
            status === 'incomplete_expired'
          ) {
            await setUserPlan(userId, 'free');
          }
          console.log('[stripe_webhook] handled subscription event', {
            event: event.type,
            userId,
            status,
            plan,
          });
          break;
        }

        default:
          // ignore other events
          break;
      }
      return createSecureJsonResponse({ received: true });
    } catch (err) {
      console.error('[stripe_webhook] error', err instanceof Error ? err.message : String(err));
      return createSecureErrorResponse('webhook_error', 500);
    }
  },
  {
    rateLimiter: stripeWebhookLimiter,
    disableAutoLogging: false,
    requireSameOriginForUnsafeMethods: false,
    enforceCsrfToken: false,
  }
);
