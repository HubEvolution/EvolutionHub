import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import Stripe from 'stripe';
import { logUserEvent } from '@/lib/security-logger';

interface CancelRequest {
  subscriptionId?: string;
}

export const POST = withAuthApiMiddleware(
  async (context) => {
    const { request, locals, clientAddress } = context;
    const body = (await request.json().catch(() => ({}))) as CancelRequest;
    const env: any = locals.runtime?.env ?? {};
    const user = locals.user;

    if (!user) {
      return createApiError('auth_error', 'Unauthorized');
    }

    if (!body.subscriptionId) {
      return createApiError('validation_error', 'subscriptionId is required');
    }

    if (!env.STRIPE_SECRET) {
      return createApiError('server_error', 'Stripe not configured');
    }

    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    const subscription = await db
      .prepare(
        `SELECT id, status, cancel_at_period_end
         FROM subscriptions
         WHERE id = ?1 AND user_id = ?2`
      )
      .bind(body.subscriptionId, user.id)
      .first<{ id: string; status: string; cancel_at_period_end: number | null }>();

    if (!subscription) {
      return createApiError('not_found', 'Subscription not found');
    }

    if (subscription.cancel_at_period_end) {
      return createApiSuccess({
        message: 'Subscription already scheduled for cancellation',
      });
    }

    const stripe = new Stripe(env.STRIPE_SECRET);

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
