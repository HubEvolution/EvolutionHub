import { Page, expect } from '@playwright/test';

/**
 * Page Object für das Dashboard
 */
export class DashboardPage {
  // Selektoren
  private readonly navigation = {
    dashboard: 'a[href="/dashboard"]',
    projects: 'a[href="/projects"]',
    analytics: 'a[href="/analytics"]',
    settings: 'a[href="/settings"]',
    userMenu: 'button[data-testid="user-menu"]',
    logout: 'button[data-testid="logout-button"]',
  };

  private readonly dashboardElements = {
    welcomeBanner: 'div[data-testid="welcome-banner"]',
    statsCards: 'div[data-testid="stat-card"]',
    recentActivity: 'div[data-testid="recent-activity"]',
    quickActions: 'div[data-testid="quick-actions"]',
    projectList: 'div[data-testid="project-list"]',
  };

  constructor(private readonly page: Page) {}

  /**
   * Navigiert zum Dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.dashboardElements.welcomeBanner);
  }

  /**
   * Überprüft, ob das Dashboard korrekt geladen wurde
   */
  async isLoaded() {
    await expect(this.page.locator(this.dashboardElements.welcomeBanner)).toBeVisible();
    return true;
  }

  /**
   * Navigiert zu einer bestimmten Seite über das Hauptmenü
   * @param pageName Name der Zielseite ('dashboard' | 'projects' | 'analytics' | 'settings')
   */
  async navigateTo(pageName: 'dashboard' | 'projects' | 'analytics' | 'settings') {
    const selector = this.navigation[pageName];
    await this.page.click(selector);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Meldet den Benutzer ab
   */
  async logout() {
    await this.page.click(this.navigation.userMenu);
    await this.page.click(this.navigation.logout);
    await this.page.waitForURL('**/login');
  }

  /**
   * Gibt die Anzahl der Statistik-Karten zurück
   */
  async getStatsCount() {
    return this.page.locator(this.dashboardElements.statsCards).count();
  }

  /**
   * Führt eine Schnellaktion aus
   * @param actionName Name der Aktion
   */
  async performQuickAction(actionName: string) {
    const actionButton = this.page.locator(
      `${this.dashboardElements.quickActions} button:has-text("${actionName}")`
    );
    await actionButton.click();
  }

  /**
   * Öffnet ein Projekt aus der Projektliste
   * @param projectName Name des Projekts
   */
  async openProject(projectName: string) {
    const projectLink = this.page.locator(
      `${this.dashboardElements.projectList} a:has-text("${projectName}")`
    );
    await projectLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Überprüft, ob eine Erfolgsmeldung angezeigt wird
   * @param message Erwarteter Nachrichtentext
   */
  async expectSuccessMessage(message: string) {
    const toast = this.page.locator('div[role="status"]');
    await expect(toast).toContainText(message);
  }

  /**
   * Überprüft, ob eine Fehlermeldung angezeigt wird
   * @param message Erwarteter Fehlertext
   */
  async expectErrorMessage(message: string) {
    const error = this.page.locator('div[role="alert"]');
    await expect(error).toContainText(message);
  }

  /**
   * Wechselt zum Dark/Light Mode
   * @param theme Gewünschtes Theme ('dark' oder 'light')
   */
  async switchTheme(theme: 'dark' | 'light') {
    const themeToggle = this.page.locator('button[data-testid="theme-toggle"]');
    const currentTheme = await this.page.evaluate(() => 
      document.documentElement.getAttribute('data-theme')
    );
    
    if (currentTheme !== theme) {
      await themeToggle.click();
      await this.page.waitForTimeout(300); // Warten auf Theme-Wechsel
    }
  }
}
