import { test, expect } from '@playwright/test';

async function expectParamRemoved(page: any, param: string) {
  await page.waitForFunction((p: string) => {
    const url = new URL(window.location.href);
    return !url.searchParams.has(p);
  }, param);
  const url = new URL(await page.url());
  expect(url.searchParams.has(param)).toBeFalsy();
}

test.describe('Forgot-Password URL Status Handling', () => {
  test('EN: success toast + cleanup', async ({ page }) => {
    await page.goto('/forgot-password?success=1');
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('Password reset email sent.');
    await expectParamRemoved(page, 'success');
  });

  test('EN: error toast + cleanup', async ({ page }) => {
    const code = 'EmailNotFound';
    await page.goto(`/forgot-password?error=${code}`);
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText(`Failed to send reset email (${code}).`);
    await expectParamRemoved(page, 'error');
  });

  test('DE: success toast + cleanup', async ({ page }) => {
    await page.goto('/de/forgot-password?success=1');
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('E-Mail zum Zurücksetzen wurde gesendet.');
    await expectParamRemoved(page, 'success');
  });

  test('DE: error toast + cleanup', async ({ page }) => {
    const code = 'EmailNotFound';
    await page.goto(`/de/forgot-password?error=${code}`);
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText(`Senden fehlgeschlagen (${code}).`);
    await expectParamRemoved(page, 'error');
  });
});
