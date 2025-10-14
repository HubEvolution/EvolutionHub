import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

// Basic smoke: page loads, title visible, usage call succeeds.
// Note: We do NOT attempt real microphone recording in CI; browsers need user gesture/permission.
// Advanced flow (injecting prerecorded blobs) can be introduced later with a feature flag in the island.

test.describe('Voice Visualizer - Smoke', () => {
  test('loads page and shows controls', async ({ page }) => {
    await page.goto(`${BASE}/en/tools/voice-visualizer/app`, { waitUntil: 'domcontentloaded' });

    // Heading
    await expect(page.getByRole('heading', { name: /Voice Visualizer/i })).toBeVisible();

    // Start button present
    const startBtn = page.getByRole('button', { name: /Start Recording/i });
    await expect(startBtn).toBeVisible();

    // Transcript panel present
    await expect(page.getByRole('heading', { name: 'Transcript' })).toBeVisible();

    // GET /api/voice/usage succeeds
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().endsWith('/api/voice/usage') && res.status() === 200,
        {
          timeout: 5000,
        }
      ),
      // trigger a fetch by reloading the page
      page.reload({ waitUntil: 'domcontentloaded' }),
    ]);
    expect(response.ok()).toBeTruthy();
  });
});
