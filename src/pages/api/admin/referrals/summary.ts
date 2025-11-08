import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';

type ReferralStatus = 'pending' | 'verified' | 'paid' | 'cancelled';

type SummaryStatsRow = {
  status: ReferralStatus;
  count: number;
};

type TotalsRow = {
  totalEvents: number;
  totalCredits: number;
  ownerCount: number;
  referredCount: number;
};

type RecentEventRow = {
  id: string;
  status: ReferralStatus;
  referralCode: string;
  creditsAwarded: number | null;
  occurredAt: number | string | null;
  ownerUserId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  referredUserId: string | null;
  referredEmail: string | null;
};

type TopOwnerRow = {
  ownerUserId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  eventCount: number;
  totalCredits: number;
  lastEventAt: number | string | null;
};

function normalizeTimestamp(value: number | string | null): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeCredits(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals } = context;
    const env = locals.runtime?.env as
      | (Record<string, unknown> & { DB?: D1Database; ENABLE_REFERRAL_REWARDS?: string })
      | undefined;

    if (!env?.DB) {
      return createApiError('server_error', 'Database unavailable');
    }

    const user = locals.user as { role?: string } | undefined;
    if (!user || user.role !== 'admin') {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const featureFlag = env.ENABLE_REFERRAL_REWARDS;
    const featureEnabled = featureFlag === '1' || featureFlag === 'true' || featureFlag === 'on';
    if (!featureEnabled) {
      return createApiError('forbidden', 'Referral rewards disabled');
    }

    const db = env.DB;

    const statsRows = await db
      .prepare(
        `SELECT status, COUNT(*) AS count
         FROM referral_events
         GROUP BY status`
      )
      .all<SummaryStatsRow>();

    const totals = await db
      .prepare(
        `SELECT
           COUNT(*) AS totalEvents,
           COALESCE(SUM(credits_awarded), 0) AS totalCredits,
           COUNT(DISTINCT owner_user_id) AS ownerCount,
           COUNT(DISTINCT referred_user_id) FILTER (WHERE referred_user_id IS NOT NULL) AS referredCount
         FROM referral_events`
      )
      .first<TotalsRow>();

    const recentEventsRows = await db
      .prepare(
        `SELECT
           e.id,
           e.status,
           e.referral_code AS referralCode,
           e.credits_awarded AS creditsAwarded,
           e.occurred_at AS occurredAt,
           e.owner_user_id AS ownerUserId,
           owner.email AS ownerEmail,
           owner.name AS ownerName,
           e.referred_user_id AS referredUserId,
           referred.email AS referredEmail
         FROM referral_events e
         LEFT JOIN users owner ON owner.id = e.owner_user_id
         LEFT JOIN users referred ON referred.id = e.referred_user_id
         ORDER BY e.occurred_at DESC, e.created_at DESC
         LIMIT 10`
      )
      .all<RecentEventRow>();

    const topOwnersRows = await db
      .prepare(
        `SELECT
           e.owner_user_id AS ownerUserId,
           owner.email AS ownerEmail,
           owner.name AS ownerName,
           COUNT(*) AS eventCount,
           COALESCE(SUM(e.credits_awarded), 0) AS totalCredits,
           MAX(e.updated_at) AS lastEventAt
         FROM referral_events e
         LEFT JOIN users owner ON owner.id = e.owner_user_id
         GROUP BY e.owner_user_id
         ORDER BY totalCredits DESC, eventCount DESC
         LIMIT 5`
      )
      .all<TopOwnerRow>();

    const statusBreakdown: Record<ReferralStatus, number> = {
      pending: 0,
      verified: 0,
      paid: 0,
      cancelled: 0,
    };

    for (const row of statsRows.results ?? []) {
      if (row?.status && statusBreakdown[row.status] !== undefined) {
        statusBreakdown[row.status] = Number(row.count ?? 0);
      }
    }

    const summaryTotals = {
      totalEvents: Number(totals?.totalEvents ?? 0),
      totalCredits: Number(totals?.totalCredits ?? 0),
      ownerCount: Number(totals?.ownerCount ?? 0),
      referredCount: Number(totals?.referredCount ?? 0),
    } as const;

    const recentEvents = (recentEventsRows.results ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      referralCode: row.referralCode,
      creditsAwarded: normalizeCredits(row.creditsAwarded),
      occurredAt: normalizeTimestamp(row.occurredAt),
      owner: {
        userId: row.ownerUserId,
        email: row.ownerEmail ?? undefined,
        name: row.ownerName ?? undefined,
      },
      referred:
        row.referredUserId !== null
          ? {
              userId: row.referredUserId,
              email: row.referredEmail ?? undefined,
            }
          : null,
    }));

    const topOwners = (topOwnersRows.results ?? []).map((row) => ({
      userId: row.ownerUserId,
      email: row.ownerEmail ?? undefined,
      name: row.ownerName ?? undefined,
      eventCount: Number(row.eventCount ?? 0),
      totalCredits: Number(row.totalCredits ?? 0),
      lastEventAt: normalizeTimestamp(row.lastEventAt),
    }));

    return createApiSuccess({
      stats: {
        totals: summaryTotals,
        breakdown: statusBreakdown,
      },
      recentEvents,
      topOwners,
    });
  },
  {
    rateLimiter: apiRateLimiter,
    logMetadata: { action: 'admin_referrals_summary' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
