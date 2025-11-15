import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import { discountCodeParamSchema } from '@/lib/validation/schemas/discount';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const DELETE = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, params } = context;
    const env = getAdminEnv(context);

    if (!(locals as { user?: { id?: string } }).user?.id) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const db = env.DB as D1Database | undefined;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    // Require admin role
    try {
      await requireAdmin({ request: context.request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    // Validate code parameter
    const validation = discountCodeParamSchema.safeParse({ code: params.code });
    if (!validation.success) {
      return createApiError(
        'validation_error',
        validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const { code } = validation.data;

    try {
      // Check if discount code exists
      const existing = await db
        .prepare('SELECT id, code FROM discount_codes WHERE LOWER(code) = LOWER(?1) LIMIT 1')
        .bind(code)
        .first<{ id: string; code: string }>();

      if (!existing) {
        return createApiError('not_found', 'Discount code not found');
      }

      // Delete the discount code (cascade will delete usages)
      await db.prepare('DELETE FROM discount_codes WHERE id = ?1').bind(existing.id).run();

      // Log the action
      const userId = (locals as { user?: { id?: string } }).user?.id;
      const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
      const now = Date.now();

      try {
        await db
          .prepare(
            `INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
          )
          .bind(
            crypto.randomUUID(),
            'ADMIN_ACTION',
            userId || null,
            ip,
            'discount_code',
            'delete',
            JSON.stringify({ discountId: existing.id, code: existing.code }),
            now
          )
          .run();
      } catch {
        // Audit log failure should not fail the operation
      }

      return createApiSuccess({
        deleted: true,
        code: existing.code,
      });
    } catch (error) {
      console.error('Failed to delete discount code:', error);
      return createApiError('server_error', 'Failed to delete discount code');
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_discount_delete' },
  }
);

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('DELETE');
export const GET = methodNotAllowed;
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
