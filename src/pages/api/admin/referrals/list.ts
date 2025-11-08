import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import {
  listReferralEventsForAdmin,
  type ReferralStatus,
} from '@/lib/services/referral-admin-service';
import type { D1Database } from '@cloudflare/workers-types';

interface RuntimeEnv {
  DB?: D1Database;
  ENABLE_REFERRAL_REWARDS?: string;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;
    const env = (locals.runtime?.env ?? {}) as RuntimeEnv;
    const featureFlag = env.ENABLE_REFERRAL_REWARDS;
    const featureEnabled = featureFlag === '1' || featureFlag === 'true' || featureFlag === 'on';
    if (!featureEnabled) {
      return createApiError('forbidden', 'Referral rewards disabled');
    }

    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    const adminUser = locals.user as { id?: string; role?: string } | undefined;
    if (!adminUser?.id) {
      return createApiError('auth_error', 'Unauthorized');
    }
    if (adminUser.role !== 'admin') {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const cursor = url.searchParams.get('cursor');
    const statusParamRaw = url.searchParams.get('status');
    const ownerUserId = url.searchParams.get('ownerUserId');
    const referralCode = url.searchParams.get('referralCode');

    const allowedStatuses: (ReferralStatus | 'all')[] = [
      'pending',
      'verified',
      'paid',
      'cancelled',
      'all',
    ];
    const status = statusParamRaw
      ? allowedStatuses.includes(statusParamRaw.toLowerCase() as ReferralStatus | 'all')
        ? (statusParamRaw.toLowerCase() as ReferralStatus | 'all')
        : undefined
      : undefined;

    try {
      const result = await listReferralEventsForAdmin(db, {
        limit: limit ? Number(limit) : null,
        offset: offset ? Number(offset) : null,
        cursor: cursor ? Number(cursor) : null,
        status,
        ownerUserId,
        referralCode,
      });

      return createApiSuccess({
        events: result.events,
        stats: result.stats,
        pagination: result.pagination,
        filters: {
          status: result.filters.status,
          ownerUserId: result.filters.ownerUserId,
          referralCode: result.filters.referralCode,
          limit: result.filters.limit,
          offset: result.filters.offset,
          cursor: result.filters.cursor,
        },
      });
    } catch (error) {
      const apiErrorType = (error as { apiErrorType?: string }).apiErrorType;
      if (apiErrorType === 'validation_error') {
        return createApiError('validation_error', (error as Error).message);
      }

      console.error('[admin][referrals][list] failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return createApiError('server_error', 'Unable to list referral events');
    }
  },
  {
    rateLimiter: apiRateLimiter,
    logMetadata: { action: 'admin_referrals_list' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
