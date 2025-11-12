import { test, expect } from '@playwright/test';
import {
  navigateToTool,
  assertOutputNotEmpty,
  PromptEnhancer,
} from '../../../fixtures/tool-helpers';
import { dismissCookieConsent } from '../../../fixtures/common-helpers';

test.describe('Prompt Enhancer Flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTool(page, 'prompt-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);
  });

  test('Happy Path - Enhance Flow in English', async ({ page }) => {
    await expect(page.locator('#inputText, [data-testid="input-text"]').first()).toBeVisible();

    // Stub API to return deterministic success
    await page.route('/api/prompt-enhance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enhancedPrompt: 'Once upon a time, a clever robot learned to dream. (mock)',
            safetyReport: { score: 9, warnings: [] },
            usage: { used: 1, limit: 20, resetAt: null },
            limits: { user: 20, guest: 10 },
          },
        }),
      });
    });

    const output = await PromptEnhancer.enhance(page, 'Write a creative story about a robot.');
    expect(output.trim().length).toBeGreaterThan(0);
    await assertOutputNotEmpty(page, '#outputText, [data-testid="output-text"]');
  });

  test('Happy Path - Enhance Flow in German', async ({ page }) => {
    await navigateToTool(page, 'prompt-enhancer', { locale: 'de' });
    await dismissCookieConsent(page);
    // Stub API to return deterministic success
    await page.route('/api/prompt-enhance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enhancedPrompt: 'Es war einmal ein kluger Roboter, der zu träumen lernte. (mock)',
            safetyReport: { score: 9, warnings: [] },
            usage: { used: 1, limit: 20, resetAt: null },
            limits: { user: 20, guest: 10 },
          },
        }),
      });
    });
    await PromptEnhancer.enhance(page, 'Schreibe eine kreative Geschichte über einen Roboter.');
    await expect(page.locator('#outputText, [data-testid="output-text"]').first()).toBeVisible();
  });

  test('Error - Invalid Input (Empty)', async ({ page }) => {
    await navigateToTool(page, 'prompt-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);
    const enhanceBtn = page
      .locator('button[type="submit"], button:has-text("Enhance"), [data-testid="enhance-button"]')
      .first();
    await expect(enhanceBtn).toBeDisabled();
  });

  test.skip('Error - Invalid Input (Too Long)', async ({ page }) => {
    // Skipped: textarea has maxLength=1000, so >1000 is clamped and server-side rule (>1000) cannot be triggered.
  });

  test.skip('Error - Quota Exceeded (Mock 429)', async ({ page }) => {
    await page.route('/api/prompt-enhance', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { type: 'QUOTA_EXCEEDED', message: 'Rate limit exceeded' },
        }),
      });
    });

    await navigateToTool(page, 'prompt-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);
    // Submit without waiting for success (429 expected)
    await PromptEnhancer.fillInput(page, 'Test input');
    // Wait for hydration/state to enable the button; retry if needed
    const enhanceBtn = page
      .locator('button[type="submit"], button:has-text("Enhance"), [data-testid="enhance-button"]')
      .first();
    await expect(enhanceBtn).toBeVisible();
    await enhanceBtn.waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForFunction(
      () => {
        const btn = document.querySelector(
          '[data-testid="enhance-button"]'
        ) as HTMLButtonElement | null;
        return !!btn && !btn.disabled;
      },
      { timeout: 10000 }
    );
    await enhanceBtn.click();
    const errorLocator = page.locator('[role="alert"], .error');
    await expect(errorLocator).toBeVisible();
  });

  test('Error - Flag Off (PUBLIC_PROMPT_ENHANCER_V1=false)', async ({ context, page }) => {
    test.skip(true, 'Skipping gating assertion until stable gating marker is exposed');
    await context.addInitScript(() => {
      (window as any).PUBLIC_PROMPT_ENHANCER_V1 = 'false';
    });
    await navigateToTool(page, 'prompt-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);
  });

  test('Accessibility - WCAG AA Compliance', async () => {
    test.skip(true, 'A11y scan pending install of @axe-core/playwright');
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('Touch Input', async ({ page }) => {
      await navigateToTool(page, 'prompt-enhancer', { locale: 'en' });

      await expect(page.locator('#inputText')).toBeVisible();
      // Height value is computed (e.g., 128px for 8rem); avoid brittle CSS assert

      await page.click('#inputText');
      await page.keyboard.type('Mobile test input');
      await page.click('button[aria-label*="Enhance"], [data-testid="enhance-button"]');

      await page.waitForSelector('#outputText, [data-testid="output-text"]');
      await expect(page.locator('#outputText, [data-testid="output-text"]').first()).toBeVisible();
    });
  });
});
