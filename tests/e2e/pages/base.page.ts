import { Page } from '@playwright/test';

export class BasePage {
  constructor(public readonly page: Page) {}

  // Common selectors
  protected header = 'header';
  protected themeToggle = '[data-testid="theme-toggle"]';
  protected mobileMenuButton = '[data-testid="mobile-menu-button"]';
  protected mobileMenu = '[data-testid="mobile-menu"]';
  
  // Navigation methods
  async navigateTo(path: string) {
    const port = process.env.PORT || '4321';
    await this.page.goto(`http://localhost:${port}${path}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Theme methods
  async toggleTheme() {
    await this.page.click(this.themeToggle);
    // Wait for theme transition
    await this.page.waitForTimeout(200);
  }

  async getCurrentTheme() {
    return await this.page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });
  }

  // Mobile menu methods
  async toggleMobileMenu() {
    await this.page.click(this.mobileMenuButton);
    await this.page.waitForSelector(this.mobileMenu, { state: 'visible' });
  }

  async isMobileMenuOpen() {
    return await this.page.isVisible(this.mobileMenu);
  }
}
