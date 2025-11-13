import { test, expect, Page } from '@playwright/test';

// Smoke test for mobile header menu behavior (open/close, aria, scroll-lock, focus-trap)
// Note: Uses viewport override locally; projects in playwright.config are desktop by default.

test.describe('Header Mobile Menu (smoke)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('opens, traps focus, locks scroll, and closes on ESC', async ({ page }: { page: Page }) => {
    await page.goto('/');

    const menuButton = page.locator('#mobile-menu-button');
    const mobileMenu = page.locator('#mobile-menu');

    await expect(menuButton).toBeVisible();
    await expect(mobileMenu).toBeHidden();

    // Open menu
    await menuButton.click();
    await expect(mobileMenu).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    // Body scroll should be locked
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');

    // Basic focus-trap smoke: active element stays within menu after a couple of tabs
    const isActiveInside = async () =>
      await page.evaluate(() => {
        const menu = document.getElementById('mobile-menu');
        const active = document.activeElement;
        return !!(menu && active && menu.contains(active));
      });

    // Allow first focus move to happen
    await page.waitForTimeout(50);
    expect(await isActiveInside()).toBeTruthy();

    await page.keyboard.press('Tab');
    expect(await isActiveInside()).toBeTruthy();
    await page.keyboard.press('Shift+Tab');
    expect(await isActiveInside()).toBeTruthy();

    // Close on ESC
    await page.keyboard.press('Escape');
    await expect(mobileMenu).toBeHidden();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    const overflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(overflowAfter).not.toBe('hidden');
  });
});
