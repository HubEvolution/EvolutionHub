import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { adminSensitiveLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import { formatZodError } from '@/lib/validation';
import { adminSetPlanRequestSchema } from '@/lib/validation';
import Stripe from 'stripe';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { request } = context;
    const env = getAdminEnv(context);
    const db = env.DB as unknown as D1Database | undefined;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    const parsed = adminSetPlanRequestSchema.safeParse(json);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid request', {
        details: formatZodError(parsed.error),
      });
    }
    const body = parsed.data;

    let userId = body.userId?.trim() || '';
    const targetEmail = body.email?.trim().toLowerCase() || '';

    if (!userId && targetEmail) {
      try {
        const row = await db
          .prepare('SELECT id, plan FROM users WHERE lower(email) = ?1 LIMIT 1')
          .bind(targetEmail)
          .first<{ id: string; plan?: 'free' | 'pro' | 'premium' | 'enterprise' }>();
        if (!row?.id) return createApiError('not_found', 'User not found');
        userId = row.id;
      } catch {
        return createApiError('server_error', 'Lookup failed');
      }
    }

    if (!userId) return createApiError('validation_error', 'email or userId required');

    let prevPlan: string | null = null;
    try {
      const row = await db
        .prepare('SELECT plan FROM users WHERE id = ?1 LIMIT 1')
        .bind(userId)
        .first<{ plan?: string | null }>();
      prevPlan = (row?.plan as string | null) ?? null;
    } catch {}

    // Orchestrate Stripe subscription changes; webhook will sync users.plan
    const envRaw = (context.locals.runtime?.env ?? {}) as Record<string, unknown>;
    const stripeSecret =
      typeof envRaw.STRIPE_SECRET === 'string' ? (envRaw.STRIPE_SECRET as string) : '';
    const envName =
      typeof envRaw.ENVIRONMENT === 'string'
        ? (envRaw.ENVIRONMENT as string).trim().toLowerCase()
        : '';

    const targetPlan = body.plan;
    const interval = body.interval === 'annual' ? 'annual' : 'monthly';
    const prorationBehavior = body.prorationBehavior === 'none' ? 'none' : 'create_prorations';

    const parsePricingTable = (raw: unknown): Record<string, string> => {
      try {
        if (!raw) return {};
        if (typeof raw === 'string') return JSON.parse(raw);
        if (typeof raw === 'object') return raw as Record<string, string>;
      } catch {}
      return {};
    };

    const priceTables = {
      monthly: parsePricingTable((envRaw as { PRICING_TABLE?: unknown }).PRICING_TABLE),
      annual: parsePricingTable(
        (envRaw as { PRICING_TABLE_ANNUAL?: unknown }).PRICING_TABLE_ANNUAL
      ),
    };
    const planToPrice = priceTables[interval] as Record<
      'free' | 'pro' | 'premium' | 'enterprise',
      string
    >;

    if (targetPlan === 'free') {
      // cancel existing subscription (immediately or at period end)
      const subRow = await db
        .prepare(
          'SELECT id, status, cancel_at_period_end FROM subscriptions WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 1'
        )
        .bind(userId)
        .first<{ id: string; status?: string; cancel_at_period_end?: number | null }>();

      if (
        subRow &&
        (subRow.status === 'active' || subRow.status === 'trialing' || subRow.status === 'past_due')
      ) {
        if (!stripeSecret) {
          return createApiError('server_error', 'Stripe not configured');
        }
        const stripe = new Stripe(stripeSecret);
        try {
          if (body.cancelImmediately) {
            await stripe.subscriptions.cancel(subRow.id);
            await db
              .prepare(
                'UPDATE subscriptions SET status = ?1, cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?2'
              )
              .bind('canceled', subRow.id)
              .run();
          } else {
            await stripe.subscriptions.update(subRow.id, { cancel_at_period_end: true });
            await db
              .prepare(
                'UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1'
              )
              .bind(subRow.id)
              .run();
          }
        } catch (err) {
          const rawMessage = err instanceof Error ? err.message : String(err);
          if (envName && envName !== 'production') {
            return createApiError('server_error', 'Failed to update subscription in Stripe', {
              details: {
                stripeMessage: rawMessage.slice(0, 200),
              },
            });
          }
          return createApiError('server_error', 'Failed to update subscription in Stripe');
        }
      }
      // do not update users.plan directly; webhook will set to 'free'
    } else {
      // upgrade/downgrade to paid plan
      const priceId = planToPrice?.[targetPlan];
      if (!priceId || !stripeSecret) {
        return createApiError('server_error', 'Stripe not configured or price mapping missing');
      }
      const stripe = new Stripe(stripeSecret);

      // ensure customer exists
      let customerId = await db
        .prepare('SELECT customer_id FROM stripe_customers WHERE user_id = ?1 LIMIT 1')
        .bind(userId)
        .first<{ customer_id?: string }>()
        .then((r) => (r?.customer_id as string | undefined) || '');

      if (!customerId) {
        // resolve email
        let email = targetEmail;
        if (!email) {
          const row = await db
            .prepare('SELECT email FROM users WHERE id = ?1 LIMIT 1')
            .bind(userId)
            .first<{ email?: string }>();
          email = (row?.email as string | undefined) || '';
        }
        try {
          const cust = await stripe.customers.create(email ? { email } : {});
          customerId = cust.id;
          await db
            .prepare(
              'INSERT INTO stripe_customers (user_id, customer_id) VALUES (?1, ?2) ON CONFLICT(user_id) DO UPDATE SET customer_id = excluded.customer_id'
            )
            .bind(userId, customerId)
            .run();
        } catch {
          return createApiError('server_error', 'Failed to create Stripe customer');
        }
      }

      const subRow = await db
        .prepare(
          'SELECT id, status FROM subscriptions WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 1'
        )
        .bind(userId)
        .first<{ id: string; status?: string }>();

      try {
        if (
          subRow &&
          (subRow.status === 'active' ||
            subRow.status === 'trialing' ||
            subRow.status === 'past_due')
        ) {
          const current = await stripe.subscriptions.retrieve(subRow.id, {
            expand: ['items.data'],
          });
          const itemId = current.items.data?.[0]?.id;
          if (!itemId) {
            return createApiError('server_error', 'Subscription item not found');
          }
          await stripe.subscriptions.update(subRow.id, {
            cancel_at_period_end: false,
            proration_behavior: prorationBehavior as 'create_prorations' | 'none',
            items: [{ id: itemId, price: priceId }],
          });
        } else {
          const created = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            proration_behavior: prorationBehavior as 'create_prorations' | 'none',
          });
          await db
            .prepare(
              `INSERT INTO subscriptions (id, user_id, customer_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, customer_id = excluded.customer_id, plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end, updated_at = CURRENT_TIMESTAMP`
            )
            .bind(
              created.id,
              userId,
              customerId,
              targetPlan,
              (created.status as string) || 'active',
              typeof (created as unknown as { current_period_end?: number }).current_period_end ===
                'number'
                ? (created as unknown as { current_period_end?: number }).current_period_end
                : null
            )
            .run();
        }
      } catch (err) {
        const rawMessage = err instanceof Error ? err.message : String(err);
        if (envName && envName !== 'production') {
          return createApiError('server_error', 'Failed to update subscription in Stripe', {
            details: {
              stripeMessage: rawMessage.slice(0, 200),
            },
          });
        }
        return createApiError('server_error', 'Failed to update subscription in Stripe');
      }
    }

    try {
      const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
      await db
        .prepare(
          `INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
        )
        .bind(
          crypto.randomUUID(),
          'ADMIN_ACTION',
          (context.locals as { user?: { id?: string } }).user?.id || null,
          ip,
          'user',
          'set_plan',
          JSON.stringify({
            userId,
            email: targetEmail || undefined,
            from: prevPlan,
            to: body.plan,
            reason: body.reason || undefined,
          }),
          Date.now()
        )
        .run();
    } catch {}

    return createApiSuccess({ userId, plan: body.plan });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: adminSensitiveLimiter,
    logMetadata: { action: 'admin_set_plan' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
