import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { formatZodError } from '@/lib/validation';
import { billingCancelRequestSchema } from '@/lib/validation';
import Stripe from 'stripe';
import { logUserEvent } from '@/lib/security-logger';

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { request, locals, clientAddress } = context;
    const unknownBody: unknown = await request.json().catch(() => null);
    const parsed = billingCancelRequestSchema.safeParse(unknownBody);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid JSON body', {
        details: formatZodError(parsed.error),
      });
    }
    const body = parsed.data;
    const rawEnv = (locals.runtime?.env ?? {}) as Record<string, unknown>;
    const user = locals.user;

    if (!user) {
      return createApiError('auth_error', 'Unauthorized');
    }

    if (!body.subscriptionId) {
      return createApiError('validation_error', 'subscriptionId is required');
    }

    const stripeSecret =
      typeof rawEnv.STRIPE_SECRET === 'string' ? (rawEnv.STRIPE_SECRET as string) : '';
    if (!stripeSecret) {
      return createApiError('server_error', 'Stripe not configured');
    }

    const dbUnknown = (rawEnv as { DB?: unknown }).DB;
    const hasPrepare = typeof (dbUnknown as { prepare?: unknown })?.prepare === 'function';
    if (!dbUnknown || !hasPrepare) {
      return createApiError('server_error', 'Database unavailable');
    }
    type D1Stmt = {
      bind: (...args: unknown[]) => {
        first: () => Promise<unknown | null>;
        run: () => Promise<unknown>;
      };
    };
    type D1Like = { prepare: (sql: string) => D1Stmt };
    const db = dbUnknown as D1Like;

    const subscriptionRaw = await db
      .prepare(
        `SELECT id, status, cancel_at_period_end
         FROM subscriptions
         WHERE id = ?1 AND user_id = ?2`
      )
      .bind(body.subscriptionId, user.id)
      .first();

    const subscription = subscriptionRaw as {
      id: string;
      status: string;
      cancel_at_period_end: number | null;
    } | null;

    if (!subscription) {
      return createApiError('not_found', 'Subscription not found');
    }

    if (subscription.cancel_at_period_end) {
      return createApiSuccess({
        message: 'Subscription already scheduled for cancellation',
      });
    }

    const stripe = new Stripe(stripeSecret);

    try {
      await stripe.subscriptions.update(body.subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      logUserEvent(user.id, 'billing_cancel_stripe_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress,
      });
      return createApiError('server_error', 'Unable to cancel subscription');
    }

    await db
      .prepare(
        `UPDATE subscriptions
         SET cancel_at_period_end = 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?1`
      )
      .bind(body.subscriptionId)
      .run();

    logUserEvent(user.id, 'subscription_cancelled', {
      subscriptionId: body.subscriptionId,
      ipAddress: clientAddress,
    });

    return createApiSuccess({
      message: 'Subscription will cancel at period end',
      subscriptionId: body.subscriptionId,
    });
  },
  {
    logMetadata: { action: 'subscription_cancel_requested' },
  }
);
