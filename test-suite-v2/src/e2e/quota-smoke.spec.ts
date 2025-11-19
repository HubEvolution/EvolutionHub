import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../fixtures/auth-helpers';

// NOTE:
// Diese Datei ist als Staging-Tool gedacht und wird NICHT automatisch in jedem CI-Run ausgeführt.
// Setze BASE_URL oder TEST_BASE_URL in der Playwright-Config bzw. per Env-Var,
// um explizit gegen Staging zu laufen (z. B. https://staging.hub-evolution.com).

// Smoke A: Dashboard-Quota vs. Header-Quota
// Prüft, dass die im Dashboard angezeigte monatliche Quota mit dem Wert im Header-Menü übereinstimmt.
test.skip('dashboard quota matches header quota (staging smoke)', async ({ page }) => {
  // TODO: loginAsTestUser sollte einen validen Staging-User mit Plan (z. B. pro) einloggen.
  await loginAsTestUser(page, 'staging-pro-001');

  await page.goto('/en/dashboard');

  const usedText = await page.textContent('#quota-used');
  const limitText = await page.textContent('#quota-limit');
  const remainingText = await page.textContent('#quota-remaining');

  const used = Number(usedText ?? '0');
  const limit = Number(limitText ?? '0');
  const remaining = Number(remainingText ?? '0');

  expect(limit).toBeGreaterThanOrEqual(0);
  expect(used).toBeGreaterThanOrEqual(0);
  expect(remaining).toBeGreaterThanOrEqual(0);

  if (limit > 0) {
    expect(used + remaining).toBeLessThanOrEqual(limit + 1);
  }

  // Header-Menü öffnen und mobile/desktop Quota prüfen
  await page.click('#user-menu-button');
  const headerQuotaText = await page.textContent('#user-quota');
  const headerQuota = Number(headerQuotaText ?? '0');

  // Erwartung: Header zeigt die verbleibende Quota an (gleiche Berechnung wie Dashboard)
  if (limit > 0) {
    expect(headerQuota).toBe(remaining);
  }
});

// Smoke B: Image Enhancer Guest-Flow
// Prüft, dass der Image Enhancer als Gast grundsätzlich funktioniert und keinen harten Fehler wirft.
test.skip('image enhancer guest flow works as staging smoke', async ({ page }) => {
  await page.goto('/tools/imag-enhancer/app');

  // TODO: Pfad zu einem kleinen Testbild im Repo anpassen
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/eh_test.jpg');

  // TODO: Stabilen Selector für den Enhance-Button wählen (data-testid o. Ä.)
  const enhanceButton = page.locator('[data-testid="enhance-button"]');
  await enhanceButton.click();

  // Warten, bis ein Resultat erscheint (z. B. Bild oder Result-Komponente)
  // Selector muss ggf. an die tatsächliche UI angepasst werden.
  const result = page.locator('[data-testid="enhancer-result"]');
  await expect(result).toBeVisible({ timeout: 30000 });

  // Optional könnte hier später geprüft werden, ob ein Quota-Banner erscheint,
  // wenn Usage das Limit erreicht. Für Staging-Smoketests genügt vorerst,
  // dass der Flow ohne harten Fehler durchläuft.
});
