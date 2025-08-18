import { test, expect } from '@playwright/test';

/**
 * Verifiziert Sicherheitsverhalten der Reset-Password-Seite:
 * - Der token-Query-Parameter wird nach dem Rendern aus der URL entfernt.
 * - Andere Query-Parameter und der Hash bleiben erhalten.
 * - Das Hidden-Input enthält weiterhin den Token-Wert (vom initialen SSR-Render).
 */
test.describe('Reset Password - Token-Entfernung aus URL', () => {
  test('entfernt token aus URL nach Render, behält hidden input und andere URL-Bestandteile', async ({ page }) => {
    const token = 'e2e-token-abc123';
    const otherKey = 'ref';
    const otherVal = 'mail';
    const hash = '#section';

    // Middleware-Redirects vermeiden: Session/Splash überspringen und DE als Locale setzen
    await page.context().addCookies([
      { name: 'session_welcome_seen', value: '1', url: 'http://localhost:4321' },
      { name: 'pref_locale', value: 'de', url: 'http://localhost:4321' },
    ]);

    // Seite mit Token und weiterem Query-Param + Hash aufrufen
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}&${otherKey}=${encodeURIComponent(otherVal)}${hash}`);

    // Warten, bis der Client-Script die URL bereinigt hat
    await page.waitForFunction(() => !new URL(window.location.href).searchParams.has('token'));

    // Aktuelle URL prüfen
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('token=');

    const parsed = new URL(currentUrl);
    expect(parsed.searchParams.get(otherKey)).toBe(otherVal);
    expect(parsed.hash).toBe(hash);

    // Hidden-Input enthält weiterhin den ursprünglichen Token-Wert
    const hiddenToken = await page.locator('input[name="token"]').inputValue();
    expect(hiddenToken).toBe(token);

    // Sicherstellen, dass das Formular vorhanden ist und die Action korrekt ist
    const form = page.locator('form[action="/api/auth/reset-password"][method="post"]');
    await expect(form).toBeVisible();
  });
});

