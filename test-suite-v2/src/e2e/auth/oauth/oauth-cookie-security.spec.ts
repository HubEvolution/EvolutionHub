/**
 * OAuth Cookie Security Tests
 *
 * Based on v1.7.2 cookie fixes:
 * - Explicit Set-Cookie headers in response (fixes Astro cookie API limitation)
 * - Conditional __Host-session cookie (only on HTTPS)
 * - Correct cookie attributes (HttpOnly, Secure, SameSite, Path)
 *
 * @see docs/troubleshooting/oauth-login-issues.md#oauth-erfolgreich-aber-redirect-zu-login
 * @see src/pages/api/auth/oauth/[provider]/callback.ts:239-242
 */

import { test, expect } from '@playwright/test';
import {
  isRemoteTarget,
  isHttps,
  assertSessionCookies,
  getCookieValue,
} from '../../../../fixtures/auth-helpers';

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
const IS_REMOTE = isRemoteTarget();
const IS_HTTPS = isHttps();
const FAKE_STYTCH = process.env.E2E_FAKE_STYTCH === '1';

test.describe('OAuth Cookie Security', () => {
  test.describe('HTTP Cookie Behavior (Local Dev)', () => {
    test.skip(IS_REMOTE || IS_HTTPS, 'Only for local HTTP development');

    test('should set session_id cookie with correct attributes on HTTP', async ({ browser }) => {
      test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to login and complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get cookies
      const cookies = await context.cookies(BASE_URL);
      const sessionId = cookies.find((c) => c.name === 'session_id');

      // Assert session_id cookie attributes
      expect(sessionId, 'session_id cookie should be set').toBeTruthy();
      expect(sessionId?.value, 'session_id should have a value').toBeTruthy();
      expect(sessionId?.httpOnly, 'session_id should be HttpOnly').toBeTruthy();
      expect(sessionId?.path, 'session_id should have Path=/').toBe('/');
      expect(sessionId?.sameSite, 'session_id should have SameSite=Lax').toBe('Lax');
      expect(sessionId?.secure, 'session_id should NOT be Secure on HTTP').toBeFalsy();

      // Domain should not be set (cookie prefix rules)
      expect(sessionId?.domain, 'session_id should not have explicit Domain').toBeTruthy(); // Browser sets domain automatically

      await context.close();
    });

    test('should NOT set __Host-session cookie on HTTP', async ({ browser }) => {
      test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get cookies
      const cookies = await context.cookies(BASE_URL);
      const hostSession = cookies.find((c) => c.name === '__Host-session');

      // __Host-session should NOT be set on HTTP (requires Secure flag)
      expect(hostSession, '__Host-session should NOT be set on HTTP').toBeFalsy();

      await context.close();
    });

    test('should make session_id available for immediate follow-up requests', async ({ browser }) => {
      test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // The OAuth callback should redirect to dashboard
      // This redirect happens immediately after setting cookies
      // The dashboard request MUST have access to the session_id cookie

      const currentUrl = page.url();
      expect(currentUrl).toMatch(/dashboard/);

      // Verify middleware recognized the session cookie (no redirect to login)
      expect(currentUrl).not.toMatch(/login/);

      // Verify session cookie is present
      const sessionId = await getCookieValue(page, 'session_id');
      expect(sessionId, 'session_id should be available in page context').toBeTruthy();

      await context.close();
    });
  });

  test.describe('HTTPS Cookie Behavior (Staging/Production)', () => {
    test.skip(!IS_HTTPS, 'Only for HTTPS environments');

    test('should set session_id cookie with Secure flag on HTTPS', async ({ browser }) => {
      test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get cookies
      const cookies = await context.cookies(BASE_URL);
      const sessionId = cookies.find((c) => c.name === 'session_id');

      // Assert session_id cookie attributes
      expect(sessionId, 'session_id cookie should be set').toBeTruthy();
      expect(sessionId?.httpOnly, 'session_id should be HttpOnly').toBeTruthy();
      expect(sessionId?.path, 'session_id should have Path=/').toBe('/');
      expect(sessionId?.sameSite, 'session_id should have SameSite=Lax').toBe('Lax');
      expect(sessionId?.secure, 'session_id SHOULD be Secure on HTTPS').toBeTruthy();

      await context.close();
    });

    test('should set __Host-session cookie with strict attributes on HTTPS', async ({ browser }) => {
      test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get cookies
      const cookies = await context.cookies(BASE_URL);
      const hostSession = cookies.find((c) => c.name === '__Host-session');

      // Assert __Host-session cookie attributes
      expect(hostSession, '__Host-session cookie should be set on HTTPS').toBeTruthy();
      expect(hostSession?.value, '__Host-session should have a value').toBeTruthy();
      expect(hostSession?.httpOnly, '__Host-session should be HttpOnly').toBeTruthy();
      expect(hostSession?.path, '__Host-session should have Path=/').toBe('/');
      expect(hostSession?.sameSite, '__Host-session should have SameSite=Strict').toBe('Strict');
      expect(hostSession?.secure, '__Host-session MUST be Secure').toBeTruthy();

      // __Host- prefix requires NO Domain attribute
      // Browser will automatically set domain to current host
      expect(hostSession?.domain, '__Host-session domain is set by browser').toBeTruthy();

      await context.close();
    });

    test('should make both cookies available for immediate follow-up requests', async ({ browser }) => {
      test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify both cookies are available
      const sessionId = await getCookieValue(page, 'session_id');
      const hostSession = await getCookieValue(page, '__Host-session');

      expect(sessionId, 'session_id should be available').toBeTruthy();
      expect(hostSession, '__Host-session should be available').toBeTruthy();

      // Verify middleware recognized session (no redirect to login)
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/dashboard/);
      expect(currentUrl).not.toMatch(/login/);

      await context.close();
    });
  });

  test.describe('Explicit Set-Cookie Header Tests', () => {
    test.skip(IS_REMOTE, 'Only for local dev (requires response inspection)');

    test('should set cookies via explicit Set-Cookie header in response', async ({ browser }) => {
      test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Intercept OAuth callback response
      let setCookieHeader: string | null = null;

      page.on('response', (response) => {
        if (response.url().includes('/api/auth/oauth/github/callback')) {
          const headers = response.headers();
          setCookieHeader = headers['set-cookie'] || null;
        }
      });

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Assert Set-Cookie header was present in callback response
      expect(setCookieHeader, 'OAuth callback should include Set-Cookie header').toBeTruthy();

      // Parse Set-Cookie header
      if (setCookieHeader) {
        const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

        // Assert session_id cookie in Set-Cookie header
        const sessionIdCookie = cookieStrings.find((c) => c.includes('session_id='));
        expect(sessionIdCookie, 'Set-Cookie should include session_id').toBeTruthy();

        // Assert cookie attributes in Set-Cookie string
        expect(sessionIdCookie).toContain('HttpOnly');
        expect(sessionIdCookie).toContain('SameSite=Lax');
        expect(sessionIdCookie).toContain('Path=/');

        if (IS_HTTPS) {
          expect(sessionIdCookie).toContain('Secure');

          // Assert __Host-session cookie in Set-Cookie header (HTTPS only)
          const hostSessionCookie = cookieStrings.find((c) => c.includes('__Host-session='));
          expect(hostSessionCookie, 'Set-Cookie should include __Host-session on HTTPS').toBeTruthy();
        } else {
          // On HTTP, session_id should NOT have Secure flag
          expect(sessionIdCookie).not.toContain('Secure');
        }
      }

      await context.close();
    });
  });

  test.describe('Cookie Persistence Tests', () => {
    test.skip(!FAKE_STYTCH, 'Requires E2E_FAKE_STYTCH=1');

    test('should persist session cookies across page navigations', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get initial session cookie
      const initialSessionId = await getCookieValue(page, 'session_id');
      expect(initialSessionId, 'Initial session_id should be set').toBeTruthy();

      // Navigate to another page
      await page.goto('/en/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Session cookie should still be present
      const persistedSessionId = await getCookieValue(page, 'session_id');
      expect(persistedSessionId, 'Session cookie should persist across navigations').toBeTruthy();
      expect(persistedSessionId, 'Session ID should remain the same').toBe(initialSessionId);

      // Navigate to tools page
      await page.goto('/en/tools/prompt-enhancer');
      await page.waitForLoadState('domcontentloaded');

      // Session cookie should still be present
      const toolsSessionId = await getCookieValue(page, 'session_id');
      expect(toolsSessionId, 'Session cookie should persist to tools page').toBeTruthy();
      expect(toolsSessionId, 'Session ID should remain the same').toBe(initialSessionId);

      await context.close();
    });

    test('should persist session cookies across page reloads', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get initial session cookie
      const initialSessionId = await getCookieValue(page, 'session_id');
      expect(initialSessionId).toBeTruthy();

      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Session cookie should still be present
      const reloadedSessionId = await getCookieValue(page, 'session_id');
      expect(reloadedSessionId, 'Session cookie should persist after reload').toBeTruthy();
      expect(reloadedSessionId, 'Session ID should remain the same').toBe(initialSessionId);

      // User should still be on dashboard (no redirect to login)
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/dashboard/);

      await context.close();
    });
  });

  test.describe('Helper Function Tests', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should validate session cookies using assertSessionCookies helper (HTTP)', async ({ browser }) => {
      test.skip(IS_HTTPS, 'Only for HTTP');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Use helper to assert cookies
      await assertSessionCookies(context, BASE_URL, {
        expectSessionId: true,
        expectHostSession: false, // Should NOT be set on HTTP
      });

      await context.close();
    });

    test('should validate session cookies using assertSessionCookies helper (HTTPS)', async ({ browser }) => {
      test.skip(!IS_HTTPS, 'Only for HTTPS');

      const context = await browser.newContext();
      const page = await context.newPage();

      // Complete OAuth flow
      await page.goto('/en/login');
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Use helper to assert cookies
      await assertSessionCookies(context, BASE_URL, {
        expectSessionId: true,
        expectHostSession: true, // SHOULD be set on HTTPS
      });

      await context.close();
    });
  });
});
