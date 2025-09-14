import type { APIRoute } from 'astro';
import Stripe from 'stripe';
// Minimal KV interface to avoid external type dependency
type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

// Stripe Webhook to synchronize subscriptions and set users.plan
// Events handled:
// - checkout.session.completed -> map user, customer, subscription, set plan
// - customer.subscription.updated/deleted -> update status, maybe downgrade

function parsePricingTable(raw: unknown): Record<string, string> {
  try {
    if (!raw) return {};
    if (typeof raw === 'string') return JSON.parse(raw);
    if (typeof raw === 'object') return raw as Record<string, string>;
  } catch {}
  return {};
}

function invert<K extends string, V extends string>(obj: Record<K, V>): Record<V, K> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(obj) as K[]) {
    out[(obj[k] as unknown) as string] = k as string;
  }
  return out as Record<V, K>;
}

export const POST: APIRoute = async (context) => {
  const env = (context.locals?.runtime?.env || {}) as App.Locals['runtime']['env'];
  const stripeSecret = (env as any).STRIPE_SECRET as string | undefined;
  const webhookSecret = (env as any).STRIPE_WEBHOOK_SECRET as string | undefined;

  if (!stripeSecret || !webhookSecret) {
    return new Response('Stripe not configured', { status: 500 });
  }

  const sig = context.request.headers.get('stripe-signature') || '';
  const rawBody = await context.request.text();

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeSecret);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    // Minimal structured logging (no sensitive data)
    console.log('[stripe_webhook] received', {
      id: event.id,
      type: event.type
    });
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }

  const db = env.DB;
  const kv = (env as any).KV_AI_ENHANCER as KV | undefined;

  // Helper: set user plan in users table
  async function setUserPlan(userId: string, plan: 'free' | 'pro' | 'premium' | 'enterprise') {
    await db.prepare("UPDATE users SET plan = ? WHERE id = ?").bind(plan, userId).run();
  }

  // Helper: upsert stripe_customers
  async function upsertCustomer(userId: string, customerId: string) {
    await db.prepare(
      "INSERT INTO stripe_customers (user_id, customer_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET customer_id = excluded.customer_id"
    ).bind(userId, customerId).run();
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
    await db.prepare(
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
    ).bind(
      params.id,
      params.userId,
      params.customerId,
      params.plan,
      params.status,
      cpe,
      cape
    ).run();
  }

  // Map priceId -> plan via env tables (monthly + annual), where PRICING_TABLE* is plan->priceId
  const monthlyMap = invert(parsePricingTable((env as any).PRICING_TABLE));
  const annualMap = invert(parsePricingTable((env as any).PRICING_TABLE_ANNUAL));
  const priceMap: Record<string, 'free' | 'pro' | 'premium' | 'enterprise'> = {
    ...(monthlyMap as any),
    ...(annualMap as any)
  } as any;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) || '';
        const subscriptionId = (session.subscription as string) || '';
        const meta = session.metadata || {};
        const userId = (meta.userId as string) || (session.client_reference_id || '');
        // Handle credit packs (one-time payments)
        if (session.mode === 'payment' && (meta as any).purpose === 'credits' && kv) {
          const packStr = (meta as any).pack as string | undefined;
          const inc = packStr === '1000' ? 1000 : packStr === '200' ? 200 : 0;
          if (userId && inc > 0) {
            const key = `ai:credits:user:${userId}`;
            const raw = await kv.get(key);
            let n = 0;
            if (raw) {
              const parsed = parseInt(raw, 10);
              n = Number.isFinite(parsed) ? parsed : 0;
            }
            n += inc;
            await kv.put(key, String(n));
            console.log('[stripe_webhook] credits_applied', { userId, inc, total: n });
          }
          break; // for credits we are done here
        }

        if (!userId || !customerId) break;

        // Determine plan from metadata or price mapping
        let plan = (meta.plan as 'free' | 'pro' | 'premium' | 'enterprise' | undefined) || undefined;
        if (!plan) {
          // Try reading line items when available (not included by default in event)
          // Fallback to mapping by default price id from subscription when it arrives in a later event
          plan = 'pro'; // safe default if metadata absent; will be corrected on subscription.updated
        }

        await upsertCustomer(userId, customerId);
        if (subscriptionId) {
          await upsertSubscription({
            id: subscriptionId,
            userId,
            customerId,
            plan: (plan as any) || 'pro',
            status: 'active',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: null,
          });
        }
        // Set user plan immediately for better UX
        await setUserPlan(userId, (plan as any) || 'pro');
        console.log('[stripe_webhook] handled checkout.session.completed', {
          userId,
          customerId: customerId ? 'set' : 'missing',
          subscriptionId: subscriptionId ? 'set' : 'missing',
          plan: (plan as any) || 'pro'
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) || '';
        if (!customerId) break;
        // Lookup user by customer
        const row = await db.prepare("SELECT user_id FROM stripe_customers WHERE customer_id = ?").bind(customerId).first<{ user_id: string }>();
        const userId = row?.user_id;
        if (!userId) break;

        // Determine plan via price mapping; default to existing or 'free'
        const priceId = (sub.items?.data?.[0]?.price?.id as string) || '';
        const plan = (priceMap[priceId] as 'free' | 'pro' | 'premium' | 'enterprise' | undefined) || 'free';
        const status = sub.status as string;
        const cpeRaw = (sub as any)?.current_period_end;
        const currentPeriodEnd = typeof cpeRaw === 'number' ? cpeRaw : null;
        const cancelAtPeriodEnd = !!(sub as any)?.cancel_at_period_end;

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
        } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
          await setUserPlan(userId, 'free');
        }
        console.log('[stripe_webhook] handled subscription event', {
          event: event.type,
          userId,
          status,
          plan
        });
        break;
      }

      default:
        // ignore other events
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe_webhook] error', err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: 'webhook_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
