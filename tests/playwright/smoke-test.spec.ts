import { test, expect, setupPage } from './port-helper';

test('basic test', async ({ page, navigateTo }) => {
  console.log('Starte einfachen Test...');

  // Navigiere zur Startseite mit automatischer Port-Erkennung
  const { url } = await setupPage(page, '/');
  console.log('Seite erfolgreich geladen:', url);

  // Überprüfe den Seitentitel
  const title = await page.title();
  console.log('Seitentitel:', title);

  // Einfache Überprüfung, ob ein Element vorhanden ist
  const header = page.locator('header, h1, h2, h3').first();
  await expect(header).toBeVisible({ timeout: 10000 });
  console.log('Header gefunden:', await header.textContent());

  console.log('Test erfolgreich abgeschlossen');
});
