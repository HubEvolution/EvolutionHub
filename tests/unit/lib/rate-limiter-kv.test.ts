import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createRateLimiter,
  rateLimit,
  type RateLimiter,
  type RateLimiterContext,
} from '@/lib/rate-limiter';

type KvKey = string;
type KvValue = { value: string; expiresAt?: number };

function createKvStub() {
  const store = new Map<KvKey, KvValue>();
  const now = () => Date.now();
  return {
    async get(key: string): Promise<string | null> {
      const v = store.get(key);
      if (!v) return null;
      if (v.expiresAt && v.expiresAt <= now()) {
        store.delete(key);
        return null;
      }
      return v.value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
      const ttl = opts?.expirationTtl ? Math.max(0, opts.expirationTtl) : undefined;
      const expiresAt = ttl ? now() + ttl * 1000 : undefined;
      store.set(key, { value, expiresAt });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(opts?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }> {
      const out: Array<{ name: string }> = [];
      for (const k of store.keys()) {
        if (opts?.prefix && !k.startsWith(opts.prefix)) continue;
        out.push({ name: k });
      }
      return { keys: out };
    },
    _dump() {
      return store;
    },
  } as unknown as KVNamespace;
}

const makeContext = (kv: KVNamespace): RateLimiterContext => ({
  clientAddress: '127.0.0.1',
  locals: { user: null, runtime: { env: { SESSION: kv } } } as RateLimiterContext['locals'],
  request: new Request('https://example.test/api/kv'),
});

describe('KV-backed rate limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists counters across limiter instances via KV', async () => {
    const kv = createKvStub();
    const limiterA = createRateLimiter({ name: 'kvLimiterTest', maxRequests: 2, windowMs: 10_000 });
    const limiterB = createRateLimiter({ name: 'kvLimiterTest', maxRequests: 2, windowMs: 10_000 });
    const ctx = makeContext(kv);

    await limiterA(ctx);
    await limiterA(ctx);
    const res = await limiterB(ctx);
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(429);
  });

  it('service rateLimit uses KV when provided', async () => {
    const kv = createKvStub();
    await rateLimit('svc:kv:test', 2, 60, { kv });
    await rateLimit('svc:kv:test', 2, 60, { kv });
    await expect(rateLimit('svc:kv:test', 2, 60, { kv })).rejects.toThrow(/Rate limit exceeded/);
  });
});
