import { test, expect } from '@playwright/test';

// Verifies unauthenticated access to /en/account/settings redirects to a login page
// and the login form renders without ResponseSentError-like blank page.
// We accept either /en/login or normalized /login as final URL.

test.describe('Locale-aware redirect: /en/account/settings', () => {
  test('unauthenticated user is redirected to login and page renders', async ({ page }) => {
    // Go directly to the English account settings page
    const res = await page.goto('/en/account/settings');

    // Ensure navigation succeeded (no hard network error)
    expect(res?.ok() || res?.status() === 302 || res?.status() === 308 || res?.status() === 301).toBeTruthy();

    // Final URL should be the login page (either normalized neutral or en-prefixed)
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/^(\/en)?\/login\/?$/);

    // Ensure the login form is present (Magic Link)
    await expect(page.locator('form[action="/api/auth/magic/request"][method="post"]')).toBeVisible();

    // Basic sanity checks: there should be an email input (magic)
    await expect(page.locator('input#email-magic')).toBeVisible();
  });
});
