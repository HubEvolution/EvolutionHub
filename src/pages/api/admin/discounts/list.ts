import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import { listDiscountCodesQuerySchema } from '@/lib/validation/schemas/discount';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const GET = withAuthApiMiddleware(
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

    // Parse query parameters
    const url = new URL(context.request.url);
    const queryParams = {
      status: url.searchParams.get('status'),
      limit: url.searchParams.get('limit'),
      cursor: url.searchParams.get('cursor'),
    };

    const validation = listDiscountCodesQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return createApiError(
        'validation_error',
        validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const { status, limit, cursor } = validation.data;

    try {
      let query = 'SELECT * FROM discount_codes';
      const conditions: string[] = [];
      const bindings: (string | number)[] = [];

      if (status) {
        conditions.push('status = ?');
        bindings.push(status);
      }

      if (cursor) {
        conditions.push('created_at < ?');
        bindings.push(Number(cursor));
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      bindings.push(limit + 1); // Fetch one extra to determine if there are more results

      const stmt = db.prepare(query);
      const result = await stmt.bind(...bindings).all<{
        id: string;
        code: string;
        type: string;
        value: number;
        max_uses: number | null;
        uses_count: number;
        valid_from: number | null;
        valid_until: number | null;
        status: string;
        description: string | null;
        created_by: string | null;
        created_at: number;
        updated_at: number;
      }>();

      const discountCodes = result.results || [];
      const hasMore = discountCodes.length > limit;
      const items = hasMore ? discountCodes.slice(0, limit) : discountCodes;

      // Calculate next cursor
      const nextCursor =
        hasMore && items.length > 0 ? String(items[items.length - 1].created_at) : null;

      return createApiSuccess({
        discountCodes: items.map((dc) => ({
          id: dc.id,
          code: dc.code,
          type: dc.type,
          value: dc.value,
          maxUses: dc.max_uses,
          usesCount: dc.uses_count,
          validFrom: dc.valid_from,
          validUntil: dc.valid_until,
          status: dc.status,
          description: dc.description,
          createdBy: dc.created_by,
          createdAt: dc.created_at,
          updatedAt: dc.updated_at,
        })),
        pagination: {
          limit,
          cursor: nextCursor,
          hasMore,
        },
      });
    } catch (error) {
      console.error('Failed to list discount codes:', error);
      return createApiError('server_error', 'Failed to list discount codes');
    }
  },
  {
    enforceCsrfToken: false,
    logMetadata: { action: 'admin_discount_list' },
  }
);

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
