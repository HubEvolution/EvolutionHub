import { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { testUsers } from '../fixtures/test-data';

/**
 * Authentifiziert einen Benutzer und gibt die LoginPage-Instanz zurück
 * @param page Playwright Page-Objekt
 * @param userType Benutzertyp ('admin' oder 'standard')
 * @returns LoginPage-Instanz
 */
export async function loginAs(
  page: Page,
  userType: 'admin' | 'standard' = 'standard'
) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  const user = testUsers[userType];
  await loginPage.login(user.email, user.password);
  
  // Warten auf die Weiterleitung nach erfolgreichem Login
  await page.waitForURL('**/dashboard');
  
  return loginPage;
}

/**
 * Meldet den aktuellen Benutzer ab
 * @param page Playwright Page-Objekt
 */
export async function logout(page: Page) {
  await page.goto('/auth/logout');
  await page.waitForURL('**/auth/login');
}

/**
 * Überprüft, ob der Benutzer eingeloggt ist
 * @param page Playwright Page-Objekt
 * @returns boolean
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const loginPage = new LoginPage(page);
  return loginPage.isLoggedIn();
}

/**
 * Setzt das Authentifizierungs-Token im LocalStorage
 * @param page Playwright Page-Objekt
 * @param token Der zu setzende Token
 */
export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((t) => {
    window.localStorage.setItem('auth-token', t);
  }, token);
}

/**
 * Holt das Authentifizierungs-Token aus dem LocalStorage
 * @param page Playwright Page-Objekt
 * @returns Der gespeicherte Token oder null
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return window.localStorage.getItem('auth-token');
  });
}
