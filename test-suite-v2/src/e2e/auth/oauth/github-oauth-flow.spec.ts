/**
 * GitHub OAuth Flow E2E Tests
 *
 * Tests the complete GitHub OAuth authentication flow:
 * - OAuth start (redirect to Stytch/GitHub)
 * - OAuth callback (return from Stytch)
 * - Session cookie setting (based on v1.7.2 fixes)
 * - Dashboard redirect
 * - Locale handling (EN/DE)
 *
 * @see docs/troubleshooting/oauth-login-issues.md
 */

import { test, expect } from '@playwright/test';
import {
  isRemoteTarget,
  isHttps,
  getTestEmail,
  getCookieValue,
  assertSessionCookies,
  completeOAuthFlow,
  assertAuthenticated,
} from '../../../../fixtures/auth-helpers';

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
const IS_REMOTE = isRemoteTarget();
const IS_HTTPS = isHttps();
const FAKE_STYTCH = process.env.E2E_FAKE_STYTCH === '1';

test.describe('GitHub OAuth Flow', () => {
  test.describe('OAuth Start - English Locale', () => {
    test('should display GitHub OAuth button on login page', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for login page to load
      await page.waitForLoadState('domcontentloaded');

      // Find GitHub OAuth button
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();

      // Assert button is visible
      await expect(githubButton).toBeVisible({ timeout: 5000 });

      // Assert button has correct href
      const href = await githubButton.getAttribute('href');
      expect(href).toContain('/api/auth/oauth/github/start');
    });

    test('should redirect to OAuth start endpoint when clicking GitHub button', async ({ page }) => {
      await page.goto('/en/login');

      // Click GitHub OAuth button
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();

      // Wait for navigation to OAuth start
      await page.waitForLoadState('domcontentloaded');

      // For local dev with E2E_FAKE_STYTCH, the OAuth flow is mocked
      if (!IS_REMOTE && FAKE_STYTCH) {
        // Expect redirect to callback (mocked OAuth flow)
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/api\/auth\/oauth\/github\/callback|\/dashboard|\/en\/dashboard/);
      }
      // For remote targets, we cannot complete the OAuth flow (requires real Stytch)
    });
  });

  test.describe('OAuth Start - German Locale', () => {
    test('should display GitHub OAuth button on login page (DE)', async ({ page }) => {
      await page.goto('/de/login');

      await page.waitForLoadState('domcontentloaded');

      // Find GitHub OAuth button (German text)
      const githubButton = page.locator('a:has-text("Mit GitHub anmelden")').first();

      await expect(githubButton).toBeVisible({ timeout: 5000 });

      const href = await githubButton.getAttribute('href');
      expect(href).toContain('/api/auth/oauth/github/start');
    });
  });

  test.describe('OAuth Happy Path (Local Dev Only)', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should complete full OAuth flow and land on dashboard (EN)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Start with clean cookies
      const cookiesBefore = await context.cookies(BASE_URL);
      expect(cookiesBefore.find((c) => c.name === 'session_id' || c.name === '__Host-session')).toBeFalsy();

      // Navigate to login page
      await page.goto('/en/login');

      // Find and click GitHub OAuth button
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();

      // Wait for OAuth flow to complete
      await page.waitForLoadState('domcontentloaded');

      // Expect redirect to dashboard (with English locale)
      const currentUrl = new URL(page.url());
      expect(['/dashboard', '/en/dashboard']).toContain(currentUrl.pathname);

      // Assert session cookies are set
      await assertSessionCookies(context, BASE_URL, {
        expectSessionId: true,
        expectHostSession: IS_HTTPS,
      });

      // Assert user is authenticated
      await assertAuthenticated(page);

      await context.close();
    });

    test('should complete full OAuth flow and land on dashboard (DE)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to German login page
      await page.goto('/de/login');

      // Find and click GitHub OAuth button (German text)
      const githubButton = page.locator('a:has-text("Mit GitHub anmelden")').first();
      await githubButton.click();

      // Wait for OAuth flow to complete
      await page.waitForLoadState('domcontentloaded');

      // Expect redirect to dashboard (with German locale)
      const currentUrl = new URL(page.url());
      expect(['/dashboard', '/de/dashboard']).toContain(currentUrl.pathname);

      // Assert session cookies are set
      await assertSessionCookies(context, BASE_URL, {
        expectSessionId: true,
        expectHostSession: IS_HTTPS,
      });

      await context.close();
    });

    test('should handle target redirect parameter (r=...)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const targetUrl = '/en/tools/prompt-enhancer';

      // Navigate to login with target redirect
      await page.goto(`/en/login?r=${encodeURIComponent(targetUrl)}`);

      // Click GitHub OAuth button
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();

      // Wait for OAuth flow to complete
      await page.waitForLoadState('domcontentloaded');

      // Expect redirect to target URL (or dashboard if target is not allowed)
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/dashboard|prompt-enhancer/);

      await context.close();
    });
  });

  test.describe('OAuth Callback - Session Cookie Tests', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should set session_id cookie on HTTP (local dev)', async ({ browser }) => {
      test.skip(IS_HTTPS, 'Only for HTTP local dev');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Assert session_id cookie is set
      const cookies = await context.cookies(BASE_URL);
      const sessionId = cookies.find((c) => c.name === 'session_id');

      expect(sessionId, 'session_id cookie should be set').toBeTruthy();
      expect(sessionId?.httpOnly, 'session_id should be HttpOnly').toBeTruthy();
      expect(sessionId?.path, 'session_id should have Path=/').toBe('/');
      expect(sessionId?.sameSite, 'session_id should have SameSite=Lax').toBe('Lax');
      expect(sessionId?.secure, 'session_id should NOT be Secure on HTTP').toBeFalsy();

      await context.close();
    });

    test('should NOT set __Host-session cookie on HTTP (local dev)', async ({ browser }) => {
      test.skip(IS_HTTPS, 'Only for HTTP local dev');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Assert __Host-session cookie is NOT set on HTTP
      const cookies = await context.cookies(BASE_URL);
      const hostSession = cookies.find((c) => c.name === '__Host-session');

      expect(hostSession, '__Host-session should NOT be set on HTTP').toBeFalsy();

      await context.close();
    });

    test('should set both session_id and __Host-session on HTTPS', async ({ browser }) => {
      test.skip(!IS_HTTPS, 'Only for HTTPS (staging/production)');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Assert both cookies are set
      const cookies = await context.cookies(BASE_URL);
      const sessionId = cookies.find((c) => c.name === 'session_id');
      const hostSession = cookies.find((c) => c.name === '__Host-session');

      // session_id
      expect(sessionId, 'session_id cookie should be set').toBeTruthy();
      expect(sessionId?.httpOnly).toBeTruthy();
      expect(sessionId?.path).toBe('/');
      expect(sessionId?.sameSite).toBe('Lax');
      expect(sessionId?.secure, 'session_id should be Secure on HTTPS').toBeTruthy();

      // __Host-session
      expect(hostSession, '__Host-session cookie should be set on HTTPS').toBeTruthy();
      expect(hostSession?.httpOnly).toBeTruthy();
      expect(hostSession?.path).toBe('/');
      expect(hostSession?.sameSite).toBe('Strict');
      expect(hostSession?.secure).toBeTruthy();

      await context.close();
    });
  });

  test.describe('OAuth Callback - Redirect Tests', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should redirect returning user to dashboard', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow (existing user)
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Expect redirect to dashboard (not welcome-profile)
      const currentUrl = new URL(page.url());
      expect(currentUrl.pathname).toMatch(/dashboard/);
      expect(currentUrl.pathname).not.toMatch(/welcome-profile/);

      await context.close();
    });

    test('should preserve locale in dashboard redirect (EN)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = new URL(page.url());
      // Dashboard URL should include /en/ prefix or be non-localized
      expect(['/dashboard', '/en/dashboard']).toContain(currentUrl.pathname);

      await context.close();
    });

    test('should preserve locale in dashboard redirect (DE)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/de/login');
      const githubButton = page.locator('a:has-text("Mit GitHub anmelden")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      const currentUrl = new URL(page.url());
      expect(['/dashboard', '/de/dashboard']).toContain(currentUrl.pathname);

      await context.close();
    });
  });

  test.describe('OAuth with Helper Functions', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should complete OAuth flow using completeOAuthFlow helper (EN)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Use helper function
      await completeOAuthFlow(page, 'github', { locale: 'en' });

      // Assert authenticated
      await assertAuthenticated(page);

      // Assert session cookies
      await assertSessionCookies(context, BASE_URL);

      await context.close();
    });

    test('should complete OAuth flow using completeOAuthFlow helper (DE)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Use helper function
      await completeOAuthFlow(page, 'github', { locale: 'de' });

      // Assert authenticated
      await assertAuthenticated(page);

      await context.close();
    });
  });
});
