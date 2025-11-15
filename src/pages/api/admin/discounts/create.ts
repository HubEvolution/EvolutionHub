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
import { createDiscountCodeSchema } from '@/lib/validation/schemas/discount';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals } = context;
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

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    // Validate request body
    const validation = createDiscountCodeSchema.safeParse(body);
    if (!validation.success) {
      return createApiError(
        'validation_error',
        validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const data = validation.data;
    const discountId = crypto.randomUUID();
    const now = Date.now();
    const userId = (locals as { user?: { id?: string } }).user?.id;

    // Check if code already exists
    const existing = await db
      .prepare('SELECT id FROM discount_codes WHERE LOWER(code) = LOWER(?1) LIMIT 1')
      .bind(data.code)
      .first<{ id: string }>();

    if (existing) {
      return createApiError('validation_error', 'Discount code already exists');
    }

    // Validate percentage value
    if (data.type === 'percentage' && data.value > 100) {
      return createApiError('validation_error', 'Percentage value cannot exceed 100');
    }

    // Validate date range
    if (data.validFrom && data.validUntil && data.validFrom > data.validUntil) {
      return createApiError('validation_error', 'Valid from date must be before valid until date');
    }

    try {
      await db
        .prepare(
          `INSERT INTO discount_codes 
           (id, code, type, value, max_uses, uses_count, valid_from, valid_until, status, description, created_by, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
        )
        .bind(
          discountId,
          data.code.toUpperCase(),
          data.type,
          data.value,
          data.maxUses ?? null,
          0,
          data.validFrom ?? null,
          data.validUntil ?? null,
          data.status ?? 'active',
          data.description ?? null,
          userId,
          now,
          now
        )
        .run();

      // Log the action
      const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
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
            'create',
            JSON.stringify({ discountId, code: data.code, type: data.type, value: data.value }),
            now
          )
          .run();
      } catch {
        // Audit log failure should not fail the operation
      }

      return createApiSuccess({
        id: discountId,
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        maxUses: data.maxUses ?? null,
        usesCount: 0,
        status: data.status ?? 'active',
        createdAt: now,
      });
    } catch (error) {
      console.error('Failed to create discount code:', error);
      return createApiError('server_error', 'Failed to create discount code');
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_discount_create' },
  }
);

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
