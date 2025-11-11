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
import { formatZodError } from '@/lib/validation';
import { adminUserLifecycleRequestSchema } from '@/lib/validation/schemas/admin';
import { stytchDeleteUser, StytchError } from '@/lib/stytch';

interface UserRow {
  id: string;
  status?: 'active' | 'banned' | 'deleted' | null;
  stytch_user_id?: string | null;
  deleted_at?: number | string | null;
  deleted_by?: string | null;
}

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const DELETE = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { request } = context;
    const env = getAdminEnv(context);
    const db = env.DB;

    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const userId = (context.params?.id || '').trim();
    if (!userId) {
      return createApiError('validation_error', 'User ID is required');
    }

    let payloadRaw: unknown = {};
    if (request.headers.get('Content-Type')?.includes('application/json')) {
      try {
        payloadRaw = await request.json();
      } catch {
        payloadRaw = {};
      }
    }

    const parsedBody = adminUserLifecycleRequestSchema.safeParse(payloadRaw);
    if (!parsedBody.success) {
      return createApiError('validation_error', 'Invalid request payload', {
        details: formatZodError(parsedBody.error),
      });
    }
    const body = parsedBody.data;

    let userRow: UserRow | null = null;
    try {
      userRow = await db
        .prepare(
          'SELECT id, status, stytch_user_id, deleted_at, deleted_by FROM users WHERE id = ?1 LIMIT 1'
        )
        .bind(userId)
        .first<UserRow>();
    } catch {
      return createApiError('server_error', 'Failed to load user');
    }

    if (!userRow?.id) {
      return createApiError('not_found', 'User not found');
    }
    if (userRow.status === 'deleted') {
      return createApiError('validation_error', 'User is already deleted');
    }

    const now = Date.now();
    const previousStatus = (userRow.status ?? 'active') as 'active' | 'banned' | 'deleted';
    const previousDeletedAt = userRow.deleted_at ?? null;
    const previousDeletedBy = userRow.deleted_by ?? null;

    try {
      const res = await db
        .prepare('UPDATE users SET status = ?1, deleted_at = ?2, deleted_by = ?3 WHERE id = ?4')
        .bind(
          'deleted',
          now,
          (context.locals as { user?: { id?: string } }).user?.id || null,
          userId
        )
        .run();
      if (!res.meta.changes) {
        return createApiError('server_error', 'Failed to update user');
      }
    } catch {
      return createApiError('server_error', 'Failed to update user');
    }

    const stytchUserId = userRow.stytch_user_id ?? null;
    if (stytchUserId) {
      try {
        await stytchDeleteUser(context, stytchUserId);
      } catch (error) {
        await db
          .prepare('UPDATE users SET status = ?1, deleted_at = ?2, deleted_by = ?3 WHERE id = ?4')
          .bind(previousStatus, previousDeletedAt, previousDeletedBy, userId)
          .run()
          .catch(() => undefined);

        if (error instanceof StytchError && error.providerType === 'config_error') {
          return createApiError('server_error', 'Stytch configuration missing');
        }

        const message =
          error instanceof StytchError ? error.message : 'Failed to delete user in Stytch';
        return createApiError('server_error', message);
      }
    }

    try {
      await db.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId).run();
    } catch {
      // best effort
    }

    const auditId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${now}-${Math.random().toString(16).slice(2)}`;
    const actor = (context.locals as { user?: { id?: string } }).user;
    const actorId = actor?.id || null;
    const actorIp = typeof context.clientAddress === 'string' ? context.clientAddress : null;

    try {
      await db
        .prepare(
          `INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
        )
        .bind(
          auditId,
          'ADMIN_ACTION',
          actorId,
          actorIp,
          'user',
          'delete',
          JSON.stringify({
            userId,
            reason: body.reason ?? null,
            sendEmail: body.sendEmail ?? false,
          }),
          now
        )
        .run();
    } catch {
      // ignore audit log failures
    }

    return createApiSuccess({
      userId,
      status: 'deleted' as const,
      deletedAt: now,
      deletedBy: actorId,
      auditLogId: auditId,
    });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_user_delete' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('DELETE');
export const GET = methodNotAllowed;
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
