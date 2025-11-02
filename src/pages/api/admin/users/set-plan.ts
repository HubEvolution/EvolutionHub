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
import { adminSetPlanRequestSchema } from '@/lib/validation/schemas/admin';

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;
    const env = (locals.runtime?.env ?? {}) as AdminBindings;
    const db = env.DB;
    if (!db) return createApiError('server_error', 'Database unavailable');

    try {
      await requireAdmin({ request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    const parsed = adminSetPlanRequestSchema.safeParse(json);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid request', {
        details: formatZodError(parsed.error),
      });
    }
    const body = parsed.data;

    let userId = body.userId?.trim() || '';
    const targetEmail = body.email?.trim().toLowerCase() || '';

    if (!userId && targetEmail) {
      try {
        const row = await db
          .prepare('SELECT id, plan FROM users WHERE lower(email) = ?1 LIMIT 1')
          .bind(targetEmail)
          .first<{ id: string; plan?: 'free' | 'pro' | 'premium' | 'enterprise' }>();
        if (!row?.id) return createApiError('not_found', 'User not found');
        userId = row.id;
      } catch {
        return createApiError('server_error', 'Lookup failed');
      }
    }

    if (!userId) return createApiError('validation_error', 'email or userId required');

    let prevPlan: string | null = null;
    try {
      const row = await db
        .prepare('SELECT plan FROM users WHERE id = ?1 LIMIT 1')
        .bind(userId)
        .first<{ plan?: string | null }>();
      prevPlan = (row?.plan as string | null) ?? null;
    } catch {}

    try {
      await db.prepare('UPDATE users SET plan = ?1 WHERE id = ?2').bind(body.plan, userId).run();
    } catch {
      return createApiError('server_error', 'Failed to update plan');
    }

    try {
      const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
      await db
        .prepare(
          `INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
        )
        .bind(
          crypto.randomUUID(),
          'ADMIN_ACTION',
          (locals as { user?: { id?: string } }).user?.id || null,
          ip,
          'user',
          'set_plan',
          JSON.stringify({
            userId,
            email: targetEmail || undefined,
            from: prevPlan,
            to: body.plan,
            reason: body.reason || undefined,
          }),
          Date.now()
        )
        .run();
    } catch {}

    return createApiSuccess({ userId, plan: body.plan });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_set_plan' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
