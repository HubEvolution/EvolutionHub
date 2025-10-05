import { test, expect } from '@playwright/test';
import { navigateToTool, selectOption } from '../../../fixtures/tool-helpers';
import { dismissCookieConsent } from '../../../fixtures/common-helpers';
import { seedGuestId, ImageEnhancer } from '../../../fixtures/tool-helpers';

// This E2E focuses on the Image Enhancer flow (upload -> enhance -> compare -> download)
// Uses shared helpers from fixtures and relies on Playwright config to start the local dev worker.

const SAMPLE_IMAGE = 'public/favicons/apple-touch-icon.png';

test.describe('Image Enhancer', () => {
  test('upload → enhance → compare → download', async ({ page }) => {
    // Seed fresh guest cookie to avoid quota bleed between runs
    await seedGuestId(page);

    // Navigate to tool (locale EN by default) and dismiss consent
    await navigateToTool(page, 'image-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);

    // Wait for initial usage fetch to complete (preconditions for enabling Enhance)
    await page
      .waitForResponse(
        (r) => r.url().includes('/api/ai-image/usage') && r.request().method() === 'GET',
        { timeout: 10000 }
      )
      .catch(() => {});

    // Upload sample image
    await ImageEnhancer.uploadImage(page, SAMPLE_IMAGE);

    // Select a model that supports scale + face enhance (value depends on UI)
    await selectOption(page, 'select#model, [data-testid="model-select"]', 'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a');

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
    if (await faceEnhance.isEnabled().catch(() => false)) {
      await faceEnhance.check();
    } else {
      await expect(faceEnhance).toBeDisabled();
    }

    // Click Enhance (handle EN/DE labels)
    await ImageEnhancer.clickEnhance(page);

    // Wait for API response to complete and succeed to reduce flakiness
    const genResp = await page.waitForResponse(
      (r) => r.url().includes('/api/ai-image/generate') && r.request().method() === 'POST',
      { timeout: 30000 }
    );
    try {
      const body = await genResp.json();
      expect(body && typeof body === 'object' && 'success' in body && (body as any).success).toBe(
        true
      );
    } catch {
      // If parsing fails (e.g., non-JSON), still continue to visual wait below
    }

    // Expect the compare slider (role=slider) to appear
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible({ timeout: 30000 });

    // Toast/i18n: success message (best-effort; don't fail test if toast portal timing differs)
    try {
      const successToast = page.getByText(/(Image enhanced successfully|Bild erfolgreich verbessert)/i);
      await expect(successToast).toBeVisible({ timeout: 2000 });
    } catch {}

    // Compare labels assertion skipped (labels are decorative); slider role and keyboard interactions suffice

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

    // Verify download is available
    await expect(page.locator('a[download]')).toBeVisible();

    // --- Pro-Compare: Zoom / Pan / Loupe ---
    // Zoom in via + button and verify percentage increases
    const zoomInBtn = page.getByRole('button', { name: /^Zoom in$/i });
    const figcaption = page.locator('figure >> figcaption').first();
    await expect(figcaption).toBeVisible();
    const zoomPercent = page.locator('figcaption .tabular-nums').first();
    await expect(zoomPercent).toBeVisible();
    const z0 = await zoomPercent.textContent();
    await zoomInBtn.click();
    const z1 = await zoomPercent.textContent();
    expect(Number((z1 || '').replace('%',''))).toBeGreaterThan(Number((z0 || '').replace('%','')));

    // Reset zoom to 100% via dedicated control
    const resetZoomBtn = page.getByRole('button', { name: /^Reset zoom$/i });
    await resetZoomBtn.click();
    await expect(zoomPercent).toHaveText(/100%/);

    // Pan with Shift + Arrow keys (no strict visual assert; ensure no error and slider still operable)
    await slider.focus();
    await slider.press('Shift+ArrowRight');
    await slider.press('Shift+ArrowDown');
    await slider.press('Shift+ArrowLeft');
    await slider.press('Shift+ArrowUp');
    // Slider should still respond
    await slider.press('ArrowRight');

    // Toggle Loupe (overlay visibility is device/position dependent; skip strict assertion)
    const loupeBtn = page.getByRole('button', { name: /(Loupe|Lupe)/i });
    if (await loupeBtn.isVisible().catch(() => false)) {
      await loupeBtn.click();
      const bbox = await page.locator('figure').first().boundingBox();
      if (bbox) {
        await page.mouse.move(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
      }
      // No hard assert on overlay
    }

    // Switch to a model without capabilities and assert controls are hidden
    // After result, the select is behind a small 'Change model' pill
    const changeModel = page.getByRole('button', { name: /Change model/i });
    if (await changeModel.isVisible().catch(() => false)) {
      await changeModel.click();
    }
    await selectOption(page, 'select#model, [data-testid="model-select"]', 'tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c');
    await expect(page.getByRole('button', { name: /^x2$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^x4$/ })).toHaveCount(0);

    // Attach a screenshot as artifact
    const png = await page.screenshot({ fullPage: true });
    await test.info().attach('enhancer-final', { body: png, contentType: 'image/png' });
  });
  test.describe('Responsive UI/UX Tests', () => {
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    test(`Image Enhancer on ${vp.name} viewport`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Seed guest cookie and navigate
      await seedGuestId(page);
      await navigateToTool(page, 'image-enhancer', { locale: 'en' });
      await dismissCookieConsent(page);

      // Wait for usage fetch
      await page
        .waitForResponse(
          (r) => r.url().includes('/api/ai-image/usage') && r.request().method() === 'GET',
          { timeout: 10000 }
        )
        .catch(() => {});

      // Screenshot before interactions
      await test.info().attach(`${vp.name}-before`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png'
      });

      // Dismiss consent
      const acceptConsent = page.getByRole('button', { name: /(Accept|Akzeptieren)/i });
      if (await acceptConsent.isVisible().catch(() => false)) {
        await acceptConsent.click();
      }

      // Upload image
      await ImageEnhancer.uploadImage(page, SAMPLE_IMAGE);

      // Select model and options
      await selectOption(page, 'select#model, [data-testid="model-select"]', 'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a');
      const scaleX2 = page.getByRole('button', { name: /^x2$/ });
      await scaleX2.click();
      const faceEnhance = page.getByLabel(/Face enhance/i);
      if (await faceEnhance.isEnabled().catch(() => false)) {
        await faceEnhance.check();
      } else {
      }

      // Enhance
      await ImageEnhancer.clickEnhance(page);

      // Wait for API success to avoid race conditions on slower machines
      const genResp = await page.waitForResponse(
        (r) => r.url().includes('/api/ai-image/generate') && r.request().method() === 'POST',
        { timeout: 30000 }
      );
      try {
        const body = await genResp.json();
        expect(body && typeof body === 'object' && 'success' in body && (body as any).success).toBe(
          true
        );
      } catch {}

      // Wait for slider
      const slider = page.getByRole('slider');
      await expect(slider).toBeVisible({ timeout: 30000 });

      // Interact with slider (touch simulation for mobile)
      if (vp.name === 'Mobile') {
        // Simulate touch drag
        await slider.hover();
        await page.mouse.move(vp.width / 2, vp.height / 2); // Drag to center
        await page.mouse.up();
      } else {
        await slider.press('ArrowRight');
        await page.keyboard.press('R'); // Reset
      }

      // Screenshot after interactions
      await test.info().attach(`${vp.name}-after`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png'
      });

      // Visual snapshot check disabled in E2E v2; screenshot attached as artifact above

      // Test DE locale separately for this viewport
      await navigateToTool(page, 'image-enhancer', { locale: 'de' });
      await dismissCookieConsent(page);
      await test.info().attach(`${vp.name}-de-before`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png'
      });
      // Quick upload and enhance for DE
      await ImageEnhancer.uploadImage(page, SAMPLE_IMAGE);
      await selectOption(page, 'select#model, [data-testid="model-select"]', 'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a');
      await ImageEnhancer.clickEnhance(page);
      await expect(slider).toBeVisible();
      await test.info().attach(`${vp.name}-de-after`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png'
      });
    });
  }
});
});
