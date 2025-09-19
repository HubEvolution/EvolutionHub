import { withAuthApiMiddleware } from '@/lib/api-middleware';

// Read-only admin status for the logged-in user
// Response shape (consistent): { success: boolean, data?: T, error?: string }
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals } = context;
  const user = locals.user;
  const env: any = locals?.runtime?.env ?? {};

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = env.DB;
  const kv = (env as any).KV_AI_ENHANCER as { get: (k: string) => Promise<string | null> } | undefined;

  // Fetch plan from users (source of truth)
  const row = await db
    .prepare('SELECT plan FROM users WHERE id = ?')
    .bind(user.id)
    .first();
  const plan = ((row as any)?.plan ?? 'free') as 'free' | 'pro' | 'premium' | 'enterprise';

  // Fetch credits if KV bound
  let credits = 0;
  if (kv) {
    const key = `ai:credits:user:${user.id}`;
    const raw = await kv.get(key);
    if (raw) {
      const parsed = parseInt(raw, 10);
      credits = Number.isFinite(parsed) ? parsed : 0;
    }
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

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        user: { id: user.id, email: user.email },
        plan,
        credits,
        subscriptions: subsRes?.results ?? [],
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
});
