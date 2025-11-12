/**
 * Session Management E2E Tests
 *
 * Tests session lifecycle:
 * - Session creation (login)
 * - Session persistence (across page navigations, reloads)
 * - Session validation (middleware checks)
 * - Session invalidation (logout)
 * - Session expiry
 * - Concurrent sessions (multiple tabs)
 *
 * @see src/middleware.ts
 * @see src/lib/auth-v2.ts
 */

import { test, expect } from '@playwright/test';
import {
  isRemoteTarget,
  getTestEmail,
  getCookieValue,
  assertSessionCookies,
  assertAuthenticated,
  assertNotAuthenticated,
  logout,
} from '../../../fixtures/auth-helpers';

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
const IS_REMOTE = isRemoteTarget();
const FAKE_STYTCH = process.env.E2E_FAKE_STYTCH === '1';

test.describe('Session Management', () => {
  test.describe('Session Creation', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should create session on successful login (OAuth)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // No session cookies before login
      const cookiesBefore = await context.cookies(BASE_URL);
      expect(cookiesBefore.find((c) => c.name === 'session_id')).toBeFalsy();

      // Complete OAuth login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Session cookies should be set after login
      await assertSessionCookies(context, BASE_URL);

      await context.close();
    });

    test('should create session on successful login (Magic Link)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const email = getTestEmail();

      // No session cookies before login
      const cookiesBefore = await context.cookies(BASE_URL);
      expect(cookiesBefore.find((c) => c.name === 'session_id')).toBeFalsy();

      // Complete Magic Link login via dev bypass
      await page.goto(`/api/auth/callback?token=dev-ok&email=${encodeURIComponent(email)}`);
      await page.waitForLoadState('domcontentloaded');

      // Session cookies should be set
      await assertSessionCookies(context, BASE_URL);

      await context.close();
    });
  });

  test.describe('Session Persistence', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should persist session across page navigations', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get initial session ID
      const initialSessionId = await getCookieValue(page, 'session_id');
      expect(initialSessionId).toBeTruthy();

      // Navigate to different pages
      const pages = ['/en/dashboard', '/en/tools/prompt-enhancer', '/en/pricing'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded');

        // Session cookie should persist
        const sessionId = await getCookieValue(page, 'session_id');
        expect(sessionId, `Session should persist on ${pagePath}`).toBeTruthy();
        expect(sessionId, `Session ID should remain the same on ${pagePath}`).toBe(
          initialSessionId
        );

        // Should not be redirected to login
        const currentUrl = page.url();
        expect(currentUrl, `Should not redirect to login on ${pagePath}`).not.toMatch(/\/login/);
      }

      await context.close();
    });

    test('should persist session across page reloads', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      const initialSessionId = await getCookieValue(page, 'session_id');

      // Reload page multiple times
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        const sessionId = await getCookieValue(page, 'session_id');
        expect(sessionId, `Session should persist after reload ${i + 1}`).toBeTruthy();
        expect(sessionId, `Session ID should remain the same after reload ${i + 1}`).toBe(
          initialSessionId
        );

        // Should still be on dashboard
        const currentUrl = page.url();
        expect(currentUrl, `Should still be on dashboard after reload ${i + 1}`).toMatch(
          /dashboard/
        );
      }

      await context.close();
    });

    test('should persist session in browser storage', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get cookies from context
      const cookies = await context.cookies(BASE_URL);
      const sessionCookie = cookies.find((c) => c.name === 'session_id');

      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie?.value).toBeTruthy();

      // Cookie should have expiry date (not session-only)
      expect(sessionCookie?.expires, 'Session cookie should have expiry date').toBeGreaterThan(0);

      // Calculate cookie lifetime (30 days = 2592000 seconds)
      const now = Math.floor(Date.now() / 1000);
      const lifetime = (sessionCookie?.expires || 0) - now;

      // Cookie should last approximately 30 days (allow some tolerance)
      expect(lifetime, 'Cookie should last ~30 days').toBeGreaterThan(25 * 24 * 60 * 60); // At least 25 days
      expect(lifetime, 'Cookie should not last more than 35 days').toBeLessThan(35 * 24 * 60 * 60);

      await context.close();
    });
  });

  test.describe('Session Validation', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should validate session on each request (middleware)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Session is valid - should be on dashboard
      await assertAuthenticated(page);

      // Navigate to protected route
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should still be authenticated (middleware validated session)
      await assertAuthenticated(page);

      await context.close();
    });

    test('should reject invalid session cookie', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Manually set invalid session cookie
      await context.addCookies([
        {
          name: 'session_id',
          value: 'invalid-session-12345',
          path: '/',
          domain: new URL(BASE_URL).hostname,
        },
      ]);

      // Navigate to protected route
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should be redirected to login (invalid session)
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to login with invalid session').toMatch(/\/login/);

      await context.close();
    });
  });

  test.describe('Session Invalidation (Logout)', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should clear session cookies on logout', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify logged in
      await assertAuthenticated(page);

      // Logout
      await logout(page);

      // Session cookies should be cleared
      const sessionId = await getCookieValue(page, 'session_id');
      const hostSession = await getCookieValue(page, '__Host-session');

      expect(sessionId, 'session_id should be cleared after logout').toBeFalsy();
      expect(hostSession, '__Host-session should be cleared after logout').toBeFalsy();

      // Should be on login page
      await assertNotAuthenticated(page);

      await context.close();
    });

    test('should redirect to login when accessing protected routes after logout', async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Logout
      await logout(page);

      // Try to access protected route
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Should be redirected to login
      await assertNotAuthenticated(page);

      await context.close();
    });

    test('should allow re-login after logout', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // First login
      await page.goto('/en/login');
      let githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      await assertAuthenticated(page);

      // Logout
      await logout(page);
      await assertNotAuthenticated(page);

      // Second login
      githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should be authenticated again
      await assertAuthenticated(page);

      // Session ID might be different
      const newSessionId = await getCookieValue(page, 'session_id');
      expect(newSessionId, 'New session should be created after re-login').toBeTruthy();

      await context.close();
    });
  });

  test.describe('Concurrent Sessions (Multiple Tabs)', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should share session across multiple tabs', async ({ browser }) => {
      const context = await browser.newContext();

      // Tab 1: Login
      const page1 = await context.newPage();
      await page1.goto('/en/login');
      const githubButton = page1.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page1.waitForLoadState('domcontentloaded');

      await assertAuthenticated(page1);

      // Get session ID from tab 1
      const sessionId1 = await getCookieValue(page1, 'session_id');

      // Tab 2: Open new tab with same context
      const page2 = await context.newPage();
      await page2.goto('/en/dashboard');
      await page2.waitForLoadState('domcontentloaded');

      // Tab 2 should also be authenticated (shared session)
      await assertAuthenticated(page2);

      // Session ID should be the same
      const sessionId2 = await getCookieValue(page2, 'session_id');
      expect(sessionId2, 'Session should be shared across tabs').toBe(sessionId1);

      await page1.close();
      await page2.close();
      await context.close();
    });

    test('should invalidate session in all tabs on logout', async ({ browser }) => {
      const context = await browser.newContext();

      // Tab 1: Login
      const page1 = await context.newPage();
      await page1.goto('/en/login');
      const githubButton = page1.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page1.waitForLoadState('domcontentloaded');

      // Tab 2: Open authenticated tab
      const page2 = await context.newPage();
      await page2.goto('/en/dashboard');
      await page2.waitForLoadState('domcontentloaded');

      await assertAuthenticated(page2);

      // Tab 1: Logout
      await page1.bringToFront();
      await logout(page1);

      // Tab 2: Navigate to check session
      await page2.bringToFront();
      await page2.goto('/en/dashboard');
      await page2.waitForLoadState('domcontentloaded');

      // Tab 2 should also be logged out (session invalidated)
      await assertNotAuthenticated(page2);

      await page1.close();
      await page2.close();
      await context.close();
    });
  });

  test.describe('Session Expiry (Future Enhancement)', () => {
    test('should handle expired session gracefully', async ({ browser }) => {
      // Session expiry is typically tested via integration/unit tests
      // E2E testing of expiry requires waiting or time manipulation
      test.skip(true, 'Session expiry tested via integration tests');
    });

    test('should refresh session on activity', async ({ browser }) => {
      // Session refresh logic is better tested via integration/unit tests
      test.skip(true, 'Session refresh tested via integration tests');
    });
  });

  test.describe('Session Security', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should not expose session ID in URL or response body', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get session ID from cookie
      const sessionId = await getCookieValue(page, 'session_id');
      expect(sessionId).toBeTruthy();

      // Check URL
      const currentUrl = page.url();
      expect(currentUrl, 'Session ID should NOT be in URL').not.toContain(sessionId!);

      // Check page content
      const pageContent = await page.content();
      expect(pageContent, 'Session ID should NOT be in page content').not.toContain(sessionId!);

      await context.close();
    });

    test('should prevent session fixation attacks', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Manually set a session cookie before login
      const fixedSessionId = 'attacker-fixed-session-12345';

      await context.addCookies([
        {
          name: 'session_id',
          value: fixedSessionId,
          path: '/',
          domain: new URL(BASE_URL).hostname,
        },
      ]);

      // Login
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Session ID should be different after login (new session created)
      const newSessionId = await getCookieValue(page, 'session_id');
      expect(newSessionId, 'New session should be created on login').toBeTruthy();
      expect(newSessionId, 'Session ID should NOT match fixed session').not.toBe(fixedSessionId);

      await context.close();
    });
  });
});
