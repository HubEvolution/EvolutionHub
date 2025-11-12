import { test, expect } from '@playwright/test';
import { navigateToTool, selectOption, seedGuestId } from '../../../fixtures/tool-helpers';
import { dismissCookieConsent } from '../../../fixtures/common-helpers';

const SAMPLE_IMAGE = 'public/favicons/apple-touch-icon.png';

function mockUsage(page, payload: any) {
  return page.route('**/api/ai-image/usage**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: payload }),
    });
  });
}

test.describe('Image Enhancer — Gating & CTA', () => {
  test('Guest sees Upgrade CTA', async ({ page }) => {
    await seedGuestId(page);
    await mockUsage(page, {
      ownerType: 'guest',
      usage: { used: 0, limit: 3, resetAt: null },
      limits: { user: 10, guest: 3 },
      plan: null,
      entitlements: { plan: 'free', maxUpscale: 2, faceEnhance: false, dailyLimit: 3 },
    });

    await navigateToTool(page, 'image-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);

    const toolbar = page.getByLabel('Enhancer actions toolbar');
    const upgradeLink = toolbar.getByRole('link', { name: /Upgrade/i });
    await expect(upgradeLink).toBeVisible();
  });

  test('Quota reached shows Upgrade CTA', async ({ page }) => {
    await seedGuestId(page);
    await mockUsage(page, {
      ownerType: 'user',
      usage: { used: 10, limit: 10, resetAt: null },
      limits: { user: 10, guest: 3 },
      plan: 'free',
      entitlements: { plan: 'free', maxUpscale: 2, faceEnhance: false, dailyLimit: 10 },
    });

    await navigateToTool(page, 'image-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);

    const toolbar = page.getByLabel('Enhancer actions toolbar');
    const upgradeLink = toolbar.getByRole('link', { name: /Upgrade/i });
    await expect(upgradeLink).toBeVisible();
  });

  test('Feature-blocked: x4 and FaceEnhance are gated', async ({ page }) => {
    await seedGuestId(page);
    await mockUsage(page, {
      ownerType: 'user',
      usage: { used: 0, limit: 10, resetAt: null },
      limits: { user: 10, guest: 3 },
      plan: 'free',
      entitlements: { plan: 'free', maxUpscale: 2, faceEnhance: false, dailyLimit: 10 },
    });

    await navigateToTool(page, 'image-enhancer', { locale: 'en' });
    await dismissCookieConsent(page);

    await page
      .waitForResponse(
        (r) => r.url().includes('/api/ai-image/usage') && r.request().method() === 'GET',
        { timeout: 10000 }
      )
      .catch(() => {});

    // Use shared helper to upload the image reliably across DOM variations
    await (
      await import('../../../fixtures/tool-helpers')
    ).ImageEnhancer.uploadImage(page, SAMPLE_IMAGE);

    // Select Replicate ESRGAN when available; otherwise select Workers AI fallback
    const replicateValue =
      'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a';
    const cfFallbackValue = '@cf/runwayml/stable-diffusion-v1-5-img2img';
    const forceCF =
      (process.env.FORCE_CF_MODELS || '').toLowerCase() === '1' ||
      (process.env.FORCE_CF_MODELS || '').toLowerCase() === 'true';
    const modelSelect = page.locator('select#model, [data-testid="model-select"]').first();
    const replicateAvailable =
      (await modelSelect.locator(`option[value="${replicateValue}"]`).count()) > 0;
    const useReplicate = replicateAvailable && !forceCF;
    await selectOption(
      page,
      'select#model, [data-testid="model-select"]',
      useReplicate ? replicateValue : cfFallbackValue
    );

    const x4 = page.getByRole('button', { name: /^x4$/ });
    const face = page.getByLabel(/Face enhance/i);

    if (useReplicate) {
      // When Replicate is present and user is gated, x4 shows Upgrade and disabled style
      await expect(x4).toHaveAttribute('title', /Upgrade/i);
      await expect(x4).toHaveClass(/cursor-not-allowed|opacity-60/);
      if (await face.isVisible().catch(() => false)) {
        await expect(face).toBeDisabled();
        await expect(face).toHaveAttribute('title', /Upgrade/i);
      }
    } else {
      // In testing/local (Workers AI only), these capabilities are not available at all
      await expect(x4).toHaveCount(0);
      if (await face.isVisible().catch(() => false)) {
        await expect(face).toBeDisabled();
      }
      // Still show Upgrade CTA in toolbar (already validated in other tests)
      const toolbar = page.getByLabel('Enhancer actions toolbar');
      await expect(toolbar.getByRole('link', { name: /Upgrade/i })).toBeVisible();
    }
  });
});
