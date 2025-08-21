import { test, expect } from '@playwright/test';

async function expectParamRemoved(page: any, param: string) {
  await page.waitForFunction((p: string) => {
    const url = new URL(window.location.href);
    return !url.searchParams.has(p);
  }, param);
  const url = new URL(await page.url());
  expect(url.searchParams.has(param)).toBeFalsy();
}

// Optional: Only relevant if backend uses URL params on redirect.
// We still verify the page gracefully handles these params.

test.describe('Register URL Status Handling (Optional)', () => {
  test('EN: success toast + cleanup', async ({ page }) => {
    await page.goto('/register?success=1');
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('Registration successful.');
    await expectParamRemoved(page, 'success');
  });

  test('EN: error toast + cleanup', async ({ page }) => {
    const code = 'UsernameTaken';
    await page.goto(`/register?error=${code}`);
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText(`Registration failed (${code}).`);
    await expectParamRemoved(page, 'error');
  });

  test('DE: success toast + cleanup', async ({ page }) => {
    await page.goto('/de/register?success=1');
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText('Registrierung erfolgreich.');
    await expectParamRemoved(page, 'success');
  });

  test('DE: error toast + cleanup', async ({ page }) => {
    const code = 'UsernameTaken';
    await page.goto(`/de/register?error=${code}`);
    await page.waitForSelector('[data-sonner-toast]');
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toContainText(`Registrierung fehlgeschlagen (${code}).`);
    await expectParamRemoved(page, 'error');
  });
});
