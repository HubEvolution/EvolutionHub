import { test, expect } from '@playwright/test';

// Verify-Email Resend-Flow E2E
// Deckt ab:
// - Erfolgsfall mit generischer Success-Response und 60s Countdown
// - Fehlerfall: fehlender Email-Query -> Client-seitige Fehlermeldung, kein Request erforderlich
// - Serverfehler: simuliert 500 -> Fehleranzeige, Button-Reset
// - A11y: aria-busy/aria-disabled am Button, Fokus-Handling auf Meldungen, Rollen/Live-Regionen

test.describe('Verify-Email Resend Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      // Forward browser console to test stdout for debugging
      // eslint-disable-next-line no-console
      console.log(`[browser:${msg.type()}]`, msg.text());
    });
  });

  test('successfully resends verification email and starts countdown (default locale)', async ({ page }) => {
    // Route exists without locale prefix
    await page.goto('/verify-email?email=test@example.com');

    // Warten bis der VerifyEmailCoordinator das Client-Skript initialisiert hat
    await page.waitForFunction(() => (window as any).verifyEmailCleanup != null);

    // Intercept POST to simulate a 200 success
    await page.route('**/api/auth/resend-verification', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok' }),
      });
    });

    const resendBtn = page.locator('#resend-btn');
    const successMsg = page.locator('#success-message');

    // Vorbedingungen
    await expect(resendBtn).toBeVisible();
    await expect(resendBtn).toBeEnabled();

    // Click to resend
    await resendBtn.click();

    // Success-Meldung sichtbar und fokussiert
    await expect(successMsg).toBeVisible();
    await expect(successMsg).toBeFocused();

    // Button ist busy + disabled und zeigt Countdown-Label gemäß Template
    const template = (await resendBtn.getAttribute('data-label-countdown')) || '⏳ Resend ({s}s)';
    const expectedInitial = template.replace('{s}', '60');
    await expect(resendBtn).toBeDisabled();
    await expect(resendBtn).toHaveAttribute('aria-busy', 'true');
    await expect(resendBtn).toHaveText(expectedInitial);
  });

  test('shows client-side error when email query param is missing', async ({ page }) => {
    await page.goto('/verify-email');

    // Init des Client-Skripts abwarten
    await page.waitForFunction(() => (window as any).verifyEmailCleanup != null);

    const resendBtn = page.locator('#resend-btn');
    const errorMsg = page.locator('#error-message');

    await expect(resendBtn).toBeVisible();
    await resendBtn.click();

    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toBeFocused();

    // Button bleibt aktiv (kein Countdown)
    await expect(resendBtn).toBeEnabled();
  });

  test('handles server error (500) by showing error message and resetting button state', async ({ page }) => {
    await page.goto('/verify-email?email=test@example.com');

    // Init des Client-Skripts abwarten
    await page.waitForFunction(() => (window as any).verifyEmailCleanup != null);

    // Intercept POST to simulate a 500 error
    await page.route('**/api/auth/resend-verification', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: true, message: 'Server error' }),
      });
    });

    const resendBtn = page.locator('#resend-btn');
    const errorMsg = page.locator('#error-message');

    await resendBtn.click();

    // Fehler-Meldung sichtbar und fokussiert
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toBeFocused();

    // Button-Reset (nicht mehr busy/disabled)
    await expect(resendBtn).toBeEnabled();
    await expect(resendBtn).toHaveAttribute('aria-busy', 'false');
    await expect(resendBtn).toHaveAttribute('aria-disabled', 'false');
  });

  test('a11y attributes: success/message roles and live regions', async ({ page }) => {
    await page.goto('/verify-email?email=test@example.com');

    // Init des Client-Skripts abwarten
    await page.waitForFunction(() => (window as any).verifyEmailCleanup != null);

    // Intercept POST to simulate a 200 success
    await page.route('**/api/auth/resend-verification', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok' }),
      });
    });

    const resendBtn = page.locator('#resend-btn');
    const successMsg = page.locator('#success-message');
    const errorMsg = page.locator('#error-message');

    // Rollen/Live-Regionen sind korrekt gesetzt
    await expect(successMsg).toHaveAttribute('role', 'status');
    await expect(successMsg).toHaveAttribute('aria-live', 'polite');
    await expect(errorMsg).toHaveAttribute('role', 'alert');
    await expect(errorMsg).toHaveAttribute('aria-live', 'assertive');

    // Trigger success, um Fokus- und aria-* Verhalten zu prüfen
    await resendBtn.click();
    await expect(successMsg).toBeVisible();
    await expect(successMsg).toBeFocused();

    await expect(resendBtn).toHaveAttribute('aria-disabled', 'true');
    await expect(resendBtn).toHaveAttribute('aria-busy', 'true');
  });
});
