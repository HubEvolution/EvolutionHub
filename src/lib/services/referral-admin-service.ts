import type { D1Database } from '@cloudflare/workers-types';
import { sanitizeReferralCode } from '@/lib/referrals/utils';

const REFERRAL_STATUSES = ['pending', 'verified', 'paid', 'cancelled'] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export interface ReferralAdminListInput {
  status?: ReferralStatus | 'all' | string | null;
  ownerUserId?: string | null;
  referralCode?: string | null;
  limit?: number | null;
  offset?: number | null;
  cursor?: number | null;
}

export interface ReferralAdminListFilters {
  status: ReferralStatus | 'all';
  ownerUserId?: string;
  referralCode?: string;
  limit: number;
  offset: number;
  cursor?: number;
}

export interface ReferralAdminEvent {
  id: string;
  status: ReferralStatus;
  referralCode: string;
  occurredAt: number;
  createdAt: number;
  updatedAt: number;
  creditsAwarded: number;
  owner: {
    userId: string;
    email?: string;
    name?: string;
  };
  referred: null | {
    userId: string;
    email?: string;
    name?: string;
  };
  metadata: Record<string, unknown> | null;
}

export interface ReferralAdminListResult {
  events: ReferralAdminEvent[];
  stats: {
    total: number;
    pending: number;
    verified: number;
    paid: number;
    cancelled: number;
  };
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
    nextCursor: number | null;
  };
  filters: ReferralAdminListFilters;
}

interface ReferralEventRow {
  id: string;
  status: ReferralStatus;
  referralCode: string;
  ownerUserId: string;
  referredUserId: string | null;
  creditsAwarded: number | null;
  metadata: string | null;
  occurredAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  ownerEmail: string | null;
  ownerName: string | null;
  referredEmail: string | null;
  referredName: string | null;
}

interface StatsRow {
  status: ReferralStatus;
  count: number;
}

function normalizeStatus(
  status: ReferralStatus | 'all' | null | undefined
): ReferralStatus | 'all' {
  if (!status) {
    return 'all';
  }
  if (status === 'all') {
    return 'all';
  }
  if (REFERRAL_STATUSES.includes(status)) {
    return status;
  }
  return 'all';
}

function clampLimit(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  const num = Math.trunc(Number(value));
  if (Number.isNaN(num)) {
    return 50;
  }
  return Math.max(1, Math.min(100, num));
}

function clampOffset(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const num = Math.trunc(Number(value));
  if (Number.isNaN(num) || num < 0) {
    return 0;
  }
  return num;
}

function parseCursor(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const num = Math.trunc(Number(value));
  return Number.isNaN(num) ? undefined : num;
}

function normalizeTimestamp(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function buildWhereClause(filters: {
  status: ReferralStatus | 'all';
  ownerUserId?: string;
  referralCode?: string;
  cursor?: number;
}): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (filters.status !== 'all') {
    parts.push('e.status = ?');
    params.push(filters.status);
  }

  if (filters.ownerUserId) {
    parts.push('e.owner_user_id = ?');
    params.push(filters.ownerUserId);
  }

  if (filters.referralCode) {
    parts.push('e.referral_code = ?');
    params.push(filters.referralCode);
  }

  if (typeof filters.cursor === 'number') {
    parts.push('e.occurred_at < ?');
    params.push(filters.cursor);
  }

  if (parts.length === 0) {
    return { clause: '', params };
  }

  return { clause: `WHERE ${parts.join(' AND ')}`, params };
}

export async function listReferralEventsForAdmin(
  db: D1Database,
  input: ReferralAdminListInput
): Promise<ReferralAdminListResult> {
  const rawStatus = (input.status as ReferralStatus | 'all' | null | undefined) ?? null;
  const status = normalizeStatus(rawStatus);
  const ownerUserId = input.ownerUserId?.trim() || undefined;
  const limit = clampLimit(input.limit ?? null);
  const offset = clampOffset(input.offset ?? null);
  const cursor = parseCursor(input.cursor ?? null);

  let referralCode: string | undefined;
  if (input.referralCode) {
    const sanitized = sanitizeReferralCode(input.referralCode);
    if (!sanitized) {
      const error = new Error('Invalid referralCode');
      (error as Error & { apiErrorType: string }).apiErrorType = 'validation_error';
      throw error;
    }
    referralCode = sanitized;
  }

  const where = buildWhereClause({ status, ownerUserId, referralCode, cursor });

  const totalRow = await db
    .prepare(`SELECT COUNT(*) as count FROM referral_events e ${where.clause}`)
    .bind(...where.params)
    .first<{ count: number }>();
  const total = Number(totalRow?.count ?? 0);

  const statsRows = await db
    .prepare(
      `SELECT e.status AS status, COUNT(*) as count
       FROM referral_events e
       ${where.clause}
       GROUP BY e.status`
    )
    .bind(...where.params)
    .all<StatsRow>();

  const stats: ReferralAdminListResult['stats'] = {
    total,
    pending: 0,
    verified: 0,
    paid: 0,
    cancelled: 0,
  };

  for (const row of statsRows.results ?? []) {
    const rowStatus = row.status;
    if (rowStatus && stats[rowStatus] !== undefined) {
      stats[rowStatus] = Number(row.count ?? 0);
    }
  }

  const rows = await db
    .prepare(
      `SELECT
         e.id,
         e.status,
         e.referral_code AS referralCode,
         e.owner_user_id AS ownerUserId,
         e.referred_user_id AS referredUserId,
         e.credits_awarded AS creditsAwarded,
         e.metadata,
         e.occurred_at AS occurredAt,
         e.created_at AS createdAt,
         e.updated_at AS updatedAt,
         owner.email AS ownerEmail,
         owner.name AS ownerName,
         referred.email AS referredEmail,
         referred.name AS referredName
       FROM referral_events e
       LEFT JOIN users owner ON owner.id = e.owner_user_id
       LEFT JOIN users referred ON referred.id = e.referred_user_id
       ${where.clause}
       ORDER BY e.occurred_at DESC, e.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...where.params, limit, offset)
    .all<ReferralEventRow>();

  const events: ReferralAdminEvent[] = (rows.results ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    referralCode: row.referralCode,
    occurredAt: normalizeTimestamp(row.occurredAt),
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
    creditsAwarded: Number(row.creditsAwarded ?? 0),
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
            name: row.referredName ?? undefined,
          }
        : null,
    metadata: parseMetadata(row.metadata),
  }));

  const nextCursor = events.length > 0 ? events[events.length - 1].occurredAt : null;

  return {
    events,
    stats,
    pagination: {
      limit,
      offset,
      count: events.length,
      total,
      nextCursor,
    },
    filters: {
      status,
      ownerUserId,
      referralCode,
      limit,
      offset,
      cursor,
    },
  };
}
