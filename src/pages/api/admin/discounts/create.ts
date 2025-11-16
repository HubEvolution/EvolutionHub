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
import { formatZodError, createDiscountCodeBodySchema } from '@/lib/validation';
import type { DiscountCodeResponse } from '@/lib/validation';
import { createDiscountCode, type DbDiscountCode } from '@/lib/services/discount-service';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

function mapDbDiscountCode(row: DbDiscountCode): DiscountCodeResponse {
  return {
    id: row.id,
    code: row.code,
    stripeCouponId: row.stripe_coupon_id,
    type: row.type,
    value: row.value,
    maxUses: row.max_uses,
    usesCount: row.uses_count,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: row.status,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { request } = context;
    const env = getAdminEnv(context);
    const db = env.DB as unknown as D1Database | undefined;

    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

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

    const parsed = createDiscountCodeBodySchema.safeParse(json);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid request', {
        details: formatZodError(parsed.error),
      });
    }

    const body = parsed.data;
    const localsWithUser = context.locals as { user?: { id?: string } };
    const createdBy =
      typeof localsWithUser.user?.id === 'string' && localsWithUser.user.id.trim() !== ''
        ? localsWithUser.user.id
        : null;

    try {
      const dbDiscount = await createDiscountCode(db, {
        code: body.code,
        stripeCouponId: body.stripeCouponId,
        type: body.type,
        value: body.value,
        maxUses: body.maxUses,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
        description: body.description,
        status: body.status,
        createdBy,
      });

      const discountCode: DiscountCodeResponse = mapDbDiscountCode(dbDiscount);
      return createApiSuccess({ discountCode });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Fehlende Tabelle -> Feature (noch) nicht verfügbar
      if (message.includes('no such table: discount_codes')) {
        return createApiError('not_found', 'Discounts feature not available');
      }

      // Eindeutiger Code bereits vergeben
      if (message.includes('UNIQUE constraint failed')) {
        return createApiError('validation_error', 'Discount code already exists');
      }

      return createApiError('server_error', 'Failed to create discount code');
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_discounts_create' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
