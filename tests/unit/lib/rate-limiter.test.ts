import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logRateLimitExceeded = vi.fn();

vi.mock('@/lib/security-logger', () => ({
  logRateLimitExceeded,
}));

import {
  createRateLimiter,
  getLimiterState,
  rateLimit,
  resetLimiterKey,
  type RateLimiterContext,
  type RateLimiter,
} from '@/lib/rate-limiter';

let limiterCounter = 0;

const makeLimiter = (overrides: { maxRequests?: number; windowMs?: number } = {}) => {
  const limiterName = `testLimiter-${++limiterCounter}`;
  const limiter = createRateLimiter({
    name: limiterName,
    maxRequests: overrides.maxRequests ?? 3,
    windowMs: overrides.windowMs ?? 10_000,
  });
  return { limiterName, limiter };
};

const makeContext = (overrides: Partial<RateLimiterContext> = {}): RateLimiterContext => ({
  clientAddress: overrides.clientAddress ?? '203.0.113.5',
  locals: overrides.locals ?? ({ user: { id: 'user-42' } } as RateLimiterContext['locals']),
  request: overrides.request ?? new Request('https://example.com/api/test'),
});

beforeEach(() => {
  vi.useFakeTimers();
  logRateLimitExceeded.mockReset();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('createRateLimiter', () => {
  it('stores entries using ip and user id', async () => {
    const { limiterName, limiter } = makeLimiter();
    await limiter(makeContext());

    const state = await getLimiterState(limiterName);
    expect(state[limiterName].entries[0]).toMatchObject({
      key: '203.0.113.5:user-42',
      count: 1,
    });
  });

  it('defaults to anonymous user when no session is present', async () => {
    const { limiterName, limiter } = makeLimiter();
    await limiter(makeContext({ clientAddress: '198.51.100.10', locals: { user: null } }));

    const entry = (await getLimiterState(limiterName))[limiterName].entries[0];
    expect(entry.key).toBe('198.51.100.10:anonymous');
  });

  it('returns 429 once the limit is exceeded and logs the event', async () => {
    const { limiterName, limiter } = makeLimiter({ maxRequests: 2 });
    const context = makeContext();

    await limiter(context);
    await limiter(context);
    const response = await limiter(context);

    expect(response).toBeInstanceOf(Response);
    const res = response as Response;
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('10');
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Rate limit exceeded', retryAfter: 10 });
    expect(logRateLimitExceeded).toHaveBeenCalledWith(
      '203.0.113.5',
      '/api/test',
      expect.objectContaining({ limiterName, maxRequests: 2 })
    );
  });

  it('resets counters after the window elapses', async () => {
    const { limiterName, limiter } = makeLimiter({ windowMs: 5_000 });
    const context = makeContext();

    await limiter(context);
    const firstState = (await getLimiterState(limiterName))[limiterName].entries[0];
    vi.advanceTimersByTime(5_001);
    const response = await limiter(context);

    expect(response).toBeUndefined();
    const secondState = (await getLimiterState(limiterName))[limiterName].entries[0];
    expect(secondState.count).toBe(1);
    expect(secondState.resetAt).toBeGreaterThan(firstState.resetAt);
  });

  it('cleans expired entries via the interval cleanup', async () => {
    const { limiterName, limiter } = makeLimiter({ windowMs: 2_000 });
    const context = makeContext();

    await limiter(context);
    vi.advanceTimersByTime(2_001);
    vi.advanceTimersByTime(60_000);
    vi.runOnlyPendingTimers();

    const state = (await getLimiterState(limiterName))[limiterName];
    expect(state.entries).toHaveLength(0);
  });
});

describe('rateLimit helper', () => {
  it('throws once the limit is exceeded and reports retry time', async () => {
    await rateLimit('helper-key', 2, 1);
    await rateLimit('helper-key', 2, 1);

    await expect(rateLimit('helper-key', 2, 1)).rejects.toThrow(
      'Rate limit exceeded. Please retry after 1 seconds.'
    );
    await resetLimiterKey('service-limiter', 'helper-key');
  });

  it('resets the counter after window expiry', async () => {
    await rateLimit('helper-reset', 1, 1);
    await expect(rateLimit('helper-reset', 1, 1)).rejects.toThrow();

    vi.advanceTimersByTime(1_001);
    await expect(rateLimit('helper-reset', 1, 1)).resolves.toBeUndefined();
    await resetLimiterKey('service-limiter', 'helper-reset');
  });
});
