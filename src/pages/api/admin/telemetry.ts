import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { requireAdmin } from '@/lib/auth-helpers';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
import type { AdminBindings } from '@/lib/types/admin';
import { formatZodError, z } from '@/lib/validation';

const telemetryEventSchema = z.object({
  event: z.enum(['dashboard_loaded', 'widget_interaction', 'api_error', 'action_performed']),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  context: z
    .object({
      section: z.string().min(1).max(100).optional(),
      widget: z.string().min(1).max(100).optional(),
      action: z.string().min(1).max(100).optional(),
    })
    .partial()
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withAuthApiMiddleware(
  async (context) => {
    const env = (context.locals.runtime?.env ?? {}) as AdminBindings;
    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    try {
      await requireAdmin({ request: context.request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let payloadRaw: unknown;
    try {
      payloadRaw = await context.request.json();
    } catch {
      return createApiError('validation_error', 'Invalid JSON body');
    }

    const parsed = telemetryEventSchema.safeParse(payloadRaw);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid telemetry payload', {
        details: formatZodError(parsed.error),
      });
    }

    const payload = parsed.data;
    const recordedAt = Date.now();
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${recordedAt}-${Math.random().toString(16).slice(2)}`;

    const actor = (context.locals as { user?: { id?: string } }).user;
    const actorUserId = actor?.id || null;
    const actorIp = typeof context.clientAddress === 'string' ? context.clientAddress : null;

    try {
      await db
        .prepare(
          `INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
        )
        .bind(
          id,
          'ADMIN_ACTION',
          actorUserId,
          actorIp,
          'dashboard',
          'telemetry_event',
          JSON.stringify({
            event: payload.event,
            severity: payload.severity ?? 'info',
            context: payload.context ?? null,
            metadata: payload.metadata ?? null,
          }),
          recordedAt
        )
        .run();
    } catch (error) {
      return createApiError('server_error', 'Failed to persist telemetry event', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }

    return createApiSuccess({ id, recordedAt });
  },
  {
    rateLimiter: sensitiveActionLimiter,
    enforceCsrfToken: true,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
