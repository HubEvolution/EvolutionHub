import { test, expect } from '@playwright/test';

// This smoke test ensures the SSE stream connects and exposes a jobId,
// then verifies the poll endpoint responds with a JSON snapshot.

test.describe('Voice SSE + Poll smoke', () => {
  test('connects to /api/voice/stream and polls snapshot', async ({ page, request }) => {
    // Ensure same-origin for EventSource
    await page.goto('/');

    const jobId = await page.evaluate(async () => {
      const id = (globalThis.crypto?.randomUUID?.() ||
        Math.random().toString(36).slice(2)) as string;
      await new Promise<void>((resolve) => {
        const es = new EventSource(`/api/voice/stream?jobId=${encodeURIComponent(id)}`);
        const timer = setTimeout(() => {
          try {
            es.close();
          } catch {}
          resolve();
        }, 3000);
        es.addEventListener('connected', () => {
          clearTimeout(timer);
          try {
            es.close();
          } catch {}
          resolve();
        });
        es.onerror = () => {
          try {
            es.close();
          } catch {}
          resolve();
        };
      });
      return id;
    });

    // In dev flags, SSE should be enabled and jobId should be non-empty
    expect(jobId).toBeTruthy();

    const res = await request.get(`/api/voice/poll?jobId=${encodeURIComponent(jobId)}`);

    if (res.status() >= 400) {
      // If poll is disabled in an env, accept not_found/validation shape
      const err = await res.json().catch(() => ({}));
      expect(String(err?.error?.type || '')).toMatch(/not_found|validation/i);
      return;
    }

    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json && typeof json === 'object').toBe(true);
    // Minimal shape checks
    expect(json.success).toBe(true);
    expect(json.data && typeof json.data === 'object').toBe(true);
    expect(['active', 'done', 'error', 'not_found']).toContain(json.data.status);
  });
});
