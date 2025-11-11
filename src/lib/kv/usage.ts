import type { KVNamespace } from '@cloudflare/workers-types';

const MIN_KV_TTL_SECONDS = 60;

export interface UsageCounter {
  count: number;
  resetAt: number;
}

export interface IncrementResult {
  allowed: boolean;
  usage: UsageCounter;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function endOfDayTtlSeconds(): number {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  const ttlMs = d.getTime() - Date.now();
  return Math.max(MIN_KV_TTL_SECONDS, Math.ceil(ttlMs / 1000));
}

function endOfMonthTtlSeconds(): number {
  const d = new Date();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const ttlMs = endOfMonth.getTime() - Date.now();
  return Math.max(MIN_KV_TTL_SECONDS, Math.ceil(ttlMs / 1000));
}

export async function getUsage(kv: KVNamespace, key: string): Promise<UsageCounter | null> {
  const json = await kv.get(key, 'json');
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  const count = typeof obj.count === 'number' ? (obj.count as number) : 0;
  const resetAt = typeof obj.resetAt === 'number' ? (obj.resetAt as number) : 0;
  return { count, resetAt };
}

export async function incrementWithTtl(
  kv: KVNamespace,
  key: string,
  limit: number,
  ttlSeconds: number
): Promise<IncrementResult> {
  const current = (await getUsage(kv, key)) || { count: 0, resetAt: nowSec() + ttlSeconds };
  const nextCount = current.count + 1;
  const usage: UsageCounter = { count: nextCount, resetAt: current.resetAt };
  await kv.put(key, JSON.stringify(usage), {
    expirationTtl: Math.max(MIN_KV_TTL_SECONDS, ttlSeconds),
  });
  return { allowed: nextCount <= limit, usage };
}

export function dailyKey(prefix: string, ownerType: string, ownerId: string): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${prefix}:daily:${y}-${m}-${day}:${ownerType}:${ownerId}`;
}

export function monthlyKey(prefix: string, ownerType: string, ownerId: string): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${prefix}:monthly:${y}-${m}:${ownerType}:${ownerId}`;
}

export async function incrementDaily(
  kv: KVNamespace,
  prefix: string,
  ownerType: string,
  ownerId: string,
  limit: number
): Promise<IncrementResult> {
  return incrementWithTtl(kv, dailyKey(prefix, ownerType, ownerId), limit, endOfDayTtlSeconds());
}

export async function incrementMonthly(
  kv: KVNamespace,
  prefix: string,
  ownerType: string,
  ownerId: string,
  limit: number
): Promise<IncrementResult> {
  return incrementWithTtl(
    kv,
    monthlyKey(prefix, ownerType, ownerId),
    limit,
    endOfMonthTtlSeconds()
  );
}

function endOfMonthUnixSeconds(): number {
  const d = new Date();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return Math.ceil(endOfMonth.getTime() / 1000);
}

export async function incrementRollingWindow(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<IncrementResult> {
  const existing = await getUsage(kv, key);
  const now = nowSec();
  let resetAt: number;
  let nextCount: number;
  let ttl: number;

  if (!existing || now >= existing.resetAt) {
    resetAt = now + windowSeconds;
    nextCount = 1;
    ttl = windowSeconds;
  } else {
    resetAt = existing.resetAt;
    nextCount = existing.count + 1;
    ttl = Math.max(MIN_KV_TTL_SECONDS, resetAt - now);
  }

  const usage: UsageCounter = { count: nextCount, resetAt };
  await kv.put(key, JSON.stringify(usage), {
    expirationTtl: Math.max(MIN_KV_TTL_SECONDS, ttl),
  });
  return { allowed: nextCount <= limit, usage };
}

export function rollingDailyKey(prefix: string, ownerType: string, ownerId: string): string {
  return `${prefix}:usage:${ownerType}:${ownerId}`;
}

export async function incrementDailyRolling(
  kv: KVNamespace,
  prefix: string,
  ownerType: string,
  ownerId: string,
  limit: number,
  windowSeconds = 24 * 60 * 60
): Promise<IncrementResult> {
  return incrementRollingWindow(
    kv,
    rollingDailyKey(prefix, ownerType, ownerId),
    limit,
    windowSeconds
  );
}

export function legacyMonthlyKey(prefix: string, ownerType: string, ownerId: string): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${prefix}:usage:month:${ownerType}:${ownerId}:${y}${m}`;
}

export async function incrementMonthlyNoTtl(
  kv: KVNamespace,
  prefix: string,
  ownerType: string,
  ownerId: string,
  limit: number
): Promise<IncrementResult> {
  const key = legacyMonthlyKey(prefix, ownerType, ownerId);
  const raw = await kv.get(key, 'json');
  const obj = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null) || {
    count: 0,
  };
  const current = (obj as { count?: unknown }).count;
  const nextCount = (typeof current === 'number' ? (current as number) : 0) + 1;
  await kv.put(key, JSON.stringify({ count: nextCount }));
  const usage: UsageCounter = { count: nextCount, resetAt: endOfMonthUnixSeconds() };
  return { allowed: nextCount <= limit, usage };
}

// ---- Credit Packs (tenths-based), FIFO, expiry, idempotent consumption ----
// We store packs as a single JSON array per user to avoid KV list operations.
// Units are represented in tenths (1.0 credit == 10 tenths) to avoid float issues.
export interface CreditPack {
  id: string; // e.g., Stripe session id
  unitsTenths: number; // remaining units in tenths
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

export interface CreditConsumptionBreakdown {
  packId: string;
  usedTenths: number;
}

export interface CreditConsumptionResult {
  totalRequestedTenths: number;
  totalConsumedTenths: number;
  remainingTenths: number; // total across all active packs after consumption
  breakdown: CreditConsumptionBreakdown[];
  idempotent: boolean; // true if an existing record was returned
}

function packsKey(userId: string): string {
  return `ai:credits:user:${userId}:packs`;
}

function consumeRecordKey(userId: string, jobId: string): string {
  return `ai:credits:consume:${userId}:${jobId}`;
}

function addMonthsWithGrace(startMs: number, months = 6, graceDays = 14): number {
  const d = new Date(startMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const base = Date.UTC(
    y,
    m + months,
    day,
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
  const graceMs = graceDays * 24 * 60 * 60 * 1000;
  return base + graceMs;
}

async function readPacks(kv: KVNamespace, userId: string): Promise<CreditPack[]> {
  const raw = await kv.get(packsKey(userId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as CreditPack[]) : [];
  } catch {
    return [];
  }
}

async function writePacks(kv: KVNamespace, userId: string, packs: CreditPack[]): Promise<void> {
  await kv.put(packsKey(userId), JSON.stringify(packs));
}

export async function addCreditPackTenths(
  kv: KVNamespace,
  userId: string,
  packId: string,
  unitsTenths: number,
  createdAtMs?: number
): Promise<CreditPack[]> {
  const createdAt = typeof createdAtMs === 'number' ? createdAtMs : Date.now();
  const expiresAt = addMonthsWithGrace(createdAt, 6, 14);
  const packs = await readPacks(kv, userId);
  // idempotent on packId
  if (!packs.some((p) => p.id === packId)) {
    packs.push({
      id: packId,
      unitsTenths: Math.max(0, Math.round(unitsTenths)),
      createdAt,
      expiresAt,
    });
    await writePacks(kv, userId, packs);
  }
  return packs;
}

export async function listActiveCreditPacksTenths(
  kv: KVNamespace,
  userId: string,
  nowMs = Date.now()
): Promise<CreditPack[]> {
  const packs = await readPacks(kv, userId);
  return packs
    .filter((p) => p.unitsTenths > 0 && p.expiresAt > nowMs)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getCreditsBalanceTenths(
  kv: KVNamespace,
  userId: string,
  nowMs = Date.now()
): Promise<number> {
  const packs = await listActiveCreditPacksTenths(kv, userId, nowMs);
  return packs.reduce((sum, p) => sum + (p.unitsTenths || 0), 0);
}

export async function consumeCreditsTenths(
  kv: KVNamespace,
  userId: string,
  amountTenths: number,
  jobId: string,
  nowMs = Date.now()
): Promise<CreditConsumptionResult> {
  const amt = Math.max(0, Math.round(amountTenths));
  // Idempotency check
  const recordKey = consumeRecordKey(userId, jobId);
  const existing = await kv.get(recordKey);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as CreditConsumptionResult;
      return { ...parsed, idempotent: true };
    } catch {
      // fallthrough to recompute
    }
  }

  let remainingToConsume = amt;
  const packs = await listActiveCreditPacksTenths(kv, userId, nowMs);
  const breakdown: CreditConsumptionBreakdown[] = [];

  for (const p of packs) {
    if (remainingToConsume <= 0) break;
    const take = Math.min(p.unitsTenths, remainingToConsume);
    if (take > 0) {
      p.unitsTenths -= take;
      remainingToConsume -= take;
      breakdown.push({ packId: p.id, usedTenths: take });
    }
  }

  // Persist updated packs
  const fullList = await readPacks(kv, userId);
  const updated = fullList.map((p) => {
    const changed = breakdown.find((b) => b.packId === p.id);
    return changed ? { ...p, unitsTenths: Math.max(0, p.unitsTenths - changed.usedTenths) } : p;
  });
  await writePacks(kv, userId, updated);

  const totalConsumedTenths = amt - remainingToConsume;
  const remainingTenths = await getCreditsBalanceTenths(kv, userId, nowMs);
  const result: CreditConsumptionResult = {
    totalRequestedTenths: amt,
    totalConsumedTenths,
    remainingTenths,
    breakdown,
    idempotent: false,
  };
  await kv.put(recordKey, JSON.stringify(result));
  return result;
}

// ---- Video monthly quota (tenths-based) ----
// We keep a separate counter per user and calendar month measured in tenths of a credit.
// Idempotency is enforced via a tx key tied to the month and job id.

function videoMonthlyQuotaKey(userId: string, ym: string): string {
  // ym format: YYYYMM (UTC)
  return `ai:quota:video:tenths:${userId}:${ym}`;
}

function videoMonthlyQuotaTxKey(userId: string, ym: string, txKey: string): string {
  return `ai:quota:video:tx:${userId}:${ym}:${txKey}`;
}

export async function getVideoMonthlyQuotaRemainingTenths(
  kv: KVNamespace,
  userId: string,
  limitTenths: number,
  ym: string
): Promise<number> {
  const key = videoMonthlyQuotaKey(userId, ym);
  const raw = await kv.get(key);
  let used = 0;
  if (raw) {
    const n = parseInt(raw, 10);
    used = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return Math.max(0, limitTenths - used);
}

export async function consumeVideoMonthlyQuotaTenths(
  kv: KVNamespace,
  userId: string,
  limitTenths: number,
  amountTenths: number,
  ym: string,
  txKey: string
): Promise<void> {
  const tx = videoMonthlyQuotaTxKey(userId, ym, txKey);
  const existing = await kv.get(tx);
  if (existing) return; // idempotent

  const key = videoMonthlyQuotaKey(userId, ym);
  const raw = await kv.get(key);
  let used = 0;
  if (raw) {
    const n = parseInt(raw, 10);
    used = Number.isFinite(n) && n > 0 ? n : 0;
  }
  const amt = Math.max(0, Math.round(amountTenths));
  const next = used + amt;
  if (next > Math.max(0, Math.round(limitTenths))) {
    throw new Error('insufficient_quota');
  }
  await kv.put(key, String(next));
  await kv.put(tx, '1');
}
