import {
  withAuthApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { getCreditsBalanceTenths } from '@/lib/kv/usage';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import type { APIContext } from 'astro';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

// Read-only admin status for the logged-in user
// Response shape (consistent): { success: boolean, data?: T, error?: string }
export const GET = withAuthApiMiddleware(async (context: APIContext) => {
  const { locals } = context;
  const user = locals.user as { id: string; email?: string } | undefined;
  const env = getAdminEnv(context);

  if (!user) {
    return createApiError('auth_error', 'Unauthorized');
  }

  const db = env.DB;
  const kv = env.KV_AI_ENHANCER;
  if (!db) {
    return createApiError('server_error', 'Database unavailable');
  }

  // Enforce admin-only access
  try {
    await requireAdmin({ request: context.request, env: { DB: db } });
  } catch {
    return createApiError('forbidden', 'Insufficient permissions');
  }

  // Fetch plan from users (source of truth)
  const row = await db
    .prepare('SELECT plan FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ plan?: 'free' | 'pro' | 'premium' | 'enterprise' }>();
  const plan = row?.plan ?? 'free';

  // Fetch credits using credit packs (tenths -> integer credits)
  let credits = 0;
  if (kv) {
    try {
      const tenths = await getCreditsBalanceTenths(kv, user.id);
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

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
