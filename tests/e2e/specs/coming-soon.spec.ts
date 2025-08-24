import { test, expect } from '@playwright/test';

test.describe('Coming Soon Overlay', () => {
  test('shows overlay for pricing (DE) via central pattern', async ({ page }) => {
    // Pattern /pricing* is configured in src/config/coming-soon.ts
    await page.goto('/pricing');
    const overlay = page.locator('#coming-soon-overlay');
    await expect(overlay).toBeVisible();

    // Check localized heading (German)
    await expect(overlay.locator('h2')).toContainText('Bald verfügbar');

    // Primary CTA should point to the localized home path (de -> /)
    const primary = overlay.getByRole('link', { name: 'Zur Startseite' });
    await expect(primary).toBeVisible();
    await expect(primary).toHaveAttribute('href', '/');

    // Secondary CTA (waitlist) should exist and point to contact page
    const secondary = overlay.getByRole('link', { name: 'Zur Warteliste' });
    await expect(secondary).toBeVisible();
    await expect(secondary).toHaveAttribute('href', '/kontakt');
  });

  test('shows overlay for pricing (EN) with localized texts and links', async ({ page }) => {
    await page.goto('/en/pricing');
    const overlay = page.locator('#coming-soon-overlay');
    await expect(overlay).toBeVisible();

    // English heading
    await expect(overlay.locator('h2')).toContainText('Coming soon');

    // Primary CTA should point to /en/
    const primary = overlay.getByRole('link', { name: 'Back to home' });
    await expect(primary).toBeVisible();
    await expect(primary).toHaveAttribute('href', '/en/');

    // Secondary CTA (join waitlist)
    const secondary = overlay.getByRole('link', { name: 'Join waitlist' });
    await expect(secondary).toBeVisible();
    // English contact path is localized (/en/kontakt) by localizePath; accept either '/en/kontakt' or '/kontakt'
    const href = await secondary.getAttribute('href');
    expect(href === '/en/kontakt' || href === '/kontakt' || href === '/en/contact' ).toBeTruthy();
  });

  test('does not show overlay on non-matching pages', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#coming-soon-overlay');
    // Expect there to be no overlay on the homepage (pattern should not match)
    await expect(overlay).toHaveCount(0);
  });
});