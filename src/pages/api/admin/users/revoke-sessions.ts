import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';

interface RevokeBody {
  userId?: string;
  sessionId?: string;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;
    const env = (locals.runtime?.env ?? {}) as AdminBindings;

    if (!env.DB) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: env.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let body: RevokeBody | null = null;
    try {
      body = (await request.json()) as RevokeBody;
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    const userId = (body?.userId || '').trim();
    const sessionId = (body?.sessionId || '').trim();

    if (!userId && !sessionId) {
      return createApiError('validation_error', 'Provide userId or sessionId');
    }

    let deleted = 0;
    if (sessionId) {
      const res = await env.DB.prepare(`DELETE FROM sessions WHERE id = ?1`).bind(sessionId).run();
      deleted += Number(res.meta.changes || 0);
    }
    if (userId) {
      const res = await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(userId).run();
      deleted += Number(res.meta.changes || 0);
    }

    return createApiSuccess({ deleted });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_sessions_revoke' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
