import { withRedirectMiddleware } from '@/lib/api-middleware';
import { createSecureRedirect } from '@/lib/response-helpers';

export const GET = withRedirectMiddleware(async (context) => {
  const { locals, request } = context;
  const env: any = locals?.runtime?.env ?? {};
  const user = locals.user;
  const db = env.DB;
  const kv = env.KV_AI_ENHANCER as import('@cloudflare/workers-types').KVNamespace | undefined;

  const url = new URL(request.url);
  const baseUrl: string = env.BASE_URL || `${url.protocol}//${url.host}`;

  if (!user) {
    return createSecureRedirect(`${baseUrl}/login`, 302);
  }
  const email = (user.email || '').toLowerCase();
  if (!kv || !email) {
    return createSecureRedirect(`${baseUrl}/dashboard?billing=link-pending-missing`, 302);
  }

  const key = `stripe:pending:email:${email}`;
  const raw = await kv.get(key);
  if (!raw) {
    return createSecureRedirect(`${baseUrl}/dashboard?billing=nopending`, 302);
  }

  try {
    const payload = JSON.parse(raw) as {
      customerId?: string;
      subscriptionId?: string;
      plan?: 'free' | 'pro' | 'premium' | 'enterprise';
    };

    const customerId = payload.customerId || '';
    const subscriptionId = payload.subscriptionId || '';
    const plan = (payload.plan as any) || 'pro';

    if (customerId) {
      await db
        .prepare(
          "INSERT INTO stripe_customers (user_id, customer_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET customer_id = excluded.customer_id"
        )
        .bind(user.id, customerId)
        .run();
    }

    if (subscriptionId) {
      await db
        .prepare(
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
        )
        .bind(subscriptionId, user.id, customerId, plan, 'active', null, 0)
        .run();
    }

    await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, user.id).run();
    await kv.delete(key);

    return createSecureRedirect(`${baseUrl}/dashboard?billing=linked`, 302);
  } catch {
    return createSecureRedirect(`${baseUrl}/dashboard?billing=link-error`, 302);
  }
});
