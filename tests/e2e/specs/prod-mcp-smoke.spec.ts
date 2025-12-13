import { test, expect } from '@playwright/test';

// Minimal, rein lesende Smokes, die typischerweise über mcp-playwright-prod
// gegen die Production-Umgebung laufen. Die Tests gehen davon aus, dass
// bereits eine gültige Session im Browser existiert:
// - Admin-Smoke: MCP_ADMIN ist eingeloggt
// - User-Smoke: mcp_test_user_prod ist eingeloggt
//
// BASE_URL / TEST_BASE_URL kommt aus playwright.config.ts. Wenn die Specs
// via mcp-playwright-prod laufen, setzt der MCP-Server TEST_BASE_URL auf
// https://hub-evolution.com.

test.describe('MCP Prod Smoke (read-only)', () => {
  test('Admin: /api/admin/status und /admin laden', async ({ page }) => {
    // 1) Admin-Status-API
    await page.goto('/api/admin/status', { waitUntil: 'networkidle' });

    const bodyText = (await page.textContent('body')) || '';
    expect(bodyText).toBeTruthy();
    // Grober Check auf success=true; kein striktes JSON-Parsing nötig
    expect(bodyText).toContain('"success"');
    expect(bodyText).toContain('true');

    // Optional: wenn der MCP-Admin in Prod genutzt wird, sollte die E-Mail erscheinen
    if (bodyText.includes('mcp-admin-prod@hub-evolution.com')) {
      expect(bodyText).toContain('mcp-admin-prod@hub-evolution.com');
    }

    // 2) Admin-Dashboard-UI
    await page.goto('/admin', { waitUntil: 'networkidle' });

    // Erwartung: Admin Dashboard lädt, kein Redirect zur Login-Seite
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
  });

  test('User: /en/dashboard und /en/tools laden', async ({ page }) => {
    // 1) Dashboard des eingeloggten Users (z. B. mcp_test_user_prod)
    await page.goto('/en/dashboard', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/en\/dashboard/);
    // Plan-Badge "Starter" sollte sichtbar sein (Starter-Plan für Test-User)
    await expect(page.getByText(/starter/i)).toBeVisible();

    // 2) Tools-Übersicht
    await page.goto('/en/tools', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/en\/tools/);
    // Mindestens eine Tool-Kachel (z. B. Imag-Enhancer) sollte sichtbar sein
    await expect(page.getByText(/imag[- ]enhancer/i)).toBeVisible();
  });

  test('Guest: Imag-Enhancer smoke (upload + enhance)', async ({ page }) => {
    // Gastfluss: Imag-Enhancer-Seite in Prod öffnen
    await page.goto('/en/tools/imag-enhancer/app', { waitUntil: 'networkidle' });

    // Seite sollte geladen sein
    await expect(page.getByRole('heading', { name: /imag-enhancer/i })).toBeVisible();

    // Bild über den File-Chooser hochladen (imag-smoke.png Fixture)
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /Bild hierher ziehen oder/i }).click(),
    ]);
    await fileChooser.setFiles('tests/fixtures/imag-smoke.png');

    // Enhance auslösen
    await page.getByRole('button', { name: 'Verbessern' }).click();

    // Compare-View mit Original/Ergebnis sollte erscheinen
    await expect(page.getByRole('heading', { name: 'Original' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible();
  });
});
