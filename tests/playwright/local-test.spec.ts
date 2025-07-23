import { test, expect, setupPage } from './port-helper';

test('check homepage loads', async ({ page, navigateTo }) => {
  // 1. Navigiere zur Startseite mit automatischer Port-Erkennung
  const { url } = await setupPage(page, '/');
  console.log('Startseite geladen:', url);
  
  // 2. Warte, bis die Seite vollständig geladen ist
  await page.waitForLoadState('networkidle');
  
  // 3. Überprüfe, ob die Hauptseite geladen wurde
  const title = await page.title();
  expect(title).toBeTruthy();
  
  // 4. Überprüfe, ob wichtige Elemente vorhanden sind
  const header = page.locator('header');
  await expect(header).toBeVisible();
  
  console.log('Test erfolgreich abgeschlossen');
});
