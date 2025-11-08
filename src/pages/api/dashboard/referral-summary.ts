import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import {
  getOrCreateReferralProfile,
  buildReferralLink,
} from '@/lib/services/referral-profile-service';
import { getReferralSummary } from '@/lib/services/referral-summary-service';
import { logUserEvent } from '@/lib/security-logger';

type RuntimeEnv = {
  DB?: D1Database;
  APP_ORIGIN?: string;
  PUBLIC_APP_ORIGIN?: string;
  ALLOWED_ORIGINS?: string;
  ALLOW_ORIGINS?: string;
};

function resolveRequestOrigin(context: APIContext, env: RuntimeEnv): string {
  const { request } = context;
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      // ignore invalid header and fallback
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore invalid referer
    }
  }

  const configuredOrigin = env.APP_ORIGIN || env.PUBLIC_APP_ORIGIN;
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // ignore invalid configured origin
    }
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return 'https://localhost';
  }
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const startedAt = Date.now();
    const { locals, clientAddress } = context;
    const user = locals.user;

    if (!user || !user.id) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const env = (locals.runtime?.env ?? {}) as RuntimeEnv;
    const db = env.DB;

    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    const origin = resolveRequestOrigin(context, env);

    try {
      const profile = await getOrCreateReferralProfile(db, user.id, startedAt);
      const summary = await getReferralSummary(db, user.id);

      const referralLink = buildReferralLink(profile.referralCode, origin);

      logUserEvent(user.id, 'referral_summary_requested', {
        ipAddress: clientAddress,
        referralCodeLength: profile.referralCode.length,
        totalReferrals: summary.stats.referredTotal,
      });

      const response = createApiSuccess({
        referralCode: profile.referralCode,
        referralLink,
        stats: summary.stats,
        recentEvents: summary.recentEvents,
        updatedAt: startedAt,
      });

      try {
        const duration = Date.now() - startedAt;
        response.headers.set('Server-Timing', `total;dur=${duration}`);
      } catch {
        // ignore header mutation errors (immutable response)
      }

      return response;
    } catch (error) {
      logUserEvent(user.id, 'referral_summary_failed', {
        ipAddress: clientAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      return createApiError('server_error', 'Unable to load referral summary');
    }
  },
  {
    logMetadata: { action: 'dashboard_referral_summary' },
  }
);

export const POST = withAuthApiMiddleware(() => createMethodNotAllowed('GET'), {
  disableAutoLogging: true,
});
