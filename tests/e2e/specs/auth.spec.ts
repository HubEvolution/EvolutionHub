import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

// Testdaten
const testUser = {
  email: 'test@example.com',
  password: 'test1234',
  invalidPassword: 'wrongpassword'
};

test.describe('Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async ({ page }) => {
    // Überprüfen, ob das Login-Formular sichtbar ist
    const isLoginFormVisible = await loginPage.isLoginFormVisible();
    expect(isLoginFormVisible).toBeTruthy();

    // Überprüfen, ob die Login-Buttons sichtbar sind
    const googleButton = page.locator('button[data-provider="google"]');
    const githubButton = page.locator('button[data-provider="github"]');
    
    await expect(googleButton).toBeVisible();
    await expect(githubButton).toBeVisible();
  });

  test('should show error for invalid credentials', async () => {
    // Falsche Anmeldedaten eingeben
    await loginPage.login(testUser.email, testUser.invalidPassword);
    
    // Überprüfen, ob eine Fehlermeldung angezeigt wird
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();
    
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Ungültige Anmeldedaten');
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Korrekte Anmeldedaten eingeben
    await loginPage.login(testUser.email, testUser.password);
    
    // Überprüfen, ob die Weiterleitung zum Dashboard erfolgt ist
    await page.waitForURL('**/dashboard');
    
    // Überprüfen, ob der Benutzer eingeloggt ist
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
  });

  test('should allow login with Google', async ({ page }) => {
    // Google-Login-Button klicken
    await loginPage.clickGoogleLogin();
    
    // Hier würden wir normalerweise den OAuth-Flow testen
    // Für den Test überspringen wir das Popup und prüfen nur die Weiterleitung
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });

  test('should allow login with GitHub', async ({ page }) => {
    // GitHub-Login-Button klicken
    await loginPage.clickGithubLogin();
    
    // Hier würden wir normalerweise den OAuth-Flow testen
    // Für den Test überspringen wir das Popup und prüfen nur die Weiterleitung
    await expect(page).toHaveURL(/github\.com\/login/);
  });
});
