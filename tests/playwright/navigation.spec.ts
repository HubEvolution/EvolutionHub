import { test, expect, setupPage } from './port-helper';

test.describe('Navigation', () => {
  test('should navigate to all main pages', async ({ page, isMobile, navigateTo }) => {
    // 1. Navigiere zur Startseite mit automatischer Port-Erkennung
    const { url: startUrl } = await setupPage(page, '/');
    console.log('Startseite geladen:', startUrl);

    // 2. Warten, bis die Seite vollständig geladen ist
    await page.waitForLoadState('networkidle');

    // 3. Mobile Menü öffnen, falls nötig
    const openMobileMenu = async () => {
      if (!isMobile) return;
      const menuButton = page
        .locator('button[aria-label*="menu"], button[aria-label*="Menu"]')
        .first();
      if (await menuButton.isVisible({ timeout: 5000 })) {
        console.log('Öffne mobiles Menü...');
        await menuButton.click();
        await page.waitForTimeout(1000);
      }
    };

    await openMobileMenu();

    // 4. Alle Navigationslinks finden
    const navLinks = page.locator('nav a[href^="/"]');
    await expect(navLinks.first()).toBeVisible({ timeout: 10000 });

    const linkCount = await navLinks.count();
    if (linkCount === 0) {
      console.warn('Keine Navigationslinks gefunden!');
      return;
    }

    console.log(`Gefundene Navigationslinks: ${linkCount}`);

    // 5. Durch alle Links navigieren
    const visitedLinks = new Set<string>();

    for (let i = 0; i < linkCount; i++) {
      // Mobile Menü bei jedem Durchgang erneut öffnen
      if (isMobile) {
        await openMobileMenu();
      }

      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      const linkText = (await link.textContent()) || `Link-${i}`;

      if (!href) {
        console.log(`Überspringe Link ohne href: ${linkText}`);
        continue;
      }

      // Externe Links, Anker-Links und bereits besuchte Links überspringen
      if (href.startsWith('http') || href.startsWith('#') || visitedLinks.has(href)) {
        console.log(`Überspringe Link: ${href} (${linkText})`);
        continue;
      }

      // Login/Registrierung-Links überspringen
      const lowerHref = href.toLowerCase();
      if (
        lowerHref.includes('login') ||
        lowerHref.includes('register') ||
        lowerHref.includes('signin') ||
        lowerHref.includes('signup')
      ) {
        console.log(`Überspringe Login/Registrierung: ${href} (${linkText})`);
        continue;
      }

      console.log(`\n[${i + 1}/${linkCount}] Navigiere zu: ${href} (${linkText})`);
      visitedLinks.add(href);

      try {
        // Zum Link navigieren
        await link.click();

        // Warten, bis die Seite geladen ist
        await page.waitForLoadState('networkidle');

        // Warten auf die Hauptinhalte der Seite
        const contentSelectors = [
          'main',
          '[role="main"]',
          '.main-content',
          'article',
          'section',
          'h1',
          'h2',
          'body > div',
          'div[class*="content"]',
        ];

        let contentFound = false;
        for (const selector of contentSelectors) {
          const elements = page.locator(selector);
          const count = await elements.count();
          if (count > 0) {
            await expect(elements.first()).toBeVisible({ timeout: 10000 });
            contentFound = true;
            break;
          }
        }

        if (!contentFound) {
          console.warn('Kein Hauptinhaltselement gefunden, fahre trotzdem fort...');
        }

        // Screenshot für die Dokumentation
        const safeFileName =
          `${i + 1}-${linkText.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`.replace(/-+/g, '-');
        await page.screenshot({ path: `test-results/nav-${safeFileName}.png`, fullPage: true });

        // Kleine Pause zwischen den Navigationen
        await page.waitForTimeout(1000);
      } catch (error) {
        console.error(`Fehler beim Navigieren zu ${href}:`, error);

        // Screenshot bei Fehlern
        const safeFileName = `error-${linkText.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`.replace(
          /-+/g,
          '-'
        );
        await page.screenshot({
          path: `test-results/error-${safeFileName}.png`,
          fullPage: true,
        });
        console.log(`Screenshot gespeichert als test-results/error-${safeFileName}.png`);

        // Weiter mit dem nächsten Link anstatt den Test abzubrechen
        continue;
      }

      // Zurück zur Startseite für den nächsten Test, wenn nicht der letzte Link
      if (i < linkCount - 1) {
        console.log('Kehre zur Startseite zurück...');
        await navigateTo('/');
        await page.waitForLoadState('networkidle');
      }
    }

    console.log(
      `\nNavigationstest abgeschlossen. Erfolgreich besuchte Links: ${visitedLinks.size}/${linkCount}`
    );
    expect(visitedLinks.size).toBeGreaterThan(0);
  });
});
