import { describe, it, expect } from 'vitest';
import {
  getUsage,
  incrementDailyRolling,
  incrementMonthlyNoTtl,
  rollingDailyKey,
  legacyMonthlyKey,
} from '@/lib/kv/usage';
import { createKVNamespaceMock } from '../utils/kv-mock';

describe('KV usage helpers (integration-ish with in-memory KV)', () => {
  it('getUsage returns null when key missing; incrementMonthlyNoTtl sets count and resetAt', async () => {
    const kvMock = createKVNamespaceMock();
    const kv = kvMock.namespace;
    const key = legacyMonthlyKey('ai', 'user', 'U1');

    const initial = await getUsage(kv, key);
    expect(initial).toBeNull();

    const res = await incrementMonthlyNoTtl(kv, 'ai', 'user', 'U1', 9999);
    expect(res.usage.count).toBe(1);
    // resetAt is unix seconds; should be greater than now (seconds)
    expect(res.usage.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const after = await getUsage(kv, key);
    expect(after).not.toBeNull();
  });

  it('incrementDailyRolling increments within a small window and enforces limit flag', async () => {
    const kvMock = createKVNamespaceMock();
    const kv = kvMock.namespace;
    const key = rollingDailyKey('ai', 'guest', 'G1');

    const first = await incrementDailyRolling(kv, 'ai', 'guest', 'G1', 2, 60); // 60s window
    expect(first.usage.count).toBe(1);
    expect(first.allowed).toBe(true);

    const second = await incrementDailyRolling(kv, 'ai', 'guest', 'G1', 2, 60);
    expect(second.usage.count).toBe(2);
    expect(second.allowed).toBe(true);

    const third = await incrementDailyRolling(kv, 'ai', 'guest', 'G1', 2, 60);
    expect(third.usage.count).toBe(3);
    expect(third.allowed).toBe(false);

    // Ensure stored shape is JSON and parseable by getUsage
    const peek = await getUsage(kv, key);
    expect(peek).not.toBeNull();
    expect(peek?.count).toBe(3);
  });
});
