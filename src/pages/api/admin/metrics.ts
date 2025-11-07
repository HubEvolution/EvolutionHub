import {
  withAuthApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { D1Database } from '@cloudflare/workers-types';
import type { APIContext } from 'astro';
import type { AdminBindings } from '@/lib/types/admin';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = getAdminEnv(context);
    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }
    const database = db as D1Database;

    try {
      await requireAdmin({ request: context.request, env: { DB: database } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    // Helpers to run scalar queries safely
    async function scalar<T = number>(sql: string, ...binds: unknown[]): Promise<T | null> {
      try {
        const row = await database
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
  },
  { rateLimiter: apiRateLimiter, logMetadata: { action: 'admin_metrics' } }
);

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
