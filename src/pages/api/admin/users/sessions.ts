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

function parseExpiresMs(expires: string): number {
  // Accept ISO or numeric string
  const n = Number(expires);
  if (Number.isFinite(n)) return Math.floor(n);
  const t = Date.parse(expires);
  return Number.isFinite(t) ? t : 0;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request, url } = context;
    const env = (locals.runtime?.env ?? {}) as AdminBindings;

    if (!env.DB) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: env.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const userId = (url.searchParams.get('userId') || '').trim();
    if (!userId) return createApiError('validation_error', 'userId is required');

    const res = await env.DB
      .prepare(`SELECT id, user_id, expires_at FROM sessions WHERE user_id = ?1 ORDER BY expires_at DESC LIMIT 200`)
      .bind(userId)
      .all<{ id: string; user_id: string; expires_at: string }>();

    const items =
      (res.results || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        expiresAt: parseExpiresMs(r.expires_at),
      })) || [];

    return createApiSuccess({ items });
  },
  {
    rateLimiter: apiRateLimiter,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
