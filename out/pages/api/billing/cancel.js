'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const validation_1 = require('@/lib/validation');
const billing_1 = require('@/lib/validation/schemas/billing');
const stripe_1 = require('stripe');
const security_logger_1 = require('@/lib/security-logger');
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const { request, locals, clientAddress } = context;
    const unknownBody = await request.json().catch(() => null);
    const parsed = billing_1.billingCancelRequestSchema.safeParse(unknownBody);
    if (!parsed.success) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body', {
        details: (0, validation_1.formatZodError)(parsed.error),
      });
    }
    const body = parsed.data;
    const rawEnv = locals.runtime?.env ?? {};
    const user = locals.user;
    if (!user) {
      return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    if (!body.subscriptionId) {
      return (0, api_middleware_1.createApiError)('validation_error', 'subscriptionId is required');
    }
    const stripeSecret = typeof rawEnv.STRIPE_SECRET === 'string' ? rawEnv.STRIPE_SECRET : '';
    if (!stripeSecret) {
      return (0, api_middleware_1.createApiError)('server_error', 'Stripe not configured');
    }
    const dbUnknown = rawEnv.DB;
    const hasPrepare = typeof dbUnknown?.prepare === 'function';
    if (!dbUnknown || !hasPrepare) {
      return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const db = dbUnknown;
    const subscriptionRaw = await db
      .prepare(
        `SELECT id, status, cancel_at_period_end
         FROM subscriptions
         WHERE id = ?1 AND user_id = ?2`
      )
      .bind(body.subscriptionId, user.id)
      .first();
    const subscription = subscriptionRaw;
    if (!subscription) {
      return (0, api_middleware_1.createApiError)('not_found', 'Subscription not found');
    }
    if (subscription.cancel_at_period_end) {
      return (0, api_middleware_1.createApiSuccess)({
        message: 'Subscription already scheduled for cancellation',
      });
    }
    const stripe = new stripe_1.default(stripeSecret);
    try {
      await stripe.subscriptions.update(body.subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      (0, security_logger_1.logUserEvent)(user.id, 'billing_cancel_stripe_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress,
      });
      return (0, api_middleware_1.createApiError)('server_error', 'Unable to cancel subscription');
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
    (0, security_logger_1.logUserEvent)(user.id, 'subscription_cancelled', {
      subscriptionId: body.subscriptionId,
      ipAddress: clientAddress,
    });
    return (0, api_middleware_1.createApiSuccess)({
      message: 'Subscription will cancel at period end',
      subscriptionId: body.subscriptionId,
    });
  },
  {
    logMetadata: { action: 'subscription_cancel_requested' },
  }
);
