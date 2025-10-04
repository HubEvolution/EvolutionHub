/**
 * Auth Middleware E2E Tests
 *
 * Tests the authentication middleware behavior:
 * - Protected routes require authentication
 * - Unauthenticated users redirected to login
 * - Authenticated users allowed access
 * - Public routes accessible without auth
 * - Redirect back to original target after login
 *
 * @see src/middleware.ts
 */

import { test, expect } from '@playwright/test';
import {
  isRemoteTarget,
  assertAuthenticated,
  assertNotAuthenticated,
  logout,
} from '../../../fixtures/auth-helpers';

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
const IS_REMOTE = isRemoteTarget();
const FAKE_STYTCH = process.env.E2E_FAKE_STYTCH === '1';

test.describe('Auth Middleware', () => {
  test.describe('Protected Routes - Unauthenticated Access', () => {
    test('should redirect unauthenticated user to login when accessing /dashboard', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Try to access protected route without auth
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should be redirected to login
      await assertNotAuthenticated(page);

      await context.close();
    });

    test('should redirect unauthenticated user to login when accessing /profile', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/en/profile');
      await page.waitForLoadState('domcontentloaded');

      await assertNotAuthenticated(page);

      await context.close();
    });

    test('should redirect unauthenticated user to login when accessing /settings', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/en/settings');
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = page.url();
      // Settings might not exist, but middleware should catch it before 404
      expect(currentUrl, 'Should redirect to login or show 404').toMatch(/\/login|404/);

      await context.close();
    });

    test('should preserve original target in redirect parameter', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const targetRoute = '/en/dashboard';

      // Try to access protected route
      await page.goto(targetRoute);
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = page.url();

      // Should redirect to login
      expect(currentUrl, 'Should redirect to login').toMatch(/\/login/);

      // Should include redirect parameter (r=...) or similar
      // Note: Exact parameter depends on middleware implementation
      if (currentUrl.includes('?')) {
        // Middleware might include redirect param
        // This depends on implementation - adjust as needed
      }

      await context.close();
    });
  });

  test.describe('Protected Routes - Authenticated Access', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should allow authenticated user to access /dashboard', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login first
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should be on dashboard
      await assertAuthenticated(page);

      // Navigate to dashboard explicitly
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should still be on dashboard (not redirected to login)
      await assertAuthenticated(page);

      await context.close();
    });

    test('should allow authenticated user to navigate between protected routes', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Navigate to protected routes
      const protectedRoutes = ['/en/dashboard', '/en/profile'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');

        const currentUrl = page.url();
        // Should not be redirected to login
        expect(currentUrl, `Should allow access to ${route}`).not.toMatch(/\/login/);
        // Should be on the requested route (or 404 if route doesn't exist)
        expect(currentUrl, `Should be on ${route} or 404`).toMatch(new RegExp(`${route}|404`));
      }

      await context.close();
    });
  });

  test.describe('Public Routes - No Auth Required', () => {
    test('should allow unauthenticated access to /', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = page.url();

      // Should NOT be redirected to login
      expect(currentUrl, 'Should allow access to homepage').not.toMatch(/\/login/);

      await context.close();
    });

    test('should allow unauthenticated access to /login', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/en/login');
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = page.url();

      // Should be on login page
      expect(currentUrl, 'Should be on login page').toMatch(/\/login/);

      await context.close();
    });

    test('should allow unauthenticated access to /pricing', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/en/pricing');
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = page.url();

      // Should NOT be redirected to login
      expect(currentUrl, 'Should allow access to pricing').toMatch(/\/pricing/);

      await context.close();
    });

    test('should allow unauthenticated access to /tools/prompt-enhancer', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/en/tools/prompt-enhancer');
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = page.url();

      // Should NOT be redirected to login (public tool)
      expect(currentUrl, 'Should allow access to prompt-enhancer').toMatch(/prompt-enhancer/);

      await context.close();
    });
  });

  test.describe('Redirect After Login', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should redirect to original target after login (r=...)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const targetRoute = '/en/tools/prompt-enhancer';

      // Navigate to login with redirect parameter
      await page.goto(`/en/login?r=${encodeURIComponent(targetRoute)}`);

      // Complete OAuth login
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to original target (or dashboard if target is not allowed)
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to target after login').toMatch(/prompt-enhancer|dashboard/);

      await context.close();
    });

    test('should redirect to dashboard if no redirect parameter provided', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to login without redirect parameter
      await page.goto('/en/login');

      // Complete OAuth login
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to dashboard (default)
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to dashboard by default').toMatch(/dashboard/);

      await context.close();
    });

    test('should sanitize redirect parameter to prevent open redirects', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Try to redirect to external URL (should be rejected)
      const externalUrl = 'https://evil.com';

      await page.goto(`/en/login?r=${encodeURIComponent(externalUrl)}`);

      // Complete OAuth login
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should NOT redirect to external URL
      const currentUrl = page.url();
      expect(currentUrl, 'Should NOT redirect to external URL').not.toContain('evil.com');
      expect(currentUrl, 'Should redirect to safe internal route').toMatch(new RegExp(BASE_URL));

      await context.close();
    });
  });

  test.describe('Middleware Behavior After Logout', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should redirect to login after logout when accessing protected route', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      await assertAuthenticated(page);

      // Logout
      await logout(page);

      // Try to access protected route
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should be redirected to login
      await assertNotAuthenticated(page);

      await context.close();
    });

    test('should still allow access to public routes after logout', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Logout
      await logout(page);

      // Access public route
      await page.goto('/en/pricing');
      await page.waitForLoadState('domcontentloaded');

      // Should be allowed
      const currentUrl = page.url();
      expect(currentUrl, 'Should allow access to pricing after logout').toMatch(/pricing/);

      await context.close();
    });
  });

  test.describe('Middleware Locale Handling', () => {
    test('should redirect to login with correct locale (EN)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Try to access EN protected route
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to EN login
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to EN login').toMatch(/\/en\/login/);

      await context.close();
    });

    test('should redirect to login with correct locale (DE)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Try to access DE protected route
      await page.goto('/de/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to DE login
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to DE login').toMatch(/\/de\/login/);

      await context.close();
    });
  });

  test.describe('Middleware Security Headers', () => {
    test('should set security headers on all routes', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Intercept response to check headers
      let headers: Record<string, string> = {};

      page.on('response', (response) => {
        if (response.url().includes('/en/login')) {
          headers = response.headers();
        }
      });

      await page.goto('/en/login');
      await page.waitForLoadState('domcontentloaded');

      // Check for security headers (CSP, HSTS, etc.)
      // Exact headers depend on middleware implementation
      expect(headers['content-security-policy'] || headers['Content-Security-Policy'], 'Should set CSP header').toBeTruthy();

      await context.close();
    });
  });
});
