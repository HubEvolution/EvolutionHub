import { test, expect } from '@playwright/test';

test.describe('Rate limiter persistence (KV-backed)', () => {
  test('second request within window returns 429 and then resets', async ({ request }) => {
    const url = '/api/test/rate-limit';

    const r1 = await request.get(url);
    expect(r1.ok()).toBeTruthy();

    const r2 = await request.get(url);
    expect(r2.status()).toBe(429);
    const retryAfter = r2.headers()['retry-after'];
    expect(Number.parseInt(retryAfter || '0', 10)).toBeGreaterThan(0);

    // wait for window to elapse (5s + small buffer)
    await new Promise((r) => setTimeout(r, 5200));

    const r3 = await request.get(url);
    expect(r3.ok()).toBeTruthy();
  });
});
