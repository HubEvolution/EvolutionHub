import { withAuthApiMiddleware, createApiError, createApiSuccess, createMethodNotAllowed } from '@/lib/api-middleware';
import type { D1Database } from '@cloudflare/workers-types';
import { requireAdmin } from '@/lib/auth-helpers';
import { getCreditsBalanceTenths } from '@/lib/kv/usage';

export const GET = withAuthApiMiddleware(async (context) => {
  const { locals, request } = context as any;
  const env: any = locals?.runtime?.env ?? {};
  const db = env.DB as D1Database | undefined;
  const kv = env.KV_AI_ENHANCER as import('@cloudflare/workers-types').KVNamespace | undefined;
  if (!db) return createApiError('server_error', 'Database unavailable');

  try {
    await requireAdmin({ req: { header: (n: string) => context.request.headers.get(n) || undefined }, request, env: { DB: db } });
  } catch (e) {
    return createApiError('forbidden', 'Insufficient permissions');
  }

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const id = (url.searchParams.get('id') || '').trim();
  if (!email && !id) return createApiError('validation_error', 'email or id required');

  let userRow: { id: string; email: string; name?: string; plan?: string; created_at?: string } | null = null;
  try {
    if (email) {
      userRow = await db
        .prepare('SELECT id, email, name, plan, created_at FROM users WHERE lower(email) = ?1 LIMIT 1')
        .bind(email)
        .first();
    } else {
      userRow = await db
        .prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ?1 LIMIT 1')
        .bind(id)
        .first();
    }
  } catch {
    return createApiError('server_error', 'Lookup failed');
  }
  if (!userRow?.id) return createApiError('not_found', 'User not found');

  let credits = 0;
  if (kv) {
    try {
      const tenths = await getCreditsBalanceTenths(kv as any, userRow.id);
      credits = Math.floor((typeof tenths === 'number' ? tenths : 0) / 10);
    } catch {}
  }

  let sub: { id: string; plan: string; status: string; current_period_end: number | null; updated_at: string } | null = null;
  try {
    sub = (await db
      .prepare(
        `SELECT id, plan, status, current_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      )
      .bind(userRow.id)
      .first()) as any;
  } catch {}

  const data = {
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name || '',
      plan: ((userRow.plan as any) || 'free') as 'free' | 'pro' | 'premium' | 'enterprise',
      createdAt: userRow.created_at || null,
    },
    credits,
    subscription: sub
      ? {
          id: sub.id,
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          updatedAt: sub.updated_at,
        }
      : null,
  };

  return createApiSuccess(data);
});

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
