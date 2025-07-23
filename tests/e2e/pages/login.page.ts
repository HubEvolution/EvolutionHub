import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class LoginPage {
  // Page selectors
  private readonly emailInput = 'input#email';
  private readonly passwordInput = 'input#password';
  private readonly submitButton = 'button[type="submit"]';
  private readonly googleLoginButton = 'button[data-provider="google"]';
  private readonly githubLoginButton = 'button[data-provider="github"]';
  private readonly errorMessage = '.error-message';
  private readonly loginForm = 'form[data-testid="login-form"]';

  constructor(private readonly page: Page) {}

  // Navigate to login page
  async goto() {
    // Use the full URL to avoid navigation issues
    await this.page.goto('http://localhost:4321/auth/login');
    await this.page.waitForLoadState('networkidle');
  }

  // Fill email and password fields and submit
  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.submitButton);
    await this.page.waitForLoadState('networkidle');
  }

  // Click Google login button
  async clickGoogleLogin() {
    await this.page.click(this.googleLoginButton);
  }

  // Click GitHub login button
  async clickGithubLogin() {
    await this.page.click(this.githubLoginButton);
  }

  // Check if error message is visible
  async isErrorMessageVisible() {
    return this.page.isVisible(this.errorMessage);
  }

  // Get error message text
  async getErrorMessage() {
    return this.page.textContent(this.errorMessage);
  }

  // Check if login form is visible
  async isLoginFormVisible() {
    return this.page.isVisible(this.loginForm);
  }

  // Check if logged in by checking for dashboard element
  async isLoggedIn() {
    try {
      await this.page.waitForSelector('nav[data-testid="main-navigation"]', { timeout: 5000 });
      return true;
    } catch (e) {
      return false;
    }
  }
}
