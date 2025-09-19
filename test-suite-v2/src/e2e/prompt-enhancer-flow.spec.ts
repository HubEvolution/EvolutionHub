import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Prompt Enhancer Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set base URL to Wrangler dev server if available, else local
    await page.goto('/en/tools/prompt-enhancer');
  });

  test('Happy Path - Enhance Flow in English', async ({ page }) => {
    await page.goto('/en/tools/prompt-enhancer');

    // Check initial form elements
    await expect(page.locator('#inputText')).toBeVisible();
    await expect(page.locator('#mode')).toBeVisible();
    await expect(page.locator('button[aria-label*="Enhance prompt"]')).toBeVisible(); // Approximate aria-label

    // Input text (valid)
    await page.fill('#inputText', 'Write a creative story about a robot.');

    // Select mode
    await page.selectOption('#mode', 'creative');

    // Click enhance
    await page.click('button[aria-label*="Enhance prompt"]');
    await page.waitForSelector('#outputText', { state: 'visible' });

    // Check output visible
    await expect(page.locator('#outputText')).toBeVisible();
    await expect(page.locator('#outputText')).not.toBeEmpty();

    // Check usage section
    const usageTitle = page.locator('h3:has-text("Usage")'); // t('pages.tools.prompt-enhancer.usage.title')
    await expect(usageTitle).toBeVisible();

    // Check safety section
    const safetyTitle = page.locator('h3:has-text("Safety")'); // t('pages.tools.prompt-enhancer.safety.title')
    await expect(safetyTitle).toBeVisible();
  });

  test('Happy Path - Enhance Flow in German', async ({ page }) => {
    await page.goto('/de/tools/prompt-enhancer');

    // Check i18n labels
    await expect(page.locator('label[for="inputText"]')).toHaveText('Eingabe-Prompt'); // Approximate t('pages.tools.prompt-enhancer.form.inputLabel')
    await expect(page.locator('label[for="mode"]')).toHaveText('Modus'); // t('pages.tools.prompt-enhancer.form.modeLabel')

    // Input text
    await page.fill('#inputText', 'Schreibe eine kreative Geschichte über einen Roboter.');

    // Select mode (labels in German)
    await page.selectOption('#mode', { label: 'Kreativ' }); // t('pages.tools.prompt-enhancer.form.mode.creative')

    // Click enhance
    await page.click('button[aria-label*="Prompt verbessern"]'); // Approximate German aria-label
    await page.waitForSelector('#outputText', { state: 'visible' });

    // Check output and sections with German titles
    await expect(page.locator('#outputText')).toBeVisible();
    await expect(page.locator('h3:has-text("Nutzung")')).toBeVisible(); // Usage in de
    await expect(page.locator('h3:has-text("Sicherheit")')).toBeVisible(); // Safety in de
  });

  test('Error - Invalid Input (Empty)', async ({ page }) => {
    await page.goto('/en/tools/prompt-enhancer');

    // Fill empty and click enhance
    await page.click('button[aria-label*="Enhance prompt"]');

    // Expect error message
    const errorLocator = page.locator('[role="alert"], .error, #inputError'); // Common error display
    await expect(errorLocator).toBeVisible();
    await expect(errorLocator).toContainText('required'); // t('pages.tools.prompt-enhancer.form.error.required')
  });

  test('Error - Invalid Input (Too Long)', async ({ page }) => {
    await page.goto('/en/tools/prompt-enhancer');

    // Fill too long text (>1000 chars)
    const longText = 'a'.repeat(1001);
    await page.fill('#inputText', longText);

    // Select mode and click
    await page.selectOption('#mode', 'creative');
    await page.click('button[aria-label*="Enhance prompt"]');

    // Expect error
    const errorLocator = page.locator('[role="alert"], .error, #inputError');
    await expect(errorLocator).toContainText('length'); // t('pages.tools.prompt-enhancer.form.error.length')
  });

  test('Error - Quota Exceeded (Mock 429)', async ({ page }) => {
    await page.route('/api/prompt-enhance', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { type: 'QUOTA_EXCEEDED', message: 'Rate limit exceeded' }
        })
      });
    });

    await page.goto('/en/tools/prompt-enhancer');
    await page.fill('#inputText', 'Test input');
    await page.selectOption('#mode', 'creative');
    await page.click('button[aria-label*="Enhance prompt"]');

    // Expect error message
    const errorLocator = page.locator('[role="alert"], .error');
    await expect(errorLocator).toContainText('rateLimit'); // t('pages.tools.prompt-enhancer.form.error.rateLimit')
  });

  test('Error - Flag Off (PUBLIC_PROMPT_ENHANCER_V1=false)', async ({ context, page }) => {
    // Set env flag off via init script
    await context.addInitScript(() => {
      (window as any).PUBLIC_PROMPT_ENHANCER_V1 = 'false';
    });

    await page.goto('/en/tools/prompt-enhancer');

    // Expect component not rendered or gated message
    await expect(page.locator('#inputText')).not.toBeVisible(); // Or check for gating UI
    // Alternative: expect gated message if implemented
  });

  test('Accessibility - WCAG AA Compliance', async ({ page }) => {
    await page.goto('/en/tools/prompt-enhancer');

    // Run Axe for a11y
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Specific checks: labels, ARIA
    await expect(page.locator('label[for="inputText"]')).toBeVisible();
    await expect(page.locator('#inputText')).toHaveAttribute('aria-describedby', 'inputError'); // From code
    await expect(page.locator('button[aria-label*="Enhance"]')).toHaveAttribute('aria-label', expect.stringContaining('Enhance'));
  });

  test('Mobile Responsiveness - Touch Input', async ({ page }) => {
    test.use({
      viewport: { width: 375, height: 667 }
    });

    await page.goto('/en/tools/prompt-enhancer');

    // Check form responsive
    await expect(page.locator('#inputText')).toBeVisible();
    await expect(page.locator('#inputText')).toHaveCSS('height', '8rem'); // h-32 responsive

    // Simulate touch input
    await page.tap('#inputText');
    await page.keyboard.type('Mobile test input');
    await page.selectOption('#mode', 'creative');
    await page.tap('button[aria-label*="Enhance"]');

    // Wait and check output
    await page.waitForSelector('#outputText');
    await expect(page.locator('#outputText')).toBeVisible();
  });
});