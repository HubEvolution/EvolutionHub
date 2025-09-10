/**
 * E2E-Tests für Benutzer-Authentifizierung
 * Testet komplette User-Flows von der Browser-Perspektive
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { testConfig } from '../../../config/test-config.js';

const IS_REMOTE_TARGET = (() => {
  try {
    const u = new URL(process.env.TEST_BASE_URL || process.env.BASE_URL || '');
    return !(u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
})();

async function skipIfNoPasswordUI(page: Page, path: '/de/login' | '/de/register') {
  // Navigate (if not already on the path) and check whether a password field exists
  if (!page.url().includes(path)) {
    await page.goto(path);
  }
  // Give the page a brief moment to render
  await page.waitForLoadState('domcontentloaded');
  const pwCount = await page.locator('input[name="password"]').count();
  if (pwCount === 0) {
    test.skip(true, 'Password-basierte UI ist deaktiviert (Stytch Magic-Link aktiv)');
  }
}

test.describe('Benutzer-Authentifizierung - E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Setze Test-Konfiguration
    await page.context().addInitScript(() => {
      window.localStorage.setItem('test-mode', 'true');
    });
  });

  test.describe('Registrierungs-Flow', () => {
    test.beforeEach(async () => {
      if (IS_REMOTE_TARGET) {
        test.skip(true, 'Registrierung wird in Remote/Stytch-Umgebungen übersprungen (Double-Opt-In/Email-Flow, abweichende Policies)');
      }
    });
    test('sollte erfolgreiche Benutzerregistrierung ermöglichen', async () => {
      const testEmail = `e2e-${Date.now()}@test-suite.local`;
      const testPassword = 'E2eTestPass123!';
      const userData = {
        name: 'E2E TestUser',
        username: `e2e-${Date.now()}`,
      };

      // Navigiere zur Registrierungsseite
      await page.goto('/de/register');

      // Warte auf Seitenladung
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/register');

      // Fülle Registrierungsformular aus (aktuelles UI: name + username)
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="name"]', userData.name);
      await page.fill('input[name="username"]', userData.username);

      // Sende Formular
      await page.click('button[type="submit"]');

      // Warte auf Erfolgsmeldung oder Weiterleitung
      await expect(page).toHaveURL(/\/verify-email|\/email-verified|\/dashboard|\/login/);

      // Verifiziere Erfolgsmeldung
      const successMessage = page.locator('.success-message, .alert-success, [data-testid="success-message"]');
      if (await successMessage.isVisible()) {
        await expect(successMessage).toContainText(/erfolgreich|registriert|verifiziert/);
      }
    });

    test('sollte Registrierung bei ungültigen Daten ablehnen', async () => {
      await page.goto('/de/register');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/register');

      // Fülle Formular mit ungültigen Daten
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', '123'); // Zu kurz
      await page.fill('input[name="name"]', '');
      await page.fill('input[name="username"]', '');

      // Sende Formular
      await page.click('button[type="submit"]');

      // Verifiziere Fehlermeldung (Redirect mit Fehlercode und Toast über AuthStatusNotifier)
      await expect(page).toHaveURL(/\/de\/register/);
      await expect(page.locator('[data-sonner-toaster]')).toBeVisible();
      await expect(page.locator('text=/Registrierung.*fehlgeschlagen|Registration.*failed/')).toBeVisible();
    });

    test('sollte Registrierung bei bereits existierender Email ablehnen', async () => {
      await page.goto('/de/register');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/register');

      // Verwende bereits existierende Test-Email
      const existingUsername = `e2e-existing-${Date.now()}`;
      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'TestPass123!');
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="username"]', existingUsername);

      await page.click('button[type="submit"]');

      // Verifiziere Konflikt-Fehlermeldung (URL enthält error und Toast sichtbar)
      await expect(page).toHaveURL(/\/de\/register.*error=/);
      await expect(page.locator('[data-sonner-toaster]')).toBeVisible();
      await expect(page.locator('text=/Registrierung.*fehlgeschlagen|Registration.*failed/')).toBeVisible();
    });
  });

  test.describe('Login-Flow', () => {
    test('sollte erfolgreichen Login für Admin-Benutzer ermöglichen', async () => {
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      // Fülle Login-Formular
      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'AdminPass123!');

      // Sende Formular
      await page.click('button[type="submit"]');

      // Warte auf erfolgreiche Weiterleitung
      await page.waitForURL('**/dashboard');

      // Verifiziere Dashboard-Zugang
      await expect(page.locator('text=/dashboard|übersicht|willkommen/')).toBeVisible();
    });

    test('sollte erfolgreichen Login für regulären Benutzer ermöglichen', async () => {
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      // Fülle Login-Formular
      await page.fill('input[name="email"]', 'user@test-suite.local');
      await page.fill('input[name="password"]', 'UserPass123!');

      await page.click('button[type="submit"]');

      // Warte auf Dashboard
      await page.waitForURL('**/dashboard');

      // Verifiziere Benutzer-Dashboard
      await expect(page.locator('text=/dashboard|mein.*bereich/')).toBeVisible();

      // Verifiziere, dass Admin-Elemente nicht vorhanden sind
      const adminElements = page.locator('[data-testid="admin-panel"], .admin-controls');
      await expect(adminElements).toHaveCount(0);
    });

    test('sollte fehlgeschlagenen Login bei falschen Anmeldedaten ablehnen', async () => {
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      // Fülle Formular mit falschen Daten
      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'wrongpassword');

      await page.click('button[type="submit"]');

      // Verifiziere Fehlermeldung
      await expect(page.locator('text=/ungültige.*anmeldedaten|login.*fehlgeschlagen|falsche.*daten/')).toBeVisible();

      // Verifiziere, dass weiterhin auf Login-Seite
      await expect(page).toHaveURL(/\/login/);
    });

    test('sollte "Passwort vergessen" Flow ermöglichen', async () => {
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      // Klicke auf "Passwort vergessen" Link
      await page.click('text=/passwort.*vergessen|forgot.*password/');

      // Warte auf Passwort-zurücksetzen-Seite
      await page.waitForURL('**/forgot-password');

      // Fülle Email ein
      await page.fill('input[name="email"]', 'user@test-suite.local');

      // Sende Anfrage
      await page.click('button[type="submit"]');

      // Verifiziere Erfolgsmeldung
      await expect(page.locator('text=/email.*gesendet|reset.*link.*gesendet/')).toBeVisible();
    });
  });

  test.describe('Session-Management', () => {
    test('sollte Benutzer-Session über Browser-Refresh erhalten', async () => {
      // Login durchführen
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'AdminPass123!');
      await page.click('button[type="submit"]');

      await page.waitForURL('**/dashboard');

      // Seite neu laden
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verifiziere, dass weiterhin eingeloggt
      await expect(page.locator('text=/dashboard|übersicht/')).toBeVisible();

      // Verifiziere, dass Logout-Button sichtbar ist
      await expect(page.locator('text=/logout|abmelden|ausloggen/')).toBeVisible();
    });

    test('sollte Logout korrekt durchführen', async () => {
      // Login durchführen
      await page.goto('/de/login');
      await skipIfNoPasswordUI(page, '/de/login');
      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'AdminPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Logout durchführen
      await page.click('text=/logout|abmelden|ausloggen/');

      // Warte auf Weiterleitung zur Login-Seite
      await page.waitForURL('**/login');

      // Verifiziere, dass nicht mehr eingeloggt
      await expect(page.locator('text=/login|anmelden/')).toBeVisible();

      // Versuche Dashboard zu besuchen (sollte nicht möglich sein)
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Sollte zur Login-Seite weitergeleitet werden
      await expect(page).toHaveURL(/\/login/);
    });

    test('sollte Session-Timeout behandeln', async () => {
      // Login durchführen
      await page.goto('/de/login');
      await skipIfNoPasswordUI(page, '/de/login');
      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'AdminPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Simuliere Session-Timeout durch Löschen von LocalStorage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Seite neu laden
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Sollte zur Login-Seite weitergeleitet werden
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Sicherheit und Validierung', () => {
    test('sollte XSS-Angriffe in Formularfeldern verhindern', async () => {
      await page.goto('/de/register');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/register');

      const xssPayload = '<script>alert("xss")</script>';

      // Fülle Formular mit XSS-Payload
      await page.fill('input[name="name"]', xssPayload);
      await page.fill('input[name="username"]', 'Test');
      await page.fill('input[name="email"]', `test-${Date.now()}@test-suite.local`);
      await page.fill('input[name="password"]', 'TestPass123!');

      await page.click('button[type="submit"]');

      // Verifiziere, dass kein Alert ausgelöst wurde
      const alerts = page.locator('[role="alert"], .alert');
      await expect(alerts).not.toContainText('xss');

      // Verifiziere, dass die Seite normal funktioniert
      if (page.url().includes('dashboard')) {
        await expect(page.locator('text=/dashboard|übersicht/')).toBeVisible();
      }
    });

    test('sollte CSRF-Schutz implementieren', async () => {
      // Login durchführen
      await page.goto('/de/login');
      await skipIfNoPasswordUI(page, '/de/login');
      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'AdminPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Versuche CSRF-Angriff durch Öffnen einer neuen Seite
      const newPage = await page.context().newPage();
      await newPage.goto('/de/login');

      // Versuche, sensible Aktion ohne gültigen Token durchzuführen
      const csrfAttempt = newPage.locator('form[action*="logout"], button[onclick*="logout"]');
      if (await csrfAttempt.isVisible()) {
        await csrfAttempt.click();

        // Sollte nicht funktionieren oder zur Login-Seite weiterleiten
        await expect(newPage).toHaveURL(/\/login/);
      }

      await newPage.close();
    });

    test('sollte Rate-Limiting für Login-Versuche implementieren', async () => {
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      // Mehrere schnelle Login-Versuche
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="email"]', 'admin@test-suite.local');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Kleine Pause zwischen Versuchen
        await page.waitForTimeout(100);
      }

      // Verifiziere Rate-Limit-Meldung oder Verzögerung
      const rateLimitMessage = page.locator('text=/zu.*viele.*versuche|rate.*limit|zu.*schnell/');
      const captcha = page.locator('[data-testid="captcha"], .captcha, #captcha');

      await expect(rateLimitMessage.or(captcha)).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('sollte Login auf Mobile-Geräten funktionieren', async () => {
      // Setze Mobile Viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      // Verifiziere Mobile-Optimierung
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Führe Mobile-Login durch
      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'AdminPass123!');
      await page.click('button[type="submit"]');

      // Verifiziere erfolgreichen Login
      await page.waitForURL('**/dashboard');
      await expect(page.locator('text=/dashboard|übersicht/')).toBeVisible();
    });

    test('sollte Touch-Interaktionen auf Mobile unterstützen', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/de/login');
      await skipIfNoPasswordUI(page, '/de/login');

      // Verifiziere Touch-freundliche Elemente
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();

      // Button sollte groß genug für Touch sein (mindestens 44px)
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);

      // Verifiziere Input-Felder
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();

      // Teste Touch-Input
      await emailInput.tap();
      await emailInput.fill('admin@test-suite.local');

      await passwordInput.tap();
      await passwordInput.fill('AdminPass123!');

      await submitButton.tap();

      await page.waitForURL('**/dashboard');
    });
  });

  test.describe('Accessibility (A11Y)', () => {
    test('sollte WCAG 2.1 AA Konformität für Login-Formular erfüllen', async () => {
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      // Verifiziere ARIA-Labels
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-label', /email|e-mail/);
      await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label', /passwort|password/);

      // Verifiziere Fokus-Management
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="email"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="password"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();

      // Verifiziere Farbkontrast (indirekt durch Sichtbarkeit)
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Verifiziere Fehlermeldungen
      await page.fill('input[name="email"]', 'invalid');
      await page.fill('input[name="password"]', '123');
      await page.click('button[type="submit"]');

      const errorMessages = page.locator('.error-message, [role="alert"]');
      await expect(errorMessages).toBeVisible();

      // Verifiziere, dass Fehlermeldungen mit Formularfeldern verknüpft sind
      await expect(errorMessages.first()).toHaveAttribute('aria-live', 'polite');
    });

    test('sollte Keyboard-Navigation unterstützen', async () => {
      await page.goto('/de/login');
      await skipIfNoPasswordUI(page, '/de/login');

      // Teste komplette Keyboard-Navigation
      await page.keyboard.press('Tab'); // Email Feld
      await expect(page.locator('input[name="email"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Password Feld
      await expect(page.locator('input[name="password"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Submit Button
      await expect(page.locator('button[type="submit"]')).toBeFocused();

      // Fülle Formular mit Keyboard
      await page.keyboard.press('Shift+Tab'); // Zurück zum Password
      await page.keyboard.type('AdminPass123!');

      await page.keyboard.press('Shift+Tab'); // Zurück zum Email
      await page.keyboard.type('admin@test-suite.local');

      await page.keyboard.press('Tab'); // Zum Password
      await page.keyboard.press('Tab'); // Zum Submit

      // Sende Formular mit Enter
      await page.keyboard.press('Enter');

      // Verifiziere erfolgreichen Login
      await page.waitForURL('**/dashboard');
    });

    test('sollte Screen-Reader-Unterstützung bieten', async () => {
      await page.goto('/de/login');
      await skipIfNoPasswordUI(page, '/de/login');

      // Verifiziere Screen-Reader-Attribute
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // Verifiziere aria-label oder aria-labelledby
      const emailAria = await emailInput.getAttribute('aria-label') || await emailInput.getAttribute('aria-labelledby');
      const passwordAria = await passwordInput.getAttribute('aria-label') || await passwordInput.getAttribute('aria-labelledby');

      expect(emailAria).toBeTruthy();
      expect(passwordAria).toBeTruthy();

      // Verifiziere Button-Text
      const buttonText = await submitButton.textContent();
      expect(buttonText?.trim()).toBeTruthy();

      // Verifiziere Form-Struktur
      const form = page.locator('form');
      await expect(form).toHaveAttribute('role', 'form');
    });
  });

  test.describe('Performance und Ladezeiten', () => {
    test('sollte Login-Seite schnell laden', async () => {
      const startTime = Date.now();

      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      const loadTime = Date.now() - startTime;

      // Sollte unter 3 Sekunden laden
      expect(loadTime).toBeLessThan(3000);

      // Verifiziere, dass alle wichtigen Elemente geladen sind
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('sollte schnelle Login-Response-Zeiten haben', async () => {
      await page.goto('/de/login');
      await page.waitForLoadState('networkidle');
      await skipIfNoPasswordUI(page, '/de/login');

      await page.fill('input[name="email"]', 'admin@test-suite.local');
      await page.fill('input[name="password"]', 'AdminPass123!');

      const startTime = Date.now();
      await page.click('button[type="submit"]');

      // Warte auf Navigation oder Erfolgsmeldung
      await page.waitForFunction(() => {
        return window.location.href.includes('dashboard') ||
               document.querySelector('.success-message, .alert-success');
      });

      const responseTime = Date.now() - startTime;

      // Sollte unter 5 Sekunden reagieren
      expect(responseTime).toBeLessThan(5000);
    });

    test('sollte effizient mit vielen gleichzeitigen Sessions umgehen', async () => {
      // Öffne mehrere Browser-Kontexte
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];

      for (let i = 0; i < 3; i++) {
        const context = await page.context().browser()?.newContext();
        if (context) {
          contexts.push(context);
          const newPage = await context.newPage();
          pages.push(newPage);

          // Führe Login in jedem Kontext durch
          await newPage.goto('/de/login');
          const pwCount = await newPage.locator('input[name="password"]').count();
          if (pwCount === 0) {
            test.skip(true, 'Password-basierte UI ist deaktiviert (Stytch Magic-Link aktiv)');
          }
          await newPage.fill('input[name="email"]', 'admin@test-suite.local');
          await newPage.fill('input[name="password"]', 'AdminPass123!');
          await newPage.click('button[type="submit"]');
          await newPage.waitForURL('**/dashboard');
        }
      }

      // Verifiziere, dass alle Sessions funktionieren
      for (const p of pages) {
        await expect(p.locator('text=/dashboard|übersicht/')).toBeVisible();
      }

      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    });
  });
});