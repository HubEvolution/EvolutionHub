import { test, expect } from '@playwright/test';

// These tests validate the behavior of the public R2 AI proxy route
// - uploads: public cache
// - results: owner-gated (user or guest via guest_id cookie)
// We use the request fixture with relative paths so baseURL from config applies.

test.describe('R2 AI Proxy', () => {
  test('rejects non-owner for results paths (403)', async ({ request }) => {
    const res = await request.get('/r2-ai/ai-enhancer/results/guest/someone-else/image.png');
    expect(res.status()).toBe(403);
  });

  test('returns 404 for invalid prefix', async ({ request }) => {
    const res = await request.get('/r2-ai/not-allowed/key.png');
    expect(res.status()).toBe(404);
  });

  test('allows owner for results paths and proceeds to object lookup (404 if not found)', async ({
    request,
  }) => {
    const ownerId = 'playwright-guest-owner';
    const res = await request.get(`/r2-ai/ai-enhancer/results/guest/${ownerId}/nonexistent.png`, {
      headers: { Cookie: `guest_id=${encodeURIComponent(ownerId)}` },
    });
    // Owner gate passes; object is likely missing in test env, so 404 (not 403)
    expect(res.status()).toBe(404);
  });
});
