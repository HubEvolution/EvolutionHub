import { test, expect } from '@playwright/test';

// Uses Playwright baseURL from playwright.config.ts; works for local and remote TEST_BASE_URL

test.describe('Blog i18n & SEO fixes', () => {
  test('EN post: category link, share origin, single H1, no header errors', async ({ page }) => {
    await page.goto('/en/blog/ki-als-kollege/', { waitUntil: 'networkidle' });
    // Category link should use /category/
    await expect(page.locator('a[href*="/en/blog/category/"]').first()).toBeVisible();
    // Share links should point to the current site origin (env-agnostic)
    const twitterLink = page.locator('a[href*="twitter.com/intent/tweet"]');
    const twitterHref = (await twitterLink.getAttribute('href')) || '';
    const expectedHost = new URL(page.url()).host;
    const urlParam = new URL(twitterHref).searchParams.get('url') || '';
    const shareTargetHost = urlParam ? new URL(urlParam).host : '';
    expect(shareTargetHost).toBe(expectedHost);
    // Exactly one H1
    const h1s = await page.locator('h1').count();
    expect(h1s).toBe(1);
    // No Language selector error logs
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Language selector elements not found')) {
        throw new Error('Unexpected Language selector error log');
      }
    });
    // Related Articles heading
    await expect(page.getByText('Related Articles')).toBeVisible();
  });

  test('DE post: category link, share origin, single H1, no header errors', async ({ page }) => {
    await page.goto('/blog/ki-als-kollege/', { waitUntil: 'networkidle' });
    // Category link should use /kategorie/
    await expect(page.locator('a[href*="/blog/kategorie/"]').first()).toBeVisible();
    // Share links should point to the current site origin (env-agnostic)
    const twitterLink = page.locator('a[href*="twitter.com/intent/tweet"]');
    const twitterHref = (await twitterLink.getAttribute('href')) || '';
    const expectedHost = new URL(page.url()).host;
    const urlParam = new URL(twitterHref).searchParams.get('url') || '';
    const shareTargetHost = urlParam ? new URL(urlParam).host : '';
    expect(shareTargetHost).toBe(expectedHost);
    // Exactly one H1
    const h1s = await page.locator('h1').count();
    expect(h1s).toBe(1);
    // No Language selector error logs
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Language selector elements not found')) {
        throw new Error('Unexpected Language selector error log');
      }
    });
    // Ähnliche Artikel heading
    await expect(page.getByText('Ähnliche Artikel')).toBeVisible();
  });
});
