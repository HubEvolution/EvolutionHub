import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { D1Database } from '@cloudflare/workers-types';
import { requireAdmin } from '@/lib/auth-helpers';
import { getCreditsBalanceTenths } from '@/lib/kv/usage';
import type { APIContext } from 'astro';
import type { AdminBindings } from '@/lib/types/admin';

type UserRow = {
  id: string;
  email: string;
  name?: string | null;
  plan?: 'free' | 'pro' | 'premium' | 'enterprise' | null;
  created_at?: string | number | null;
};

type SubRow = {
  id: string;
  plan: string;
  status: string;
  current_period_end: number | null;
  updated_at: string;
};

export const GET = withAuthApiMiddleware(async (context: APIContext) => {
  const { locals, request } = context;
  const env = (locals?.runtime?.env ?? {}) as AdminBindings;
  const db = env.DB as D1Database | undefined;
  const kv = env.KV_AI_ENHANCER;
  if (!db) return createApiError('server_error', 'Database unavailable');

  try {
    await requireAdmin({
      req: { header: (n: string) => context.request.headers.get(n) || undefined },
      request,
      env: { DB: db },
    });
  } catch {
    return createApiError('forbidden', 'Insufficient permissions');
  }

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const id = (url.searchParams.get('id') || '').trim();
  if (!email && !id) return createApiError('validation_error', 'email or id required');

  let userRow: UserRow | null = null;
  try {
    if (email) {
      userRow = await db
        .prepare(
          'SELECT id, email, name, plan, created_at FROM users WHERE lower(email) = ?1 LIMIT 1'
        )
        .bind(email)
        .first<UserRow>();
    } else {
      userRow = await db
        .prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ?1 LIMIT 1')
        .bind(id)
        .first<UserRow>();
    }
  } catch {
    return createApiError('server_error', 'Lookup failed');
  }
  if (!userRow?.id) return createApiError('not_found', 'User not found');

  let credits = 0;
  if (kv) {
    try {
      const tenths = await getCreditsBalanceTenths(kv, userRow.id);
      credits = Math.floor((typeof tenths === 'number' ? tenths : 0) / 10);
    } catch {}
  }

  let sub: SubRow | null = null;
  let lastIp: string | null = null;
  let lastSeenAt: number | null = null;
  try {
    sub = await db
      .prepare(
        `SELECT id, plan, status, current_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      )
      .bind(userRow.id)
      .first<SubRow>();
  } catch {}

  try {
    const last = await db
      .prepare(
        `SELECT actor_ip, created_at FROM audit_logs WHERE actor_user_id = ?1 ORDER BY created_at DESC LIMIT 1`
      )
      .bind(userRow.id)
      .first<{ actor_ip: string | null; created_at: number | null }>();
    if (last) {
      lastIp = (last.actor_ip || null) as string | null;
      lastSeenAt = typeof last.created_at === 'number' ? last.created_at : null;
    }
  } catch {}

  // Fallback: if no audit-based lastSeenAt, approximate from sessions table (expires_at - 30d)
  if (!lastSeenAt) {
    try {
      const sess = await db
        .prepare(
          `SELECT expires_at FROM sessions WHERE user_id = ?1 ORDER BY expires_at DESC LIMIT 1`
        )
        .bind(userRow.id)
        .first<{ expires_at: number | string }>();
      if (sess && (sess as any).expires_at != null) {
        const expSec = Number((sess as any).expires_at) || 0;
        if (expSec > 0) {
          const approxCreatedMs = expSec * 1000 - 30 * 24 * 60 * 60 * 1000; // 30 days TTL
          lastSeenAt = Math.max(0, approxCreatedMs);
        }
      }
    } catch {}
  }

  const data = {
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name || '',
      plan: (userRow.plan ?? 'free') as 'free' | 'pro' | 'premium' | 'enterprise',
      createdAt: userRow.created_at || null,
    },
    credits,
    lastSeenAt,
    lastIp,
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
