import { Page } from '@playwright/test';
import { BasePage } from './base.page';

type NavItem = {
  name: string;
  path: string;
  testId: string;
};

export class NavigationPage extends BasePage {
  // Navigation items with their test IDs and paths
  private readonly navItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', testId: 'nav-dashboard' },
    { name: 'Tools', path: '/tools', testId: 'nav-tools' },
    { name: 'Pricing', path: '/pricing', testId: 'nav-pricing' },
    { name: 'Documentation', path: '/docs', testId: 'nav-docs' },
  ];

  // Selectors
  private getNavItemSelector(item: NavItem) {
    return `[data-testid="${item.testId}"]`;
  }

  private getMobileNavItemSelector(item: NavItem) {
    return `[data-testid="mobile-${item.testId}"]`;
  }

  // Navigation methods
  async navigateTo(itemName: string) {
    const item = this.navItems.find(i => i.name === itemName);
    if (!item) throw new Error(`Navigation item '${itemName}' not found`);
    
    await this.page.click(this.getNavItemSelector(item));
    await this.page.waitForURL(`**${item.path}`);
  }

  async navigateToMobile(itemName: string) {
    const item = this.navItems.find(i => i.name === itemName);
    if (!item) throw new Error(`Mobile navigation item '${itemName}' not found`);
    
    await this.page.click(this.getMobileNavItemSelector(item));
    await this.page.waitForURL(`**${item.path}`);
  }

  // Active state verification
  async isNavItemActive(itemName: string) {
    const item = this.navItems.find(i => i.name === itemName);
    if (!item) throw new Error(`Navigation item '${itemName}' not found`);
    
    const activeClass = await this.page.getAttribute(
      this.getNavItemSelector(item), 
      'class'
    );
    
    return activeClass?.includes('active') || false;
  }

  // URL verification
  async isCurrentPath(expectedPath: string) {
    const url = this.page.url();
    return url.endsWith(expectedPath);
  }
}
