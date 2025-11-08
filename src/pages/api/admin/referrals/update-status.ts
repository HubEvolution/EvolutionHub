import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
import { logUserEvent } from '@/lib/security-logger';
import { referralAdminUpdateSchema } from '@/lib/validation/schemas/referral';
import type { D1Database } from '@cloudflare/workers-types';
import { markReferralPaid, cancelReferral } from '@/lib/services/referral-reward-service';

interface RuntimeEnv {
  DB?: D1Database;
  ENABLE_REFERRAL_REWARDS?: string;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;
    const env = (locals.runtime?.env ?? {}) as RuntimeEnv;
    const flag = env.ENABLE_REFERRAL_REWARDS;
    const featureEnabled = flag === '1' || flag === 'true' || flag === 'on';
    if (!featureEnabled) {
      return createApiError('forbidden', 'Referral rewards disabled');
    }

    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    const adminUser = locals.user;
    if (!adminUser?.id) {
      return createApiError('auth_error', 'Unauthorized');
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return createApiError('validation_error', 'Invalid JSON body');
    }

    const parsed = referralAdminUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid request', {
        details: parsed.error.format(),
      });
    }

    const { referralEventId, action, reason } = parsed.data;

    try {
      if (action === 'mark_paid') {
        const result = await markReferralPaid({
          db,
          referralEventId,
          adminUserId: adminUser.id,
          reason,
        });
        logUserEvent(adminUser.id, 'referral_mark_paid', {
          referralEventId,
          outcome: result.type,
        });
        if (result.type === 'not_found') {
          return createApiError('not_found', 'Referral event not found');
        }
        if (result.type === 'already_paid') {
          return createApiError('validation_error', 'Referral already paid');
        }
        return createApiSuccess({
          status: 'paid',
          referralEventId,
        });
      }

      if (action === 'cancel') {
        const result = await cancelReferral({
          db,
          referralEventId,
          adminUserId: adminUser.id,
          reason,
        });
        logUserEvent(adminUser.id, 'referral_cancelled', {
          referralEventId,
          outcome: result.type,
        });
        if (result.type === 'not_found') {
          return createApiError('not_found', 'Referral event not found');
        }
        if (result.type === 'already_cancelled') {
          return createApiError('validation_error', 'Referral already cancelled');
        }
        return createApiSuccess({
          status: 'cancelled',
          referralEventId,
        });
      }

      return createApiError('validation_error', 'Unsupported action');
    } catch (err) {
      logUserEvent(adminUser.id, 'referral_admin_error', {
        referralEventId,
        action,
        message: err instanceof Error ? err.message : String(err),
      });
      return createApiError('server_error', 'Unable to update referral status');
    }
  },
  {
    rateLimiter: sensitiveActionLimiter,
    enforceCsrfToken: true,
    logMetadata: { action: 'admin_referral_update' },
  }
);
