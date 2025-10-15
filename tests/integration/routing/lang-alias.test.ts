import { describe, it, expect } from 'vitest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

async function fetchManual(path: string, headers: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, { redirect: 'manual', headers });
}

describe('Locale alias ?lang=', () => {
  it('redirects using ?lang=en&next=/pricing to /en/pricing', async () => {
    const res = await fetchManual('/?lang=en&next=/pricing');
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get('location') || '';
    expect(loc).toMatch(/\/en\/pricing\/?(\?.*)?$/);
  });
});
