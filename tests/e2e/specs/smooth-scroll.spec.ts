import { test, expect } from '@playwright/test';

// Smooth scrolling test using the global handler defined in BaseLayout.astro
// We stub Element.prototype.scrollIntoView to capture calls and verify options.

test.describe('Smooth scrolling behavior', () => {
  test('Skip link scrolls to #main-content and updates hash', async ({ page }) => {
    // Stub before any page scripts run
    await page.addInitScript(() => {
      (window as any).__scrollCalls = [] as any[];
      const orig = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function(arg?: any) {
        try { (window as any).__scrollCalls.push(arg); } catch {}
        try { if (orig) return (orig as any).call(this, arg); } catch {}
      } as any;
    });

    await page.goto('/en/');

    const skip = page.locator('a[aria-label="Skip to main content"]');
    // Focus makes the skip link visible (focus:* styles), then click
    await skip.focus();
    await skip.click({ force: true });

    // URL hash should update to #main-content
    await expect(page).toHaveURL(/#main-content/);

    // Verify smooth scroll options were used
    const lastCall = await page.evaluate(() => {
      const calls = (window as any).__scrollCalls || [];
      return calls.at(-1);
    });

    // lastCall is either an options object or a boolean (legacy API). We prefer object.
    if (lastCall && typeof lastCall === 'object') {
      expect(lastCall.behavior).toBe('smooth');
      expect(lastCall.block).toBe('start');
    } else {
      // Fallback: ensure scrollIntoView was invoked at least once
      const count = await page.evaluate(() => ((window as any).__scrollCalls || []).length);
      expect(count).toBeGreaterThan(0);
    }
  });
});
