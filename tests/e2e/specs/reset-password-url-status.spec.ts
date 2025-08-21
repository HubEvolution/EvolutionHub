import { test, expect } from '@playwright/test';

async function expectParamRemoved(page: any, param: string) {
  await page.waitForFunction((p: string) => {
    const url = new URL(window.location.href);
    return !url.searchParams.has(p);
  }, param);
  const url = new URL(await page.url());
  expect(url.searchParams.has(param)).toBeFalsy();
}

// Token handling is covered by existing specs:
// - reset-password-fragment-token.spec.ts
// - reset-password-token-removal.spec.ts
// Here we only verify success/error toasts + cleanup.

test.describe('Reset-Password URL Status Handling', () => {
  test('EN: success toast + cleanup', async ({ page }) => {
    await page.goto('/reset-password?success=1');
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('Password has been reset.');
    await expectParamRemoved(page, 'success');
  });

  test('EN: error toast + cleanup', async ({ page }) => {
    const code = 'InvalidToken';
    await page.goto(`/reset-password?error=${code}`);
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText(`Password reset failed (${code}).`);
    await expectParamRemoved(page, 'error');
  });

  test('DE: success toast + cleanup', async ({ page }) => {
    await page.goto('/de/reset-password?success=1');
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('Passwort wurde zurückgesetzt.');
    await expectParamRemoved(page, 'success');
  });

  test('DE: error toast + cleanup', async ({ page }) => {
    const code = 'InvalidToken';
    await page.goto(`/de/reset-password?error=${code}`);
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText(`Passwort-Zurücksetzen fehlgeschlagen (${code}).`);
    await expectParamRemoved(page, 'error');
  });
});
