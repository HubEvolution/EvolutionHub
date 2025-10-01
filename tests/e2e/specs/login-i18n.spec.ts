import { test, expect } from '@playwright/test';

// Helper: assert page has no leaked i18n fallback marker
async function expectNoFallbackMarker(page: import('@playwright/test').Page) {
  const content = await page.content();
  expect(content).not.toContain('_fallback_not_found');
}

test.describe('Login i18n', () => {
  test('neutral /login (de) shows German texts', async ({ page }) => {
    await page.goto('/login');

    // GitHub button text (German)
    const githubBtn = page.locator('form[action="/api/auth/oauth/github/start"] button');
    await expect(githubBtn).toHaveText(/Mit GitHub anmelden/i);

    // Divider text (German "oder") should appear somewhere in the login card
    await expect(page.getByText(/\boder\b/i)).toBeVisible();

    await expectNoFallbackMarker(page);
  });

  test('/en/login shows English texts', async ({ page }) => {
    await page.goto('/en/login');

    // GitHub button text (English)
    const githubBtn = page.locator('form[action="/api/auth/oauth/github/start"] button');
    await expect(githubBtn).toHaveText(/Continue with GitHub/i);

    // Divider text (English "or")
    await expect(page.getByText(/\bor\b/i)).toBeVisible();

    await expectNoFallbackMarker(page);
  });
});
