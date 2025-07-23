import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/auth.helper';
import { DashboardPage } from '../pages/dashboard.page';
import { testUsers } from '../fixtures/test-data';

test.describe('Dashboard', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    // Als Standardbenutzer einloggen
    await loginAs(page, 'standard');
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('should load dashboard successfully', async () => {
    // Überprüfen, ob das Dashboard korrekt geladen wurde
    const isLoaded = await dashboardPage.isLoaded();
    expect(isLoaded).toBeTruthy();

    // Überprüfen, ob die wichtigsten Elemente sichtbar sind
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Überprüfen, ob Statistik-Karten vorhanden sind
    const statsCount = await dashboardPage.getStatsCount();
    expect(statsCount).toBeGreaterThan(0);
  });

  test('should navigate to projects page', async ({ page }) => {
    // Zur Projekte-Seite navigieren
    await dashboardPage.navigateTo('projects');
    
    // Überprüfen, ob die Navigation erfolgreich war
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.locator('h1')).toContainText('Meine Projekte');
  });

  test('should perform quick actions', async ({ page }) => {
    // Schnellaktion ausführen
    await dashboardPage.performQuickAction('Neues Projekt');
    
    // Überprüfen, ob die Aktion erfolgreich war
    await dashboardPage.expectSuccessMessage('Neues Projekt wird erstellt');
  });

  test('should switch between light and dark mode', async () => {
    // Zu Dark Mode wechseln
    await dashboardPage.switchTheme('dark');
    
    // Überprüfen, ob das Theme gewechselt wurde
    const isDark = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
    expect(isDark).toBeTruthy();
    
    // Zurück zu Light Mode wechseln
    await dashboardPage.switchTheme('light');
    
    // Überprüfen, ob das Theme zurückgewechselt wurde
    const isLight = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme') === 'light' ||
      !document.documentElement.hasAttribute('data-theme')
    );
    expect(isLight).toBeTruthy();
  });

  test('should show recent activity', async () => {
    // Überprüfen, ob die letzte Aktivität angezeigt wird
    const recentActivity = page.locator('[data-testid="recent-activity"]');
    await expect(recentActivity).toBeVisible();
    
    // Überprüfen, ob Aktivitäten geladen wurden
    const activityItems = recentActivity.locator('li');
    const count = await activityItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should log out successfully', async ({ page }) => {
    // Ausloggen
    await dashboardPage.logout();
    
    // Überprüfen, ob die Abmeldung erfolgreich war
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator('h1')).toContainText('Anmelden');
  });

  test('should show different content for admin users', async ({ page }) => {
    // Als Admin einloggen
    await loginAs(page, 'admin');
    await dashboardPage.goto();
    
    // Überprüfen, ob Admin-spezifische Inhalte angezeigt werden
    const adminSection = page.locator('[data-testid="admin-section"]');
    await expect(adminSection).toBeVisible();
  });
});
