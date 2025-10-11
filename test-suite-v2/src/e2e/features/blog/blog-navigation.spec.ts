import { test, expect } from '@playwright/test';

test.describe('Blog navigation (EN locale)', () => {
  test('links are locale-aware and navigate without neutral redirects', async ({
    page,
    baseURL,
  }) => {
    const origin = baseURL || 'http://127.0.0.1:8787';

    // Go to English blog index
    await page.goto('/en/blog/');

    // Ensure we have at least one article card
    const titleLink = page.locator('article h2 a').first();
    await expect(titleLink).toBeVisible();

    // Validate href is already localized to /en/blog/... (not neutral /blog/...)
    const href = await titleLink.getAttribute('href');
    expect(href).toBeTruthy();
    const absolute = new URL(href!, origin);
    expect(absolute.pathname).toMatch(/^\/en\/blog\//);

    // Click and ensure final URL is still localized
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      titleLink.click(),
    ]);
    expect(new URL(page.url()).pathname).toMatch(/^\/en\/blog\//);

    // Optional: tag link inside post footer if present should be localized
    const possibleTag = page.locator('a[href*="/blog/tag/"]').first();
    if (await possibleTag.count()) {
      const tHref = await possibleTag.getAttribute('href');
      if (tHref) {
        const tAbs = new URL(tHref, origin);
        expect(tAbs.pathname).toMatch(/^\/en\/blog\/tag\//);
      }
    }
  });
});
