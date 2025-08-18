import { test, expect } from '@playwright/test';

// These tests verify the i18n splash page and middleware behavior.
// They rely on the Astro dev server started by playwright.config.ts (port 4321).

test.describe('Splash/Middleware i18n flow', () => {
  test('first visit redirects to /welcome with next param', async ({ page, baseURL }) => {
    await page.goto('/');
    const current = page.url();
    expect(current).toContain('/welcome');
    expect(current).toContain('next=');
    // Language selection links present
    await expect(page.locator("a[href*='set_locale=de']")).toBeVisible();
    await expect(page.locator("a[href*='set_locale=en']")).toBeVisible();
  });

  test('DE-prefixed path redirects to EN when cookie=en', async ({ page }) => {
    // Set EN preference via explicit param
    await page.goto('/welcome?set_locale=en&next=%2F');
    await page.waitForLoadState('domcontentloaded');

    // Now visit a DE-prefixed path; middleware should 308 -> /en/
    await page.goto('/de/');
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/^\/en\/?$/);
  });

  test('welcome is noindex (meta robots; header optional)', async ({ page }) => {
    const res = await page.goto('/welcome');
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const headers = res!.headers();
    const xrobots = headers['x-robots-tag'];
    if (xrobots) {
      expect(xrobots).toContain('noindex');
    }
  });

  test('selecting Deutsch sets cookie and returns to neutral path', async ({ page }) => {
    await page.goto('/'); // will end up on /welcome
    await page.locator("a[href*='set_locale=de']").click();
    await page.waitForLoadState('domcontentloaded');

    // HttpOnly cookie should be set
    const cookies = await page.context().cookies();
    const pref = cookies.find((c) => c.name === 'pref_locale');
    expect(pref?.value).toBe('de');

    // Neutral root should not redirect to /en/ for de cookie
    await page.goto('/');
    expect(new URL(page.url()).pathname).toMatch(/^\/$/);
  });

  test('cookie=en routes neutral / to /en/', async ({ page }) => {
    // Set via explicit param flow
    await page.goto('/welcome?set_locale=en&next=%2F');
    await page.waitForLoadState('domcontentloaded');

    // Verify cookie
    const cookies = await page.context().cookies();
    const pref = cookies.find((c) => c.name === 'pref_locale');
    expect(pref?.value).toBe('en');

    // Neutral root now redirects to /en/
    await page.goto('/');
    expect(new URL(page.url()).pathname).toMatch(/^\/en\/?$/);
  });

  test('bot UA with en Accept-Language redirects neutral / to EN', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      userAgent: 'Googlebot/2.1; +http://www.google.com/bot.html',
      extraHTTPHeaders: { 'accept-language': 'en' },
      baseURL,
    });
    const page = await context.newPage();
    await page.goto('/');
    expect(new URL(page.url()).pathname).toMatch(/^\/en\/?$/);
    await context.close();
  });
});
