import { describe, it, expect } from 'vitest';
import {
  dailyKey,
  monthlyKey,
  rollingDailyKey,
  incrementDaily,
  incrementMonthly,
  incrementDailyRolling,
  incrementMonthlyNoTtl,
  legacyMonthlyKey,
} from './usage';

class FakeKV {
  private store = new Map<string, { value: string; expirationTtl?: number }>();
  public lastPut?: { key: string; expirationTtl?: number };

  async get(key: string, opts?: { type?: 'text' | 'json' | 'stream' } | 'text' | 'json' | 'stream') {
    const rec = this.store.get(key);
    if (!rec) return null as any;
    const type = typeof opts === 'string' ? opts : opts?.type;
    if (type === 'json') return JSON.parse(rec.value);
    return rec.value as any;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    const v = typeof value === 'string' ? value : String(value);
    this.store.set(key, { value: v, expirationTtl: options?.expirationTtl });
    this.lastPut = { key, expirationTtl: options?.expirationTtl };
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}

function utcEndOfDaySeconds(d = new Date()): number {
  const eod = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
  );
  return Math.ceil(eod.getTime() / 1000);
}

function utcEndOfMonthSeconds(d = new Date()): number {
  const eom = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return Math.ceil(eom.getTime() / 1000);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

describe('kv/usage key builders', () => {
  it('dailyKey formats with UTC date', () => {
    const key = dailyKey('x', 'user', 'u1');
    expect(key).toMatch(/^x:daily:\d{4}-\d{2}-\d{2}:user:u1$/);
  });

  it('monthlyKey formats with UTC year-month', () => {
    const key = monthlyKey('x', 'guest', 'g1');
    expect(key).toMatch(/^x:monthly:\d{4}-\d{2}:guest:g1$/);
  });

  it('rollingDailyKey uses stable usage prefix', () => {
    const key = rollingDailyKey('voice', 'guest', 'anon');
    expect(key).toBe('voice:usage:guest:anon');
  });
});

describe('incrementDaily (EOD TTL semantics)', () => {
  it('sets resetAt to UTC EOD and TTL ~ seconds until EOD', async () => {
    const kv = new FakeKV() as unknown as KVNamespace;
    const before = nowSec();
    const res = await incrementDaily(kv, 'test', 'user', 'u1', 10);
    const after = nowSec();

    const eod = utcEndOfDaySeconds();
    expect(res.usage.count).toBe(1);
    expect(res.usage.resetAt).toBeGreaterThanOrEqual(eod - 2);
    expect(res.usage.resetAt).toBeLessThanOrEqual(eod + 2);

    const ttl = (kv as any as FakeKV).lastPut?.expirationTtl ?? 0;
    const remainingLower = eod - after - 2;
    const remainingUpper = eod - before + 2;
    expect(ttl).toBeGreaterThanOrEqual(Math.max(1, remainingLower));
    expect(ttl).toBeLessThanOrEqual(Math.max(1, remainingUpper));

    const res2 = await incrementDaily(kv, 'test', 'user', 'u1', 10);
    expect(res2.usage.count).toBe(2);
    expect(res2.usage.resetAt).toBe(res.usage.resetAt);
    const ttl2 = (kv as any as FakeKV).lastPut?.expirationTtl ?? 0;
    expect(ttl2).toBeLessThanOrEqual(ttl);
  });
});

describe('incrementDailyRolling (rolling 24h semantics)', () => {
  it('starts new 24h window and keeps resetAt stable within window', async () => {
    const kv = new FakeKV() as unknown as KVNamespace;
    const start = nowSec();
    const res = await incrementDailyRolling(kv, 'prompt', 'guest', 'g1', 3);
    expect(res.usage.count).toBe(1);
    expect(res.usage.resetAt).toBeGreaterThanOrEqual(start + 24 * 60 * 60 - 2);
    expect(res.usage.resetAt).toBeLessThanOrEqual(start + 24 * 60 * 60 + 2);

    const res2 = await incrementDailyRolling(kv, 'prompt', 'guest', 'g1', 3);
    expect(res2.usage.count).toBe(2);
    expect(res2.usage.resetAt).toBe(res.usage.resetAt);
    const ttl1 = (kv as any as FakeKV).lastPut?.expirationTtl ?? 0;
    expect(ttl1).toBeLessThanOrEqual(res.usage.resetAt - nowSec());
  });
});

describe('incrementMonthly (EOM TTL semantics)', () => {
  it('uses monthly key and EOM TTL', async () => {
    const kvImpl = new FakeKV();
    const kv = kvImpl as unknown as KVNamespace;
    const res = await incrementMonthly(kv, 'img', 'user', 'u2', 100);
    expect(res.usage.count).toBe(1);
    const eom = utcEndOfMonthSeconds();
    expect(res.usage.resetAt).toBeGreaterThanOrEqual(eom - 2);
    expect(res.usage.resetAt).toBeLessThanOrEqual(eom + 2);
    expect(kvImpl.lastPut?.expirationTtl).toBeGreaterThan(0);
  });
});

describe('incrementMonthlyNoTtl (legacy monthly without TTL)', () => {
  it('stores only {count} without expiration and returns usage with EOM resetAt', async () => {
    const kvImpl = new FakeKV();
    const kv = kvImpl as unknown as KVNamespace;
    const res = await incrementMonthlyNoTtl(kv, 'img', 'user', 'u3', 100);
    expect(res.usage.count).toBe(1);
    const eom = utcEndOfMonthSeconds();
    expect(res.usage.resetAt).toBeGreaterThanOrEqual(eom - 2);
    expect(res.usage.resetAt).toBeLessThanOrEqual(eom + 2);
    expect(kvImpl.lastPut?.expirationTtl).toBeUndefined();

    const key = legacyMonthlyKey('img', 'user', 'u3');
    const stored = await kv.get(key, { type: 'json' });
    expect(stored).toEqual({ count: 1 });

    const res2 = await incrementMonthlyNoTtl(kv, 'img', 'user', 'u3', 100);
    expect(res2.usage.count).toBe(2);
    const stored2 = await kv.get(key, { type: 'json' });
    expect(stored2).toEqual({ count: 2 });
  });
});
