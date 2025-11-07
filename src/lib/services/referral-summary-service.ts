import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, count, sql } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { referralEvents } from '@/lib/db/schema';

export type ReferralEventStatus = 'pending' | 'verified' | 'paid' | 'cancelled';

export interface ReferralStatsSummary {
  referredTotal: number;
  verified: number;
  paid: number;
  pending: number;
  cancelled: number;
  totalCredits: number;
}

export interface ReferralEventListItem {
  id: string;
  status: ReferralEventStatus;
  occurredAt: number;
  creditsAwarded: number;
}

export interface ReferralSummaryResult {
  stats: ReferralStatsSummary;
  recentEvents: ReferralEventListItem[];
}

function normalizeCount(records: Array<{ status: ReferralEventStatus; count: number | bigint }>) {
  const result = {
    total: 0,
    pending: 0,
    verified: 0,
    paid: 0,
    cancelled: 0,
  } satisfies Record<'total' | ReferralEventStatus, number>;

  for (const record of records) {
    const countValue = Number(record.count ?? 0);
    result.total += countValue;
    result[record.status] = countValue;
  }

  return result;
}

export async function getReferralStats(
  db: D1Database,
  userId: string
): Promise<ReferralStatsSummary> {
  const client = drizzle(db);

  const counts = await client
    .select({
      status: referralEvents.status,
      count: count().as('count'),
    })
    .from(referralEvents)
    .where(eq(referralEvents.ownerUserId, userId))
    .groupBy(referralEvents.status);

  const normalized = normalizeCount(counts);

  const creditsRow = await client
    .select({
      totalCredits: sql<number>`COALESCE(SUM(${referralEvents.creditsAwarded}), 0)`,
    })
    .from(referralEvents)
    .where(eq(referralEvents.ownerUserId, userId))
    .limit(1);

  const totalCredits = Number(creditsRow[0]?.totalCredits ?? 0);

  return {
    referredTotal: normalized.total,
    pending: normalized.pending,
    verified: normalized.verified,
    paid: normalized.paid,
    cancelled: normalized.cancelled,
    totalCredits,
  };
}

export async function getRecentReferralEvents(
  db: D1Database,
  userId: string,
  limit = 5
): Promise<ReferralEventListItem[]> {
  const client = drizzle(db);

  const rows = await client
    .select({
      id: referralEvents.id,
      status: referralEvents.status,
      occurredAt: referralEvents.occurredAt,
      creditsAwarded: referralEvents.creditsAwarded,
    })
    .from(referralEvents)
    .where(eq(referralEvents.ownerUserId, userId))
    .orderBy(desc(referralEvents.occurredAt), desc(referralEvents.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    status: row.status as ReferralEventStatus,
    occurredAt: row.occurredAt,
    creditsAwarded: row.creditsAwarded ?? 0,
  }));
}

export async function getReferralSummary(
  db: D1Database,
  userId: string,
  options: { recentLimit?: number } = {}
): Promise<ReferralSummaryResult> {
  const [stats, recentEvents] = await Promise.all([
    getReferralStats(db, userId),
    getRecentReferralEvents(db, userId, options.recentLimit ?? 5),
  ]);

  return {
    stats,
    recentEvents,
  };
}
