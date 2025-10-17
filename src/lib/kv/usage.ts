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
  return Math.max(1, Math.ceil(ttlMs / 1000));
}

function endOfMonthTtlSeconds(): number {
  const d = new Date();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const ttlMs = endOfMonth.getTime() - Date.now();
  return Math.max(1, Math.ceil(ttlMs / 1000));
}

export async function getUsage(kv: KVNamespace, key: string): Promise<UsageCounter | null> {
  const json = await kv.get(key, { type: 'json' });
  if (!json || typeof json !== 'object') return null;
  const obj = json as any;
  const count = typeof obj.count === 'number' ? obj.count : 0;
  const resetAt = typeof obj.resetAt === 'number' ? obj.resetAt : 0;
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
  await kv.put(key, JSON.stringify(usage), { expirationTtl: ttlSeconds });
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
    ttl = Math.max(1, resetAt - now);
  }

  const usage: UsageCounter = { count: nextCount, resetAt };
  await kv.put(key, JSON.stringify(usage), { expirationTtl: ttl });
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
  const raw = await kv.get(key, { type: 'json' });
  const obj = (raw && typeof raw === 'object' ? (raw as any) : null) || { count: 0 };
  const nextCount = (typeof obj.count === 'number' ? obj.count : 0) + 1;
  await kv.put(key, JSON.stringify({ count: nextCount }));
  const usage: UsageCounter = { count: nextCount, resetAt: endOfMonthUnixSeconds() };
  return { allowed: nextCount <= limit, usage };
}
