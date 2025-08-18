import { test, expect } from '@playwright/test';

/**
 * Verifiziert Fragment-Token-Verhalten der Reset-Password-Seite:
 * - Token kann über Hash (#token=...) übergeben werden.
 * - Token wird nach Render aus der URL entfernt (Hash bereinigt).
 * - Andere Query-Parameter (z. B. ref) und andere Hash-Parameter bleiben erhalten.
 * - Hidden-Input enthält weiterhin den Token-Wert.
 */
test.describe('Reset Password - Fragment-Token Unterstützung', () => {
  test('liest #token, bereinigt URL und behält andere Parameter', async ({ page }) => {
    const token = 'e2e-frag-token-xyz789';
    const otherQueryKey = 'ref';
    const otherQueryVal = 'mail';
    const otherHashKey = 'section';
    const otherHashVal = 'welcome';

    // Middleware-Redirects vermeiden: Session/Splash überspringen und DE als Locale setzen
    await page.context().addCookies([
      { name: 'session_welcome_seen', value: '1', url: 'http://localhost:4321' },
      { name: 'pref_locale', value: 'de', url: 'http://localhost:4321' },
    ]);

    // Seite mit Fragment-Token und weiterem Hash-Param + zusätzlichem Query-Param aufrufen
    await page.goto(`/reset-password?${otherQueryKey}=${encodeURIComponent(otherQueryVal)}#token=${encodeURIComponent(token)}&${otherHashKey}=${encodeURIComponent(otherHashVal)}`);

    // Hidden-Input muss mit dem Fragment-Token befüllt sein
    await expect(page.locator('input[name="token"]')).toHaveValue(token);

    // Warten, bis die URL bereinigt ist (weder Query noch Hash enthalten token)
    await page.waitForFunction(() => {
      const u = new URL(window.location.href);
      return !u.searchParams.has('token') && !u.hash.includes('token=');
    });

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('token=');

    const parsed = new URL(currentUrl);
    // Query-Param bleibt erhalten
    expect(parsed.searchParams.get(otherQueryKey)).toBe(otherQueryVal);
    // Der übrige Hash-Param bleibt erhalten
    const hashParams = new URLSearchParams(parsed.hash.slice(1));
    expect(hashParams.get(otherHashKey)).toBe(otherHashVal);

    // Formular ist vorhanden und zeigt auf die korrekte API-Route
    const form = page.locator('form[action="/api/auth/reset-password"][method="post"]');
    await expect(form).toBeVisible();
  });
});
