import { test, expect } from '@playwright/test';

// Verifies authenticated access to /en/login redirects to the dashboard
// without ResponseSentError/blank page. We accept either /en/dashboard or
// normalized /dashboard as final URL.

test.describe('Locale-aware redirect: /en/login (authenticated)', () => {
  test('authenticated user is redirected from /en/login to dashboard', async ({ page }) => {
    // Create a debug session using the real API (not MSW), which sets a server-side session cookie
    // Use page.request to ensure cookies are applied to the same browser context
    const debugRes = await page.request.post('/api/debug-login');
    expect(debugRes.ok()).toBeTruthy();

    // Now visit the English login page; guard should redirect to dashboard
    const res = await page.goto('/en/login');

    // Ensure navigation succeeded (no hard network error)
    expect(res?.ok() || res?.status() === 302 || res?.status() === 308 || res?.status() === 301).toBeTruthy();

    // Final URL should be the dashboard (either normalized neutral or en-prefixed)
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/^(\/en)?\/dashboard\/?$/);

    // Ensure dashboard navigation is present to avoid blank-page regressions
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible();
  });
});
