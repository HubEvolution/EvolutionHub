import { test, expect } from '@playwright/test';
import { NavigationPage } from '../pages/navigation.page';
import { LoginPage } from '../pages/login.page';

test.describe('Critical User Flows', () => {
  let navigationPage: NavigationPage;
  let loginPage: LoginPage;
  
  // Test data
  const testUser = {
    email: 'test@example.com',
    password: 'test1234',
  };

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    loginPage = new LoginPage(page);
    await navigationPage.navigateTo('/');
  });

  test('should toggle theme and persist preference', async () => {
    // Get initial theme
    const initialTheme = await navigationPage.getCurrentTheme();
    
    // Toggle theme
    await navigationPage.toggleTheme();
    const newTheme = await navigationPage.getCurrentTheme();
    
    // Verify theme changed
    expect(newTheme).not.toBe(initialTheme);
    
    // Reload and verify theme persists
    await navigationPage.page.reload();
    const persistedTheme = await navigationPage.getCurrentTheme();
    expect(persistedTheme).toBe(newTheme);
  });

  test('should navigate between pages with active states', async () => {
    const pages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Tools', path: '/tools' },
      { name: 'Pricing', path: '/pricing' },
    ];

    for (const page of pages) {
      // Navigate to page
      await navigationPage.navigateTo(page.name);
      
      // Verify URL and active state
      const isCurrentPath = await navigationPage.isCurrentPath(page.path);
      const isActive = await navigationPage.isNavItemActive(page.name);
      
      expect(isCurrentPath).toBeTruthy();
      expect(isActive).toBeTruthy();
    }
  });

  test('should handle mobile navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is for mobile view only');
    
    // Verify mobile menu is initially closed
    let isMenuOpen = await navigationPage.isMobileMenuOpen();
    expect(isMenuOpen).toBeFalsy();
    
    // Open mobile menu
    await navigationPage.toggleMobileMenu();
    isMenuOpen = await navigationPage.isMobileMenuOpen();
    expect(isMenuOpen).toBeTruthy();
    
    // Test navigation from mobile menu
    await navigationPage.navigateToMobile('Pricing');
    const isCurrentPath = await navigationPage.isCurrentPath('/pricing');
    expect(isCurrentPath).toBeTruthy();
    
    // Menu should close after navigation
    isMenuOpen = await navigationPage.isMobileMenuOpen();
    expect(isMenuOpen).toBeFalsy();
  });

  test('should handle authentication flow', async ({ page }) => {
    // Navigate to login
    await navigationPage.navigateTo('/login');
    
    // Attempt login with invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');
    let errorVisible = await loginPage.isErrorMessageVisible();
    expect(errorVisible).toBeTruthy();
    
    // Login with valid credentials
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL('**/dashboard');
    
    // Verify dashboard is accessible
    const isDashboard = await navigationPage.isCurrentPath('/dashboard');
    expect(isDashboard).toBeTruthy();
    
    // Test logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Sign out');
    await page.waitForURL('**/login');
    
    // Verify redirect to login when accessing protected route
    await navigationPage.navigateTo('/dashboard');
    const isLoginPage = await navigationPage.isCurrentPath('/login');
    expect(isLoginPage).toBeTruthy();
  });

  test('should maintain theme preference after authentication', async () => {
    // Set theme to dark before login
    await navigationPage.toggleTheme();
    const themeBeforeLogin = await navigationPage.getCurrentTheme();
    
    // Login
    await navigationPage.navigateTo('/login');
    await loginPage.login(testUser.email, testUser.password);
    await navigationPage.page.waitForURL('**/dashboard');
    
    // Verify theme is maintained
    const themeAfterLogin = await navigationPage.getCurrentTheme();
    expect(themeAfterLogin).toBe(themeBeforeLogin);
  });
});
