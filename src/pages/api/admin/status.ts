import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { getCreditsBalanceTenths } from '@/lib/kv/usage';
import { requireAdmin } from '@/lib/auth-helpers';

// Read-only admin status for the logged-in user
// Response shape (consistent): { success: boolean, data?: T, error?: string }
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals } = context;
  const user = locals.user;
  const env: any = locals?.runtime?.env ?? {};

  if (!user) {
    return createApiError('auth_error', 'Unauthorized');
  }

  const db = env.DB;
  const kv = env.KV_AI_ENHANCER as import('@cloudflare/workers-types').KVNamespace | undefined;

  // Enforce admin-only access
  try {
    await requireAdmin({
      req: { header: (n: string) => context.request.headers.get(n) || undefined },
      request: context.request,
      env: { DB: db },
    });
  } catch {
    return createApiError('forbidden', 'Insufficient permissions');
  }

  // Fetch plan from users (source of truth)
  const row = await db.prepare('SELECT plan FROM users WHERE id = ?').bind(user.id).first();
  const plan = ((row as any)?.plan ?? 'free') as 'free' | 'pro' | 'premium' | 'enterprise';

  // Fetch credits using credit packs (tenths -> integer credits)
  let credits = 0;
  if (kv) {
    try {
      const tenths = await getCreditsBalanceTenths(kv as any, user.id);
      credits = Math.floor((typeof tenths === 'number' ? tenths : 0) / 10);
    } catch {}
  }

  // Last subscription events (DB snapshot)
  const subsRes = await db
    .prepare(
      `SELECT id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at
       FROM subscriptions
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 5`
    )
    .bind(user.id)
    .all();

  return createApiSuccess({
    user: { id: user.id, email: user.email },
    plan,
    credits,
    subscriptions: subsRes?.results ?? [],
  });
});
