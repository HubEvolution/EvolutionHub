import { test, expect } from '@playwright/test';

test('Debug Login Page', async ({ page }) => {
  // Zur Login-Seite navigieren
  await page.goto('http://localhost:4323/signin');

  // Warten, bis die Seite geladen ist
  await page.waitForLoadState('networkidle');

  // HTML-Inhalt der Seite ausgeben
  const html = await page.content();
  console.log('=== PAGE HTML ===');
  console.log(html);

  // Alle Links ausgeben
  const links = await page.$$eval('a', (elements) =>
    elements.map((e) => ({
      text: e.textContent?.trim(),
      href: e.getAttribute('href'),
      class: e.getAttribute('class'),
      'data-testid': e.getAttribute('data-testid'),
    }))
  );

  console.log('=== LINKS ===');
  console.log(JSON.stringify(links, null, 2));

  // Alle Buttons ausgeben
  const buttons = await page.$$eval('button, a[role="button"]', (elements) =>
    elements.map((e) => ({
      tag: e.tagName,
      text: e.textContent?.trim(),
      'aria-label': e.getAttribute('aria-label'),
      class: e.getAttribute('class'),
      'data-testid': e.getAttribute('data-testid'),
    }))
  );

  console.log('=== BUTTONS ===');
  console.log(JSON.stringify(buttons, null, 2));

  // Screenshot für die visuelle Überprüfung
  await page.screenshot({ path: 'debug-login-page.png' });
  console.log('Screenshot gespeichert als debug-login-page.png');
});
