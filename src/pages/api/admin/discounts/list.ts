import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import {
  formatZodError,
  listDiscountCodesQuerySchema,
  type ListDiscountCodesQuery,
  type DiscountCodeResponse,
} from '@/lib/validation';
import {
  listDiscountCodes,
  type DbDiscountCode,
  type ListDiscountCodesParams,
} from '@/lib/services/discount-service';

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

function buildListParams(query: ListDiscountCodesQuery): ListDiscountCodesParams {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
  const cursorCreatedAt = typeof query.cursor === 'number' ? query.cursor : null;

  return {
    status: query.status,
    limit,
    cursorCreatedAt,
  };
}

export const GET = withAuthApiMiddleware(
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

    const url = new URL(request.url);
    const rawQuery = Object.fromEntries(url.searchParams);
    const parsed = listDiscountCodesQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid query', {
        details: formatZodError(parsed.error),
      });
    }

    const query = parsed.data as ListDiscountCodesQuery;

    // Base list params (status, limit, cursor)
    const listParams = buildListParams(query);

    try {
      const result = await listDiscountCodes(db, listParams);

      let items = result.items;

      // Apply search filter on code / stripe_coupon_id
      if (query.search) {
        const pattern = query.search.toLowerCase();
        items = items.filter((row) => {
          const code = row.code.toLowerCase();
          const stripeId = (row.stripe_coupon_id || '').toLowerCase();
          return code.includes(pattern) || stripeId.includes(pattern);
        });
      }

      const now = Date.now();

      // isActiveNow filter
      if (query.isActiveNow === true) {
        items = items.filter((row) => {
          if (row.status !== 'active') return false;
          const from = row.valid_from ?? null;
          const until = row.valid_until ?? null;
          if (from !== null && from > now) return false;
          if (until !== null && until < now) return false;
          return true;
        });
      }

      // hasRemainingUses filter
      if (query.hasRemainingUses === true) {
        items = items.filter((row) => {
          if (row.max_uses == null) return true;
          return row.uses_count < row.max_uses;
        });
      }

      const discountCodes: DiscountCodeResponse[] = items.map(mapDbDiscountCode);

      return createApiSuccess({
        items: discountCodes,
        pagination: {
          limit: listParams.limit,
          cursor: result.nextCursor !== null ? String(result.nextCursor) : null,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Fehlende Tabelle -> Feature (noch) nicht verfügbar
      if (message.includes('no such table: discount_codes')) {
        return createApiError('not_found', 'Discounts feature not available');
      }

      return createApiError('server_error', 'Failed to list discount codes');
    }
  },
  {
    rateLimiter: apiRateLimiter,
    logMetadata: { action: 'admin_discounts_list' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
