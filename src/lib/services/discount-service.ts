import type { D1Database } from '@cloudflare/workers-types';

export type DiscountCodeType = 'percentage' | 'fixed';
export type DiscountCodeStatus = 'active' | 'inactive' | 'expired';

export interface DbDiscountCode {
  id: string;
  code: string;
  stripe_coupon_id: string;
  type: DiscountCodeType;
  value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: number | null;
  valid_until: number | null;
  status: DiscountCodeStatus;
  description: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateDiscountCodeInput {
  code: string;
  stripeCouponId?: string;
  type: DiscountCodeType;
  value: number;
  maxUses?: number | null;
  validFrom?: number | null;
  validUntil?: number | null;
  description?: string | null;
  status?: DiscountCodeStatus;
  createdBy: string | null;
}

export interface ListDiscountCodesParams {
  status?: DiscountCodeStatus;
  limit: number;
  cursorCreatedAt?: number | null;
}

export interface ListDiscountCodesResult {
  items: DbDiscountCode[];
  hasMore: boolean;
  nextCursor: number | null;
}

function normalizeTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return Date.now();
}

export async function createDiscountCode(
  db: D1Database,
  input: CreateDiscountCodeInput
): Promise<DbDiscountCode> {
  const now = Date.now();
  const id = crypto.randomUUID();

  const maxUses = typeof input.maxUses === 'number' ? input.maxUses : null;
  const validFrom = typeof input.validFrom === 'number' ? input.validFrom : null;
  const validUntil = typeof input.validUntil === 'number' ? input.validUntil : null;
  const description = input.description ?? null;
  const status: DiscountCodeStatus = input.status ?? 'active';
  const stripeCouponId = typeof input.stripeCouponId === 'string' ? input.stripeCouponId : '';

  await db
    .prepare(
      `INSERT INTO discount_codes (
        id,
        code,
        stripe_coupon_id,
        type,
        value,
        max_uses,
        uses_count,
        valid_from,
        valid_until,
        status,
        description,
        created_by,
        created_at,
        updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
    )
    .bind(
      id,
      input.code,
      stripeCouponId,
      input.type,
      input.value,
      maxUses,
      validFrom,
      validUntil,
      status,
      description,
      input.createdBy,
      now,
      now
    )
    .run();

  return {
    id,
    code: input.code,
    stripe_coupon_id: stripeCouponId,
    type: input.type,
    value: input.value,
    max_uses: maxUses,
    uses_count: 0,
    valid_from: validFrom,
    valid_until: validUntil,
    status,
    description,
    created_by: input.createdBy,
    created_at: now,
    updated_at: now,
  };
}

export async function listDiscountCodes(
  db: D1Database,
  params: ListDiscountCodesParams
): Promise<ListDiscountCodesResult> {
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (params.status) {
    conditions.push('status = ?');
    bindings.push(params.status);
  }

  if (typeof params.cursorCreatedAt === 'number') {
    conditions.push('created_at < ?');
    bindings.push(params.cursorCreatedAt);
  }

  let sql = 'SELECT * FROM discount_codes';
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  bindings.push(params.limit + 1);

  const result = await db
    .prepare(sql)
    .bind(...bindings)
    .all<DbDiscountCode>();
  const rows = result.results ?? [];

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;

  let nextCursor: number | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = normalizeTimestamp(last.created_at);
  }

  return {
    items,
    hasMore,
    nextCursor,
  };
}

export async function applyDiscountUsage(
  db: D1Database,
  params: { code: string; now?: number }
): Promise<void> {
  const ts =
    typeof params.now === 'number' && Number.isFinite(params.now)
      ? Math.trunc(params.now)
      : Date.now();

  await db
    .prepare(
      `UPDATE discount_codes
       SET uses_count = uses_count + 1,
           status = CASE
                      WHEN max_uses IS NOT NULL AND uses_count + 1 >= max_uses THEN 'expired'
                      ELSE status
                    END,
           updated_at = ?
       WHERE code = ?
         AND status = 'active'
         AND (max_uses IS NULL OR uses_count < max_uses)
         AND (valid_from IS NULL OR valid_from <= ?)
         AND (valid_until IS NULL OR valid_until >= ?)`
    )
    .bind(ts, params.code, ts, ts)
    .run();
}

export async function getActiveDiscountForCheckout(
  db: D1Database,
  params: { code: string; now?: number }
): Promise<DbDiscountCode | null> {
  const ts =
    typeof params.now === 'number' && Number.isFinite(params.now)
      ? Math.trunc(params.now)
      : Date.now();

  const result = await db
    .prepare(
      `SELECT * FROM discount_codes
       WHERE code = ?
         AND status = 'active'
         AND (max_uses IS NULL OR uses_count < max_uses)
         AND (valid_from IS NULL OR valid_from <= ?)
         AND (valid_until IS NULL OR valid_until >= ?)
       LIMIT 1`
    )
    .bind(params.code, ts, ts)
    .first<DbDiscountCode>();

  return result ?? null;
}

export async function getDiscountCodeById(
  db: D1Database,
  id: string
): Promise<DbDiscountCode | null> {
  const row = await db
    .prepare('SELECT * FROM discount_codes WHERE id = ? LIMIT 1')
    .bind(id)
    .first<DbDiscountCode>();

  return row ?? null;
}
