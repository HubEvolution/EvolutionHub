import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// This E2E focuses solely on the Imag Enhancer flow (upload -> enhance -> compare -> download)
// Assumes the dev worker is running locally and the enhancer API responds with a success envelope
// in development (dev echo).

const ENHANCER_PATH_EN = '/en/tools/imag-enhancer/app';
const ENHANCER_PATH_DE = '/tools/imag-enhancer/app';

async function gotoEnhancer(page: any, projectName: string) {
  const preferDE = /(^|-)de$/i.test(projectName);
  const candidates = preferDE
    ? [ENHANCER_PATH_DE, '/de/tools/imag-enhancer/app', ENHANCER_PATH_EN]
    : [ENHANCER_PATH_EN, ENHANCER_PATH_DE, '/de/tools/imag-enhancer/app'];

  // Helper to verify page mounted expected elements
  async function mounted(): Promise<boolean> {
    const dropzone = page.locator('[aria-label="Image upload dropzone"]').first();
    const modelSelect = page.locator('select#model').first();
    try {
      await Promise.race([
        dropzone.waitFor({ state: 'attached', timeout: 4000 }),
        modelSelect.waitFor({ state: 'attached', timeout: 4000 }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  for (const path of candidates) {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (res && res.status() >= 400) continue;
    if (await mounted()) return;
  }
  // Fall back to last candidate without throwing to let test continue with generic waits
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Imag Enhancer', () => {
  test('upload → enhance → compare → download', async ({ page }, testInfo) => {
    // Seed a fresh guest_id cookie to avoid hitting usage quota across runs
    const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:8789';
    const base = new URL(BASE_URL);
    const freshGuest = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await page.context().addCookies([
      { name: 'guest_id', value: freshGuest, domain: base.hostname, path: '/' },
    ]);

    await gotoEnhancer(page, testInfo.project.name);
    await page.waitForLoadState('domcontentloaded');

    // Dismiss possible cookie consent overlay (EN/DE variants)
    const acceptConsent = page.getByRole('button', { name: /(Accept|Akzeptieren|Alle akzeptieren|Zustimmen)/i });
    if (await acceptConsent.isVisible().catch(() => false)) {
      await acceptConsent.click().catch(() => {});
    }

    // If compare slider is already visible (residual state), reset to show dropzone
    const existingSlider = page.getByRole('slider');
    if (await existingSlider.isVisible().catch(() => false)) {
      const startOver = page.getByRole('button', { name: /Start over/i });
      if (await startOver.isVisible().catch(() => false)) {
        await startOver.click();
      }
    }

    // Upload a small PNG via hidden file input inside the dropzone (sr-only)
    // Wait for Dropzone or ModelSelect to be attached (not necessarily visible yet)
    const dropzone = page.locator('[aria-label="Image upload dropzone"]');
    const modelSelectProbe = page.locator('select#model');
    await Promise.race([
      dropzone.first().waitFor({ state: 'attached', timeout: 15000 }),
      modelSelectProbe.first().waitFor({ state: 'attached', timeout: 15000 })
    ]);
    // Prefer file input within dropzone; fallback to any file input on page
    let fileInput = dropzone.locator('input[type="file"]').first();
    if (!(await fileInput.count())) {
      fileInput = page.locator('input[type="file"]').first();
    }
    await fileInput.waitFor({ state: 'attached' });
    const sample = path.resolve(__dirname, '../../../public/favicons/apple-touch-icon.png');
    await fileInput.setInputFiles(sample);

    // Verify model select exists and switch to Real-ESRGAN (supports scale + face enhance)
    const modelSelect = page.locator('select#model');
    await expect(modelSelect).toBeVisible();
    await modelSelect.selectOption('nightmareai/real-esrgan:latest');

    // Capability-driven controls: scale buttons visible
    const scaleX2 = page.getByRole('button', { name: /^x2$/ });
    const scaleX4 = page.getByRole('button', { name: /^x4$/ });
    await expect(scaleX2).toBeVisible();
    await expect(scaleX4).toBeVisible();
    await scaleX2.click();
    await scaleX4.click();

    // Capability-driven controls: face enhance visible
    const faceEnhance = page.getByLabel(/Face enhance/i);
    await expect(faceEnhance).toBeVisible();
    await faceEnhance.check();

    // Click Enhance (handle EN/DE labels)
    const enhanceBtn = page.getByRole('button', { name: /(Enhance|Verbessern)/i });
    await expect(enhanceBtn).toBeEnabled();
    await enhanceBtn.click();

    // Expect the compare slider (role=slider) to appear
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible();

    // Toast/i18n: success message (English default or German translation)
    const successToast = page.getByText(/(Image enhanced successfully|Bild erfolgreich verbessert)/i);
    await expect(successToast).toBeVisible();

    // Compare labels (i18n)
    await expect(page.getByText(/Before|Vorher/i)).toBeVisible();
    await expect(page.getByText(/After|Nachher/i)).toBeVisible();

    // Move the slider via keyboard to verify interaction
    await slider.focus();
    await slider.press('ArrowRight');
    await slider.press('ArrowLeft');
    await slider.press('Home'); // center

    // Verify aria-valuenow increases with PageUp
    const getVal = async () => Number((await slider.getAttribute('aria-valuenow')) || '0');
    const v0 = await getVal();
    await slider.press('PageUp');
    const v1 = await getVal();
    expect(v1).toBeGreaterThanOrEqual(v0);

    // Global shortcut: R resets to 50
    await page.keyboard.press('R');
    const vR = await getVal();
    expect(vR).toBe(50);

    // Press-and-Hold with Space toggles opacity of handle (opacity-0)
    await page.keyboard.down(' ');
    await expect(slider).toHaveClass(/opacity-0/);
    await page.keyboard.up(' ');
    await expect(slider).not.toHaveClass(/opacity-0/);

    // Verify download link is present
    const downloadLink = page.locator('a[download]');
    await expect(downloadLink).toBeVisible();

    // Switch to a model without capabilities and assert controls are hidden
    // After result, the select is behind a small 'Change model' pill
    const changeModel = page.getByRole('button', { name: /Change model/i });
    if (await changeModel.isVisible().catch(() => false)) {
      await changeModel.click();
    }
    await modelSelect.selectOption('tencentarc/gfpgan:latest');
    await expect(page.getByRole('button', { name: /^x2$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^x4$/ })).toHaveCount(0);
    await expect(page.getByLabel(/Face enhance/i)).toHaveCount(0);

    // Attach a screenshot as artifact
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('enhancer-final', { body: png, contentType: 'image/png' });
  });
});
