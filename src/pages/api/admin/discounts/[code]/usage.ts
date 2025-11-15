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
import { discountCodeParamSchema } from '@/lib/validation/schemas/discount';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const GET = withAuthApiMiddleware(
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
      // Get discount code details
      const discountCode = await db
        .prepare(
          `SELECT id, code, type, value, max_uses, uses_count, valid_from, valid_until, status, description, created_at, updated_at
           FROM discount_codes 
           WHERE LOWER(code) = LOWER(?1) 
           LIMIT 1`
        )
        .bind(code)
        .first<{
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
          created_at: number;
          updated_at: number;
        }>();

      if (!discountCode) {
        return createApiError('not_found', 'Discount code not found');
      }

      // Get usage details
      const usages = await db
        .prepare(
          `SELECT dcu.id, dcu.user_id, dcu.order_id, dcu.discount_amount, dcu.used_at, u.email, u.name
           FROM discount_code_usages dcu
           LEFT JOIN users u ON dcu.user_id = u.id
           WHERE dcu.discount_code_id = ?1
           ORDER BY dcu.used_at DESC
           LIMIT 100`
        )
        .bind(discountCode.id)
        .all<{
          id: string;
          user_id: string | null;
          order_id: string | null;
          discount_amount: number;
          used_at: number;
          email: string | null;
          name: string | null;
        }>();

      return createApiSuccess({
        discountCode: {
          id: discountCode.id,
          code: discountCode.code,
          type: discountCode.type,
          value: discountCode.value,
          maxUses: discountCode.max_uses,
          usesCount: discountCode.uses_count,
          validFrom: discountCode.valid_from,
          validUntil: discountCode.valid_until,
          status: discountCode.status,
          description: discountCode.description,
          createdAt: discountCode.created_at,
          updatedAt: discountCode.updated_at,
        },
        usages: (usages.results || []).map((usage) => ({
          id: usage.id,
          userId: usage.user_id,
          userEmail: usage.email,
          userName: usage.name,
          orderId: usage.order_id,
          discountAmount: usage.discount_amount,
          usedAt: usage.used_at,
        })),
        summary: {
          totalUsages: discountCode.uses_count,
          remainingUsages:
            discountCode.max_uses !== null
              ? Math.max(0, discountCode.max_uses - discountCode.uses_count)
              : null,
        },
      });
    } catch (error) {
      console.error('Failed to get discount code usage:', error);
      return createApiError('server_error', 'Failed to get discount code usage');
    }
  },
  {
    enforceCsrfToken: false,
    logMetadata: { action: 'admin_discount_usage' },
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
