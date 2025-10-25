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
    const opStart = Date.now();
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

    const dbStart = Date.now();
    const subscription = (await db
      .prepare(
        `SELECT id, plan, status, current_period_end, cancel_at_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      )
      .bind(user.id)
      .first()) as SubscriptionRow | null;
    const dbDur = Date.now() - dbStart;

    const creditsKv = env.KV_AI_ENHANCER as
      | import('@cloudflare/workers-types').KVNamespace
      | undefined;
    let creditsRemaining: number | null = null;
    let kvDur = 0;
    if (creditsKv) {
      try {
        const kvStart = Date.now();
        const timeoutMs = 250;
        const key = `ai:credits:user:${user.id}`;
        const result = await Promise.race<Promise<string | null> | string>([
          creditsKv.get(key),
          new Promise<string>((resolve) => setTimeout(() => resolve('__timeout__'), timeoutMs)),
        ] as unknown as [Promise<string | null>, Promise<string>]);
        kvDur = Date.now() - kvStart;
        const rawCredits = result === '__timeout__' ? null : (result as string | null);
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
      plan:
        subscription?.plan ??
        (user.plan as 'free' | 'pro' | 'premium' | 'enterprise' | undefined) ??
        'free',
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

    const resp = createApiSuccess(result);
    try {
      const total = Date.now() - opStart;
      const timing = `db;dur=${dbDur}, kv;dur=${kvDur}, total;dur=${total}`;
      resp.headers.set('Server-Timing', timing);
    } catch {}
    return resp;
  },
  {
    logMetadata: { action: 'billing_summary_accessed' },
  }
);
