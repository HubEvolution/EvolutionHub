"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const usage_1 = require("./usage");
class FakeKV {
    constructor() {
        this.store = new Map();
    }
    async get(key, opts) {
        const rec = this.store.get(key);
        if (!rec)
            return null;
        const type = typeof opts === 'string' ? opts : opts?.type;
        if (type === 'json')
            return JSON.parse(rec.value);
        return rec.value;
    }
    async put(key, value, options) {
        const v = typeof value === 'string' ? value : String(value);
        this.store.set(key, { value: v, expirationTtl: options?.expirationTtl });
        this.lastPut = { key, expirationTtl: options?.expirationTtl };
    }
    async delete(key) {
        this.store.delete(key);
    }
}
function utcEndOfDaySeconds(d = new Date()) {
    const eod = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
    return Math.ceil(eod.getTime() / 1000);
}
function utcEndOfMonthSeconds(d = new Date()) {
    const eom = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return Math.ceil(eom.getTime() / 1000);
}
function nowSec() {
    return Math.floor(Date.now() / 1000);
}
(0, vitest_1.describe)('kv/usage key builders', () => {
    (0, vitest_1.it)('dailyKey formats with UTC date', () => {
        const key = (0, usage_1.dailyKey)('x', 'user', 'u1');
        (0, vitest_1.expect)(key).toMatch(/^x:daily:\d{4}-\d{2}-\d{2}:user:u1$/);
    });
    (0, vitest_1.it)('monthlyKey formats with UTC year-month', () => {
        const key = (0, usage_1.monthlyKey)('x', 'guest', 'g1');
        (0, vitest_1.expect)(key).toMatch(/^x:monthly:\d{4}-\d{2}:guest:g1$/);
    });
    (0, vitest_1.it)('rollingDailyKey uses stable usage prefix', () => {
        const key = (0, usage_1.rollingDailyKey)('voice', 'guest', 'anon');
        (0, vitest_1.expect)(key).toBe('voice:usage:guest:anon');
    });
});
(0, vitest_1.describe)('incrementDaily (EOD TTL semantics)', () => {
    (0, vitest_1.it)('sets resetAt to UTC EOD and TTL ~ seconds until EOD', async () => {
        const kvImpl = new FakeKV();
        const kv = kvImpl;
        const before = nowSec();
        const res = await (0, usage_1.incrementDaily)(kv, 'test', 'user', 'u1', 10);
        const after = nowSec();
        const eod = utcEndOfDaySeconds();
        (0, vitest_1.expect)(res.usage.count).toBe(1);
        (0, vitest_1.expect)(res.usage.resetAt).toBeGreaterThanOrEqual(eod - 2);
        (0, vitest_1.expect)(res.usage.resetAt).toBeLessThanOrEqual(eod + 2);
        const ttl = kvImpl.lastPut?.expirationTtl ?? 0;
        const remainingLower = eod - after - 2;
        const remainingUpper = eod - before + 2;
        (0, vitest_1.expect)(ttl).toBeGreaterThanOrEqual(Math.max(1, remainingLower));
        (0, vitest_1.expect)(ttl).toBeLessThanOrEqual(Math.max(1, remainingUpper));
        const res2 = await (0, usage_1.incrementDaily)(kv, 'test', 'user', 'u1', 10);
        (0, vitest_1.expect)(res2.usage.count).toBe(2);
        (0, vitest_1.expect)(res2.usage.resetAt).toBe(res.usage.resetAt);
        const ttl2 = kvImpl.lastPut?.expirationTtl ?? 0;
        (0, vitest_1.expect)(ttl2).toBeLessThanOrEqual(ttl);
    });
});
(0, vitest_1.describe)('incrementDailyRolling (rolling 24h semantics)', () => {
    (0, vitest_1.it)('starts new 24h window and keeps resetAt stable within window', async () => {
        const kvImpl = new FakeKV();
        const kv = kvImpl;
        const start = nowSec();
        const res = await (0, usage_1.incrementDailyRolling)(kv, 'prompt', 'guest', 'g1', 3);
        (0, vitest_1.expect)(res.usage.count).toBe(1);
        (0, vitest_1.expect)(res.usage.resetAt).toBeGreaterThanOrEqual(start + 24 * 60 * 60 - 2);
        (0, vitest_1.expect)(res.usage.resetAt).toBeLessThanOrEqual(start + 24 * 60 * 60 + 2);
        const res2 = await (0, usage_1.incrementDailyRolling)(kv, 'prompt', 'guest', 'g1', 3);
        (0, vitest_1.expect)(res2.usage.count).toBe(2);
        (0, vitest_1.expect)(res2.usage.resetAt).toBe(res.usage.resetAt);
        const ttl1 = kvImpl.lastPut?.expirationTtl ?? 0;
        (0, vitest_1.expect)(ttl1).toBeLessThanOrEqual(res.usage.resetAt - nowSec());
    });
});
(0, vitest_1.describe)('incrementMonthly (EOM TTL semantics)', () => {
    (0, vitest_1.it)('uses monthly key and EOM TTL', async () => {
        const kvImpl = new FakeKV();
        const kv = kvImpl;
        const res = await (0, usage_1.incrementMonthly)(kv, 'img', 'user', 'u2', 100);
        (0, vitest_1.expect)(res.usage.count).toBe(1);
        const eom = utcEndOfMonthSeconds();
        (0, vitest_1.expect)(res.usage.resetAt).toBeGreaterThanOrEqual(eom - 2);
        (0, vitest_1.expect)(res.usage.resetAt).toBeLessThanOrEqual(eom + 2);
        (0, vitest_1.expect)(kvImpl.lastPut?.expirationTtl).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('incrementMonthlyNoTtl (legacy monthly without TTL)', () => {
    (0, vitest_1.it)('stores only {count} without expiration and returns usage with EOM resetAt', async () => {
        const kvImpl = new FakeKV();
        const kv = kvImpl;
        const res = await (0, usage_1.incrementMonthlyNoTtl)(kv, 'img', 'user', 'u3', 100);
        (0, vitest_1.expect)(res.usage.count).toBe(1);
        const eom = utcEndOfMonthSeconds();
        (0, vitest_1.expect)(res.usage.resetAt).toBeGreaterThanOrEqual(eom - 2);
        (0, vitest_1.expect)(res.usage.resetAt).toBeLessThanOrEqual(eom + 2);
        (0, vitest_1.expect)(kvImpl.lastPut?.expirationTtl).toBeUndefined();
        const key = (0, usage_1.legacyMonthlyKey)('img', 'user', 'u3');
        const stored = await kv.get(key, { type: 'json' });
        (0, vitest_1.expect)(stored).toEqual({ count: 1 });
        const res2 = await (0, usage_1.incrementMonthlyNoTtl)(kv, 'img', 'user', 'u3', 100);
        (0, vitest_1.expect)(res2.usage.count).toBe(2);
        const stored2 = await kv.get(key, { type: 'json' });
        (0, vitest_1.expect)(stored2).toEqual({ count: 2 });
    });
});
