import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import { formatZodError } from '@/lib/validation';
import { adminUserListQuerySchema, type AdminUserListQuery } from '@/lib/validation';
import { getCreditsBalanceTenths } from '@/lib/kv/usage';

interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  plan?: 'free' | 'pro' | 'premium' | 'enterprise' | null;
  status?: 'active' | 'banned' | 'deleted' | null;
  created_at?: number | string | null;
  banned_at?: number | string | null;
  deleted_at?: number | string | null;
  deleted_by?: string | null;
  stytch_user_id?: string | null;
}

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function encodeCursor(cursor: { createdAt: number; id: string }): string {
  const json = JSON.stringify(cursor);
  if (typeof btoa === 'function') {
    return btoa(json);
  }
  return Buffer.from(json, 'utf-8').toString('base64');
}

function decodeCursor(cursor?: string | null): { createdAt: number; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded =
      typeof atob === 'function' ? atob(cursor) : Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { createdAt?: unknown; id?: unknown };
    const createdAt = toNumber(parsed.createdAt);
    const id = typeof parsed.id === 'string' ? parsed.id : '';
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

async function fetchActiveSessions(
  db: AdminBindings['DB'],
  userIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!db || userIds.length === 0) return map;
  const placeholders = userIds.map((_, idx) => `?${idx + 1}`).join(', ');
  const query = `SELECT user_id AS userId, COUNT(*) AS count FROM sessions WHERE user_id IN (${placeholders}) GROUP BY user_id`;
  try {
    const res = await db
      .prepare(query)
      .bind(...userIds)
      .all<{ userId: string; count: number }>();
    for (const row of res.results ?? []) {
      map.set(row.userId, Number(row.count ?? 0));
    }
  } catch {
    // ignore failures; default zero
  }
  return map;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { request } = context;
    const env = getAdminEnv(context);
    const db = env.DB;
    const kv = env.KV_AI_ENHANCER;

    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const url = new URL(request.url);
    const parsedQuery = adminUserListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsedQuery.success) {
      return createApiError('validation_error', 'Invalid query', {
        details: formatZodError(parsedQuery.error),
      });
    }

    const query = parsedQuery.data as AdminUserListQuery;
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const cursor = decodeCursor(query.cursor);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push('(lower(email) LIKE ? OR lower(name) LIKE ? OR id LIKE ?)');
      params.push(pattern, pattern, `%${query.search}%`);
    }

    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }

    if (query.plan) {
      conditions.push('plan = ?');
      params.push(query.plan);
    }

    if (cursor) {
      conditions.push('(created_at < ? OR (created_at = ? AND id < ?))');
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT id, email, name, plan, status, created_at, banned_at, deleted_at, deleted_by, stytch_user_id FROM users ${whereClause} ORDER BY created_at DESC, id DESC LIMIT ?`;
    params.push(limit + 1);

    let rows: UserRow[] = [];
    try {
      const result = await db
        .prepare(sql)
        .bind(...params)
        .all<UserRow>();
      rows = result.results ?? [];
    } catch {
      return createApiError('server_error', 'Failed to load users');
    }

    let nextCursor: string | undefined;
    if (rows.length > limit) {
      const nextRow = rows.pop()!;
      const createdAt = toNumber(nextRow.created_at) ?? Date.now();
      nextCursor = encodeCursor({ createdAt, id: nextRow.id });
    }

    const userIds = rows.map((row) => row.id);
    const sessionMap = await fetchActiveSessions(db, userIds);

    const items = await Promise.all(
      rows.map(async (row) => {
        const createdAt = toNumber(row.created_at);
        const bannedAt = toNumber(row.banned_at);
        const deletedAt = toNumber(row.deleted_at);

        let credits = 0;
        if (kv) {
          try {
            const tenths = await getCreditsBalanceTenths(kv, row.id);
            if (typeof tenths === 'number') {
              credits = Math.floor(tenths / 10);
            }
          } catch {
            // ignore credit lookup failures
          }
        }

        return {
          user: {
            id: row.id,
            email: row.email,
            name: row.name ?? null,
            plan: (row.plan ?? 'free') as 'free' | 'pro' | 'premium' | 'enterprise',
            status: (row.status ?? 'active') as 'active' | 'banned' | 'deleted',
            createdAt: createdAt ?? null,
            stytchUserId: row.stytch_user_id ?? null,
          },
          stats: {
            activeSessions: sessionMap.get(row.id) ?? 0,
            credits,
          },
          lastSeenAt: null,
          lastIp: null,
          bannedAt: bannedAt ?? null,
          deletedAt: deletedAt ?? null,
          deletedBy: row.deleted_by ?? null,
        };
      })
    );

    return createApiSuccess({ items, nextCursor });
  },
  {
    rateLimiter: apiRateLimiter,
    logMetadata: { action: 'admin_users_list' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
