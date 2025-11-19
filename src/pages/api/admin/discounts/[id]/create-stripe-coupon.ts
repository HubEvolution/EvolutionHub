import type { APIContext } from 'astro';
import Stripe from 'stripe';
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
import { getDiscountCodeById, type DbDiscountCode } from '@/lib/services/discount-service';

interface CouponParams {
  name?: string;
  duration?: 'forever' | 'once' | 'repeating';
  amount_off?: number;
  currency?: string;
  percent_off?: number;
  max_redemptions?: number;
  redeem_by?: number;
}

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

function mapDbDiscountCode(row: DbDiscountCode) {
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

    const id = (context.params?.id as string | undefined)?.trim();
    if (!id) {
      return createApiError('validation_error', 'Invalid discount id');
    }

    let discount: DbDiscountCode | null = null;
    try {
      discount = await getDiscountCodeById(db, id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('no such table: discount_codes')) {
        return createApiError('not_found', 'Discount codes table not available');
      }
      return createApiError('server_error', 'Failed to load discount code');
    }

    if (!discount) {
      return createApiError('not_found', 'Discount code not found');
    }

    if (discount.stripe_coupon_id && discount.stripe_coupon_id.trim() !== '') {
      return createApiError('validation_error', 'Stripe coupon already exists for this discount');
    }

    const rawEnv = (context.locals?.runtime?.env ?? {}) as Record<string, unknown>;
    const stripeSecret =
      typeof rawEnv.STRIPE_SECRET === 'string' ? (rawEnv.STRIPE_SECRET as string) : '';

    if (!stripeSecret) {
      return createApiError('server_error', 'Stripe not configured');
    }

    const stripe = new Stripe(stripeSecret);

    if (discount.value <= 0) {
      return createApiError('validation_error', 'Discount value must be greater than zero');
    }

    const couponParams: CouponParams = {
      name: `Discount ${discount.code}`,
      duration: 'once',
    };

    if (discount.type === 'percentage') {
      if (discount.value <= 0 || discount.value > 100) {
        return createApiError('validation_error', 'Percentage discount must be between 1 and 100');
      }
      couponParams.percent_off = discount.value;
    } else {
      couponParams.amount_off = Math.round(discount.value * 100);
      couponParams.currency = 'eur';
    }

    if (discount.max_uses != null) {
      couponParams.max_redemptions = discount.max_uses;
    }
    if (discount.valid_until != null) {
      couponParams.redeem_by = Math.floor(discount.valid_until / 1000);
    }

    let couponId: string;
    try {
      const created = await stripe.coupons.create(couponParams);
      couponId = created.id;
    } catch (_err) {
      return createApiError('server_error', 'Failed to create Stripe coupon');
    }

    const now = Date.now();
    try {
      await db
        .prepare('UPDATE discount_codes SET stripe_coupon_id = ?, updated_at = ? WHERE id = ?')
        .bind(couponId, now, discount.id)
        .run();
    } catch {
      return createApiError('server_error', 'Failed to update discount code with Stripe coupon');
    }

    const updated: DbDiscountCode = {
      ...discount,
      stripe_coupon_id: couponId,
      updated_at: now,
    };

    return createApiSuccess({ discountCode: mapDbDiscountCode(updated) });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_discounts_create_stripe_coupon' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
