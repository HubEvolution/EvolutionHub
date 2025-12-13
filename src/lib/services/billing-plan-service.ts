import type { Plan } from '@/config/ai-image/entitlements';

export type PlanSource = 'subscription' | 'users.plan' | 'locals.user.plan' | 'default';

export interface PlanResolverEnv {
  DB?: unknown;
}

type SubscriptionRow = {
  id: string;
  plan: Plan;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: number | null;
  updated_at: string;
};

type D1Stmt<T = unknown> = { bind: (...args: unknown[]) => { first: () => Promise<T | null> } };
type D1Like = { prepare: (sql: string) => D1Stmt };

export interface PlanResolutionResult {
  plan: Plan;
  source: PlanSource;
}

export async function resolveEffectivePlanForUser(options: {
  userId: string;
  env: PlanResolverEnv | undefined;
  localsPlan?: Plan | null | undefined;
}): Promise<PlanResolutionResult> {
  const { userId, env, localsPlan } = options;

  const dbMaybe = env?.DB;
  if (!dbMaybe) {
    const plan = (localsPlan ?? 'free') as Plan;
    return {
      plan,
      source: localsPlan ? 'locals.user.plan' : 'default',
    };
  }

  const d1 = dbMaybe as unknown as D1Like;

  let subscription: SubscriptionRow | null = null;
  try {
    subscription = (await d1
      .prepare(
        `SELECT id, plan, status, current_period_end, cancel_at_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      )
      .bind(userId)
      .first()) as SubscriptionRow | null;
  } catch {
    subscription = null;
  }

  let planFallback: Plan | undefined = localsPlan ?? undefined;

  if (!subscription && !planFallback) {
    try {
      const row = (await d1
        .prepare(`SELECT plan FROM users WHERE id = ?1 LIMIT 1`)
        .bind(userId)
        .first()) as { plan?: string } | null;
      const p = (row?.plan as Plan | undefined) ?? undefined;
      planFallback = p;
    } catch {
      // ignore lookup failures and fall back to locals plan or default
    }
  }

  const activeStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);
  const isActiveSub = Boolean(subscription && activeStatuses.has(subscription.status));

  if (isActiveSub && subscription) {
    return {
      plan: subscription.plan,
      source: 'subscription',
    };
  }

  if (planFallback) {
    const source: PlanSource =
      localsPlan && planFallback === localsPlan ? 'locals.user.plan' : 'users.plan';
    return {
      plan: planFallback,
      source,
    };
  }

  return {
    plan: 'free',
    source: 'default',
  };
}
