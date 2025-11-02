import {
  withAuthApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { D1Database } from '@cloudflare/workers-types';
import type { APIContext } from 'astro';
import { requireAdmin } from '@/lib/auth-helpers';

export const GET = withAuthApiMiddleware(async (context: APIContext) => {
  const rawEnv = ((context.locals as unknown as { runtime?: { env?: Record<string, unknown> } })
    ?.runtime?.env || {}) as Record<string, unknown>;
  const dbMaybe = (rawEnv as { DB?: D1Database }).DB as D1Database | undefined;
  if (!dbMaybe) return createApiError('server_error', 'Database unavailable');
  const db = dbMaybe as D1Database;

  try {
    await requireAdmin({
      req: { header: (n: string) => context.request.headers.get(n) || undefined },
      request: context.request,
      env: { DB: db },
    });
  } catch {
    return createApiError('forbidden', 'Insufficient permissions');
  }

  // Helpers to run scalar queries safely
  async function scalar<T = number>(sql: string, ...binds: unknown[]): Promise<T | null> {
    try {
      const row = await db
        .prepare(sql)
        .bind(...binds)
        .first<{ v: T }>();
      return row?.v ?? null;
    } catch {
      return null;
    }
  }

  // Active sessions and users (expires_at treated as ISO or epoch seconds)
  const activeSessionsByIso = await scalar<number>(
    `SELECT COUNT(*) as v FROM sessions WHERE datetime(expires_at) > datetime('now')`
  );
  const activeSessionsByEpoch = await scalar<number>(
    `SELECT COUNT(*) as v FROM sessions WHERE CAST(expires_at AS INTEGER) > strftime('%s','now')`
  );
  const activeSessions = (activeSessionsByIso ?? 0) || (activeSessionsByEpoch ?? 0) || 0;

  const activeUsersByIso = await scalar<number>(
    `SELECT COUNT(DISTINCT user_id) as v FROM sessions WHERE datetime(expires_at) > datetime('now')`
  );
  const activeUsersByEpoch = await scalar<number>(
    `SELECT COUNT(DISTINCT user_id) as v FROM sessions WHERE CAST(expires_at AS INTEGER) > strftime('%s','now')`
  );
  const activeUsers = (activeUsersByIso ?? 0) || (activeUsersByEpoch ?? 0) || 0;

  const usersTotal = (await scalar<number>(`SELECT COUNT(*) as v FROM users`)) ?? 0;
  const usersNew24hIso = await scalar<number>(
    `SELECT COUNT(*) as v FROM users WHERE datetime(created_at) >= datetime('now','-1 day')`
  );
  const usersNew24hEpoch = await scalar<number>(
    `SELECT COUNT(*) as v FROM users WHERE CAST(created_at AS INTEGER) >= strftime('%s','now','-1 day')`
  );
  const usersNew24h = (usersNew24hIso ?? 0) || (usersNew24hEpoch ?? 0) || 0;

  return createApiSuccess({
    activeSessions,
    activeUsers,
    usersTotal,
    usersNew24h,
    ts: Date.now(),
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
