import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

interface SubscriptionRow {
  id: string;
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: number | null;
  updated_at: string;
}

export const GET = withAuthApiMiddleware(
  async (context) => {
    const { locals, clientAddress } = context;
    const user = locals.user;
    const env: any = locals.runtime?.env ?? {};

    if (!user) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    const subscription = (await db
      .prepare(
        `SELECT id, plan, status, current_period_end, cancel_at_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      )
      .bind(user.id)
      .first<SubscriptionRow>()) ?? null;

    const creditsKv = env.KV_AI_ENHANCER as import('@cloudflare/workers-types').KVNamespace | undefined;
    let creditsRemaining: number | null = null;
    if (creditsKv) {
      try {
        const rawCredits = await creditsKv.get(`ai:credits:user:${user.id}`);
        if (rawCredits !== null) {
          const parsed = parseInt(rawCredits, 10);
          creditsRemaining = Number.isFinite(parsed) ? parsed : null;
        }
      } catch (error) {
        logUserEvent(user.id, 'billing_summary_kv_error', {
          error: error instanceof Error ? error.message : String(error),
          ipAddress: clientAddress,
        });
      }
    }

    const result = {
      plan: subscription?.plan ?? (user.plan as 'free' | 'pro' | 'premium' | 'enterprise' | undefined) ?? 'free',
      status: subscription?.status ?? 'inactive',
      subscriptionId: subscription?.id ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      lastSyncedAt: subscription?.updated_at ?? null,
      creditsRemaining,
    };

    logUserEvent(user.id, 'billing_summary_requested', {
      ipAddress: clientAddress,
      plan: result.plan,
      status: result.status,
    });

    return createApiSuccess(result);
  },
  {
    logMetadata: { action: 'billing_summary_accessed' },
  }
);
