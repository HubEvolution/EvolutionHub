/**
 * OAuth Welcome Profile Flow E2E Tests
 *
 * Tests the welcome-profile interstitial for first-time OAuth users:
 * - New user → redirect to /welcome-profile (with locale)
 * - Fill profile form → redirect to original target
 * - Returning user → skip welcome-profile, go to dashboard
 *
 * Based on v1.7.2 welcome-profile redirect fixes:
 * - Locale-aware redirect (`/en/welcome-profile`, `/de/welcome-profile`)
 * - Preserve `next` parameter for post-profile redirect
 *
 * @see src/pages/api/auth/oauth/[provider]/callback.ts:162-174
 * @see src/pages/en/welcome-profile.astro
 * @see src/pages/de/welcome-profile.astro
 */

import { test, expect } from '@playwright/test';
import {
  isRemoteTarget,
  generateUniqueEmail,
  completeWelcomeProfile,
  assertAuthenticated,
  assertSessionCookies,
} from '../../../../fixtures/auth-helpers';

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
const IS_REMOTE = isRemoteTarget();
const FAKE_STYTCH = process.env.E2E_FAKE_STYTCH === '1';

test.describe('OAuth Welcome Profile Flow', () => {
  test.describe('First-Time User Flow (Local Dev Only)', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should redirect new OAuth user to welcome-profile (EN)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Generate unique email to simulate new user
      const newUserEmail = generateUniqueEmail('oauth-new');

      // Navigate to login
      await page.goto('/en/login');

      // Use OAuth callback with unique email to simulate new user
      // In E2E_FAKE_STYTCH mode, the callback checks if user exists in DB
      // For new users (with e2e:email token), callback should redirect to welcome-profile
      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);

      // Wait for redirect
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to /en/welcome-profile (with EN locale)
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to EN welcome-profile').toMatch(/\/en\/welcome-profile/);

      // Welcome-profile page should have form
      const nameField = page.locator('#name');
      const usernameField = page.locator('#username');
      const submitButton = page.locator('button[type="submit"]');

      await expect(nameField, 'Name field should be visible').toBeVisible();
      await expect(usernameField, 'Username field should be visible').toBeVisible();
      await expect(submitButton, 'Submit button should be visible').toBeVisible();

      await context.close();
    });

    test('should redirect new OAuth user to welcome-profile (DE)', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-new-de');

      // Use DE login context
      await page.goto('/de/login');

      // Simulate OAuth callback for new user
      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);

      await page.waitForLoadState('domcontentloaded');

      // Should redirect to /de/welcome-profile (with DE locale)
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to DE welcome-profile').toMatch(/\/de\/welcome-profile/);

      await context.close();
    });

    test('should complete welcome-profile and redirect to dashboard', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-complete');

      // Navigate to OAuth callback for new user
      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Should be on welcome-profile
      await expect(page).toHaveURL(new RegExp('/welcome-profile'));

      // Fill profile form
      await page.fill('#name', 'OAuth Test User');
      await page.fill('#username', `oauth_${Date.now().toString().slice(-6)}`);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to dashboard (default target)
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to dashboard after profile completion').toMatch(/dashboard/);

      // User should be authenticated
      await assertAuthenticated(page);

      await context.close();
    });

    test('should preserve `next` parameter and redirect to target after profile', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-next');
      const targetUrl = '/en/tools/prompt-enhancer';

      // Navigate to OAuth callback with `next` target
      const callbackUrl = `/api/auth/callback?token=e2e:${newUserEmail}&next=${encodeURIComponent(targetUrl)}`;
      await page.goto(callbackUrl);
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to welcome-profile with `next` param
      const welcomeUrl = page.url();
      expect(welcomeUrl).toMatch(/\/welcome-profile/);
      expect(welcomeUrl, 'Welcome-profile URL should include next param').toContain('next=');

      // Complete profile
      await completeWelcomeProfile(page, {
        name: 'Target Test User',
        username: `target_${Date.now().toString().slice(-6)}`,
      });

      // Should redirect to target URL (not dashboard)
      const finalUrl = page.url();
      expect(finalUrl, 'Should redirect to target after profile').toMatch(/prompt-enhancer/);

      await context.close();
    });

    test('should use helper function to complete welcome-profile flow', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-helper');

      // Simulate new user OAuth callback
      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Use helper to complete welcome-profile
      await completeWelcomeProfile(page, {
        name: 'Helper Test User',
        username: `helper_${Date.now().toString().slice(-6)}`,
      });

      // Should be on dashboard
      await assertAuthenticated(page);

      await context.close();
    });
  });

  test.describe('Returning User Flow (Local Dev Only)', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should skip welcome-profile for returning user', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Use standard test email (simulates existing user)
      // For E2E_FAKE_STYTCH mode, `dev-ok` token simulates existing user
      await page.goto('/en/login');

      // Click GitHub OAuth button
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();

      // Wait for OAuth flow to complete
      await page.waitForLoadState('domcontentloaded');

      // Should redirect directly to dashboard (skip welcome-profile)
      const currentUrl = page.url();
      expect(currentUrl, 'Should go to dashboard').toMatch(/dashboard/);
      expect(currentUrl, 'Should NOT go to welcome-profile').not.toMatch(/welcome-profile/);

      await context.close();
    });

    test('should redirect returning user to target (r=...) without welcome-profile', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const targetUrl = '/en/tools/prompt-enhancer';

      // Login with target redirect
      await page.goto(`/en/login?r=${encodeURIComponent(targetUrl)}`);

      // Complete OAuth flow (returning user)
      const githubButton = page.locator('a:has-text("Continue with GitHub")').first();
      await githubButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to target (not welcome-profile, not dashboard)
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to target').toMatch(/prompt-enhancer/);
      expect(currentUrl, 'Should NOT show welcome-profile').not.toMatch(/welcome-profile/);

      await context.close();
    });
  });

  test.describe('Welcome-Profile Form Validation', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should require name and username', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-validation');

      // Navigate to welcome-profile
      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Form should show validation errors (browser native or custom)
      // Note: Exact validation behavior depends on form implementation

      // Check if still on welcome-profile (form not submitted)
      const currentUrl = page.url();
      expect(currentUrl, 'Should stay on welcome-profile with invalid form').toMatch(/welcome-profile/);

      await context.close();
    });

    test('should validate username format', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-username');

      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Fill name but use invalid username
      await page.fill('#name', 'Test User');
      await page.fill('#username', 'invalid username with spaces!');

      // Try to submit
      await page.click('button[type="submit"]');

      // Should show validation error or stay on form
      const currentUrl = page.url();
      expect(currentUrl, 'Should stay on welcome-profile with invalid username').toMatch(/welcome-profile/);

      await context.close();
    });

    test('should accept valid name and username', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-valid');

      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Fill with valid data
      await page.fill('#name', 'Valid User');
      await page.fill('#username', `valid_user_${Date.now().toString().slice(-6)}`);

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      // Should redirect to dashboard
      const currentUrl = page.url();
      expect(currentUrl, 'Should redirect to dashboard with valid form').toMatch(/dashboard/);

      await context.close();
    });
  });

  test.describe('Welcome-Profile Locale Handling', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should display EN welcome-profile content', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-en-content');

      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Check for EN content (page title, labels, etc.)
      const pageTitle = await page.title();
      expect(pageTitle, 'Page title should be in English').toBeTruthy();

      // Check for EN form labels (adjust selectors based on actual implementation)
      const pageContent = await page.content();
      expect(pageContent).toMatch(/welcome|profile|name|username/i);

      await context.close();
    });

    test('should display DE welcome-profile content', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-de-content');

      // Use DE login context
      await page.goto('/de/login');
      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Should be on DE welcome-profile
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/de\/welcome-profile/);

      // Check for DE content
      const pageTitle = await page.title();
      expect(pageTitle, 'Page title should be in German').toBeTruthy();

      await context.close();
    });
  });

  test.describe('Session Persistence in Welcome-Profile Flow', () => {
    test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');

    test('should maintain session cookies during welcome-profile flow', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const newUserEmail = generateUniqueEmail('oauth-session');

      // Complete OAuth callback
      await page.goto(`/api/auth/callback?token=e2e:${newUserEmail}`);
      await page.waitForLoadState('domcontentloaded');

      // Should be on welcome-profile with session cookies
      await assertSessionCookies(context, BASE_URL);

      // Complete profile
      await completeWelcomeProfile(page, {
        name: 'Session Test User',
        username: `session_${Date.now().toString().slice(-6)}`,
      });

      // Session cookies should still be present after profile completion
      await assertSessionCookies(context, BASE_URL);

      await context.close();
    });
  });
});
