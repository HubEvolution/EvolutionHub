import { test, expect } from '@playwright/test';

// Hilfsfunktion: wartet bis ein Query-Parameter aus der URL entfernt wurde
async function expectParamRemoved(page: any, param: string) {
  await page.waitForFunction((p: string) => {
    const url = new URL(window.location.href);
    return !url.searchParams.has(p);
  }, param);
  const url = new URL(await page.url());
  expect(url.searchParams.has(param)).toBeFalsy();
}

// Hinweis: Die Login-Seite zeigt je nach Pfad /de oder / (EN) unterschiedliche Texte an.
// Wir prüfen beide Sprachvarianten tolerant über das Vorhandensein eines Toasts.

test.describe('Auth URL Status Handling', () => {
  test('Login: shows toast for loggedOut and cleans URL', async ({ page }) => {
    await page.goto('/login?loggedOut=true');
    // Warte auf mindestens einen Toast von Sonner
    await page.waitForSelector('[data-sonner-toast]');

    await expectParamRemoved(page, 'loggedOut');
  });

  test('Login: shows toast for error and cleans URL', async ({ page }) => {
    const code = 'InvalidCredentials';
    await page.goto(`/login?error=${code}`);

    await page.waitForSelector('[data-sonner-toast]');

    await expectParamRemoved(page, 'error');
  });

  test('Login: shows toast for success and cleans URL', async ({ page }) => {
    await page.goto('/login?success=1');

    await page.waitForSelector('[data-sonner-toast]');

    await expectParamRemoved(page, 'success');
  });

  test('Email-Verified: cleans status params without reload', async ({ page }) => {
    await page.goto('/email-verified?welcome=true');

    await expectParamRemoved(page, 'welcome');
    // Optional: Erfolg/Fehler-Params ebenso
    // (Seite nutzt keinen Toast, lediglich URL-Cleanup)
  });

  test('Password-Reset-Sent: cleans status params', async ({ page }) => {
    await page.goto('/auth/password-reset-sent?success=1');

    await expectParamRemoved(page, 'success');
  });
});
