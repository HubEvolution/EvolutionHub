"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsage = getUsage;
exports.incrementWithTtl = incrementWithTtl;
exports.dailyKey = dailyKey;
exports.monthlyKey = monthlyKey;
exports.incrementDaily = incrementDaily;
exports.incrementMonthly = incrementMonthly;
exports.incrementRollingWindow = incrementRollingWindow;
exports.rollingDailyKey = rollingDailyKey;
exports.incrementDailyRolling = incrementDailyRolling;
exports.legacyMonthlyKey = legacyMonthlyKey;
exports.incrementMonthlyNoTtl = incrementMonthlyNoTtl;
exports.addCreditPackTenths = addCreditPackTenths;
exports.listActiveCreditPacksTenths = listActiveCreditPacksTenths;
exports.getCreditsBalanceTenths = getCreditsBalanceTenths;
exports.consumeCreditsTenths = consumeCreditsTenths;
exports.getVideoMonthlyQuotaRemainingTenths = getVideoMonthlyQuotaRemainingTenths;
exports.consumeVideoMonthlyQuotaTenths = consumeVideoMonthlyQuotaTenths;
function nowSec() {
    return Math.floor(Date.now() / 1000);
}
function endOfDayTtlSeconds() {
    const d = new Date();
    d.setUTCHours(23, 59, 59, 999);
    const ttlMs = d.getTime() - Date.now();
    return Math.max(1, Math.ceil(ttlMs / 1000));
}
function endOfMonthTtlSeconds() {
    const d = new Date();
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const ttlMs = endOfMonth.getTime() - Date.now();
    return Math.max(1, Math.ceil(ttlMs / 1000));
}
async function getUsage(kv, key) {
    const json = await kv.get(key, 'json');
    if (!json || typeof json !== 'object')
        return null;
    const obj = json;
    const count = typeof obj.count === 'number' ? obj.count : 0;
    const resetAt = typeof obj.resetAt === 'number' ? obj.resetAt : 0;
    return { count, resetAt };
}
async function incrementWithTtl(kv, key, limit, ttlSeconds) {
    const current = (await getUsage(kv, key)) || { count: 0, resetAt: nowSec() + ttlSeconds };
    const nextCount = current.count + 1;
    const usage = { count: nextCount, resetAt: current.resetAt };
    await kv.put(key, JSON.stringify(usage), { expirationTtl: ttlSeconds });
    return { allowed: nextCount <= limit, usage };
}
function dailyKey(prefix, ownerType, ownerId) {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${prefix}:daily:${y}-${m}-${day}:${ownerType}:${ownerId}`;
}
function monthlyKey(prefix, ownerType, ownerId) {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${prefix}:monthly:${y}-${m}:${ownerType}:${ownerId}`;
}
async function incrementDaily(kv, prefix, ownerType, ownerId, limit) {
    return incrementWithTtl(kv, dailyKey(prefix, ownerType, ownerId), limit, endOfDayTtlSeconds());
}
async function incrementMonthly(kv, prefix, ownerType, ownerId, limit) {
    return incrementWithTtl(kv, monthlyKey(prefix, ownerType, ownerId), limit, endOfMonthTtlSeconds());
}
function endOfMonthUnixSeconds() {
    const d = new Date();
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    return Math.ceil(endOfMonth.getTime() / 1000);
}
async function incrementRollingWindow(kv, key, limit, windowSeconds) {
    const existing = await getUsage(kv, key);
    const now = nowSec();
    let resetAt;
    let nextCount;
    let ttl;
    if (!existing || now >= existing.resetAt) {
        resetAt = now + windowSeconds;
        nextCount = 1;
        ttl = windowSeconds;
    }
    else {
        resetAt = existing.resetAt;
        nextCount = existing.count + 1;
        ttl = Math.max(1, resetAt - now);
    }
    const usage = { count: nextCount, resetAt };
    await kv.put(key, JSON.stringify(usage), { expirationTtl: ttl });
    return { allowed: nextCount <= limit, usage };
}
function rollingDailyKey(prefix, ownerType, ownerId) {
    return `${prefix}:usage:${ownerType}:${ownerId}`;
}
async function incrementDailyRolling(kv, prefix, ownerType, ownerId, limit, windowSeconds = 24 * 60 * 60) {
    return incrementRollingWindow(kv, rollingDailyKey(prefix, ownerType, ownerId), limit, windowSeconds);
}
function legacyMonthlyKey(prefix, ownerType, ownerId) {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${prefix}:usage:month:${ownerType}:${ownerId}:${y}${m}`;
}
async function incrementMonthlyNoTtl(kv, prefix, ownerType, ownerId, limit) {
    const key = legacyMonthlyKey(prefix, ownerType, ownerId);
    const raw = await kv.get(key, 'json');
    const obj = (raw && typeof raw === 'object' ? raw : null) || {
        count: 0,
    };
    const current = obj.count;
    const nextCount = (typeof current === 'number' ? current : 0) + 1;
    await kv.put(key, JSON.stringify({ count: nextCount }));
    const usage = { count: nextCount, resetAt: endOfMonthUnixSeconds() };
    return { allowed: nextCount <= limit, usage };
}
function packsKey(userId) {
    return `ai:credits:user:${userId}:packs`;
}
function consumeRecordKey(userId, jobId) {
    return `ai:credits:consume:${userId}:${jobId}`;
}
function addMonthsWithGrace(startMs, months = 6, graceDays = 14) {
    const d = new Date(startMs);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const base = Date.UTC(y, m + months, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
    const graceMs = graceDays * 24 * 60 * 60 * 1000;
    return base + graceMs;
}
async function readPacks(kv, userId) {
    const raw = await kv.get(packsKey(userId));
    if (!raw)
        return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    }
    catch {
        return [];
    }
}
async function writePacks(kv, userId, packs) {
    await kv.put(packsKey(userId), JSON.stringify(packs));
}
async function addCreditPackTenths(kv, userId, packId, unitsTenths, createdAtMs) {
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
async function listActiveCreditPacksTenths(kv, userId, nowMs = Date.now()) {
    const packs = await readPacks(kv, userId);
    return packs
        .filter((p) => p.unitsTenths > 0 && p.expiresAt > nowMs)
        .sort((a, b) => a.createdAt - b.createdAt);
}
async function getCreditsBalanceTenths(kv, userId, nowMs = Date.now()) {
    const packs = await listActiveCreditPacksTenths(kv, userId, nowMs);
    return packs.reduce((sum, p) => sum + (p.unitsTenths || 0), 0);
}
async function consumeCreditsTenths(kv, userId, amountTenths, jobId, nowMs = Date.now()) {
    const amt = Math.max(0, Math.round(amountTenths));
    // Idempotency check
    const recordKey = consumeRecordKey(userId, jobId);
    const existing = await kv.get(recordKey);
    if (existing) {
        try {
            const parsed = JSON.parse(existing);
            return { ...parsed, idempotent: true };
        }
        catch {
            // fallthrough to recompute
        }
    }
    let remainingToConsume = amt;
    const packs = await listActiveCreditPacksTenths(kv, userId, nowMs);
    const breakdown = [];
    for (const p of packs) {
        if (remainingToConsume <= 0)
            break;
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
    const result = {
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
function videoMonthlyQuotaKey(userId, ym) {
    // ym format: YYYYMM (UTC)
    return `ai:quota:video:tenths:${userId}:${ym}`;
}
function videoMonthlyQuotaTxKey(userId, ym, txKey) {
    return `ai:quota:video:tx:${userId}:${ym}:${txKey}`;
}
async function getVideoMonthlyQuotaRemainingTenths(kv, userId, limitTenths, ym) {
    const key = videoMonthlyQuotaKey(userId, ym);
    const raw = await kv.get(key);
    let used = 0;
    if (raw) {
        const n = parseInt(raw, 10);
        used = Number.isFinite(n) && n > 0 ? n : 0;
    }
    return Math.max(0, limitTenths - used);
}
async function consumeVideoMonthlyQuotaTenths(kv, userId, limitTenths, amountTenths, ym, txKey) {
    const tx = videoMonthlyQuotaTxKey(userId, ym, txKey);
    const existing = await kv.get(tx);
    if (existing)
        return; // idempotent
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
