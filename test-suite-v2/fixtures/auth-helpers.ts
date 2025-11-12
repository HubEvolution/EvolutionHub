/**
 * Auth Test Helpers & Fixtures
 *
 * Reusable helpers for Auth E2E tests (OAuth, Magic Link, Session Management)
 */

import type { Page, BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';

/**
 * Check if BASE_URL is a remote target (not localhost/127.0.0.1)
 */
export function isRemoteTarget(): boolean {
  try {
    const u = new URL(BASE_URL);
    return !(u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

/**
 * Check if BASE_URL is HTTPS
 */
export function isHttps(): boolean {
  try {
    const u = new URL(BASE_URL);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get test email from env or use default
 */
export function getTestEmail(): string {
  return (
    process.env.STYTCH_TEST_EMAIL || process.env.MAGIC_TEST_EMAIL || 'stytchttest@hub-evolution.com'
  );
}

/**
 * Generate unique email for test isolation
 */
export function generateUniqueEmail(prefix = 'e2e'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${rand}-${timestamp}@example.com`;
}

/**
 * Get cookie value from page context
 */
export async function getCookieValue(page: Page, name: string): Promise<string | undefined> {
  const url = page.url?.() || BASE_URL;
  let cookies = await page.context().cookies(url);
  let c = cookies.find((c) => c.name === name);
  if (c?.value) return c.value;

  // Fallback: read all cookies in context
  cookies = await page.context().cookies();
  c = cookies.find((c) => c.name === name);
  return c?.value;
}

/**
 * Assert session cookies are set correctly
 *
 * @param context - Browser context
 * @param baseUrl - Base URL for cookie context
 * @param options - Assertion options
 */
export async function assertSessionCookies(
  context: BrowserContext,
  baseUrl: string,
  options: {
    expectHostSession?: boolean; // Expect __Host-session cookie (HTTPS only)
    expectSessionId?: boolean; // Expect session_id cookie (default: true)
  } = {}
): Promise<void> {
  const { expectHostSession = isHttps(), expectSessionId = true } = options;

  const cookies = await context.cookies(baseUrl);

  // Assert session_id cookie
  if (expectSessionId) {
    const sessionId = cookies.find((c) => c.name === 'session_id');
    expect(sessionId, 'session_id cookie should be set').toBeTruthy();
    expect(sessionId?.httpOnly, 'session_id should be HttpOnly').toBeTruthy();
    expect(sessionId?.path, 'session_id should have Path=/').toBe('/');
    expect(sessionId?.sameSite, 'session_id should have SameSite=Lax').toBe('Lax');
  }

  // Assert __Host-session cookie (only on HTTPS)
  if (expectHostSession) {
    const hostSession = cookies.find((c) => c.name === '__Host-session');
    expect(hostSession, '__Host-session cookie should be set on HTTPS').toBeTruthy();
    expect(hostSession?.httpOnly, '__Host-session should be HttpOnly').toBeTruthy();
    expect(hostSession?.path, '__Host-session should have Path=/').toBe('/');
    expect(hostSession?.secure, '__Host-session should be Secure').toBeTruthy();
    expect(hostSession?.sameSite, '__Host-session should have SameSite=Strict').toBe('Strict');
  }
}

/**
 * Complete OAuth flow (GitHub or Google)
 *
 * @param page - Playwright page
 * @param provider - OAuth provider ('github' | 'google')
 * @param options - Flow options
 */
export async function completeOAuthFlow(
  page: Page,
  provider: 'github' | 'google',
  options: {
    locale?: 'en' | 'de'; // Locale for login page (default: 'en')
    expectWelcome?: boolean; // Expect redirect to welcome-profile (new user)
    targetAfterAuth?: string; // Expected redirect target (default: '/dashboard')
  } = {}
): Promise<void> {
  const { locale = 'en', expectWelcome = false, targetAfterAuth = '/dashboard' } = options;

  // Navigate to login page with locale
  await page.goto(`/${locale}/login`);

  // Wait for login page to load
  await page.waitForLoadState('domcontentloaded');

  // Find OAuth button by provider
  const providerButtonSelectors = {
    github: [
      'a:has-text("Continue with GitHub")',
      'a:has-text("Mit GitHub anmelden")',
      'button:has-text("GitHub")',
      'a[href*="/api/auth/oauth/github/start"]',
    ],
    google: [
      'a:has-text("Continue with Google")',
      'a:has-text("Mit Google anmelden")',
      'button:has-text("Google")',
      'a[href*="/api/auth/oauth/google/start"]',
    ],
  };

  const selectors = providerButtonSelectors[provider];
  let oauthButton = null;

  for (const selector of selectors) {
    const button = page.locator(selector);
    if ((await button.count()) > 0) {
      oauthButton = button.first();
      break;
    }
  }

  expect(oauthButton, `OAuth ${provider} button should be visible`).toBeTruthy();

  // Click OAuth button to start flow
  await oauthButton!.click();

  // For local dev with E2E_FAKE_STYTCH, the OAuth flow is mocked
  // The page will redirect directly to callback and then to dashboard or welcome-profile
  const isLocal = !isRemoteTarget();
  const fakeStytchEnabled = process.env.E2E_FAKE_STYTCH === '1';

  if (isLocal && fakeStytchEnabled) {
    // Wait for redirect to complete
    await page.waitForLoadState('domcontentloaded');

    if (expectWelcome) {
      // Expect redirect to welcome-profile
      await expect(page).toHaveURL(new RegExp(`/${locale}/welcome-profile`));
    } else {
      // Expect redirect to target (dashboard)
      await expect(page).toHaveURL(new RegExp(targetAfterAuth));
    }
  }
  // For remote targets, we cannot complete the OAuth flow (requires real Stytch interaction)
  // Tests should be skipped or only validate the OAuth start endpoint
}

/**
 * Complete Magic Link flow
 *
 * @param page - Playwright page
 * @param email - Email for magic link
 * @param options - Flow options
 */
export async function completeMagicLinkFlow(
  page: Page,
  email: string,
  options: {
    locale?: 'en' | 'de';
    targetAfterAuth?: string;
  } = {}
): Promise<void> {
  const { locale = 'en', targetAfterAuth = '/dashboard' } = options;

  // Navigate to login page
  await page.goto(`/${locale}/login?r=${targetAfterAuth}`);

  // Fill magic link email field
  await page.fill('#email-magic', email);

  // Submit magic link request
  await page.click('form[action="/api/auth/magic/request"] button[type="submit"]');

  // For local dev with E2E_FAKE_STYTCH, simulate callback
  const isLocal = !isRemoteTarget();
  const fakeStytchEnabled = process.env.E2E_FAKE_STYTCH === '1';

  if (isLocal && fakeStytchEnabled) {
    // Navigate to dev bypass callback
    await page.goto(`/api/auth/callback?token=dev-ok&email=${encodeURIComponent(email)}`);

    // Wait for redirect to dashboard
    await page.waitForURL(new RegExp(targetAfterAuth));
  }
}

/**
 * Login helper (delegates to OAuth or Magic Link)
 *
 * @param page - Playwright page
 * @param method - Auth method
 * @param email - Email (for magic link only)
 */
export async function loginAs(
  page: Page,
  method: 'magic-link' | 'oauth-github' | 'oauth-google',
  email?: string
): Promise<void> {
  if (method === 'magic-link') {
    const testEmail = email || getTestEmail();
    await completeMagicLinkFlow(page, testEmail);
  } else if (method === 'oauth-github') {
    await completeOAuthFlow(page, 'github');
  } else if (method === 'oauth-google') {
    await completeOAuthFlow(page, 'google');
  }
}

/**
 * Logout helper
 *
 * @param page - Playwright page
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to dashboard (or current page)
  const currentUrl = page.url();

  // Look for logout button
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Abmelden")',
    'a:has-text("Logout")',
    'a:has-text("Abmelden")',
    'button[aria-label*="Logout"]',
    'button[aria-label*="Abmelden"]',
  ];

  let logoutButton = null;

  for (const selector of logoutSelectors) {
    const button = page.locator(selector);
    if ((await button.count()) > 0 && (await button.isVisible())) {
      logoutButton = button.first();
      break;
    }
  }

  if (logoutButton) {
    await logoutButton.click();
    // Wait for redirect to login
    await page.waitForURL(new RegExp('/login'));
  } else {
    // Fallback: directly navigate to logout endpoint (if it exists)
    // Note: /api/auth/logout is deprecated (410), so we manually clear cookies
    await page.context().clearCookies();
    await page.goto('/en/login');
  }
}

/**
 * Assert user is authenticated (dashboard is accessible)
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  const currentUrl = page.url();
  expect(currentUrl, 'Should be on dashboard or authenticated page').toMatch(
    /dashboard|profile|settings/i
  );

  // Session cookies should be present
  const sessionId = await getCookieValue(page, 'session_id');
  const hostSession = await getCookieValue(page, '__Host-session');

  expect(sessionId || hostSession, 'Session cookie should be present').toBeTruthy();
}

/**
 * Assert user is NOT authenticated (redirected to login)
 */
export async function assertNotAuthenticated(page: Page): Promise<void> {
  const currentUrl = page.url();
  expect(currentUrl, 'Should be on login page').toMatch(/\/login/i);

  // Session cookies should NOT be present
  const sessionId = await getCookieValue(page, 'session_id');
  const hostSession = await getCookieValue(page, '__Host-session');

  expect(sessionId, 'session_id cookie should NOT be present').toBeFalsy();
  expect(hostSession, '__Host-session cookie should NOT be present').toBeFalsy();
}

/**
 * Wait for OAuth redirect to complete
 * (useful for remote targets where we cannot complete the flow)
 */
export async function waitForOAuthStart(page: Page, provider: 'github' | 'google'): Promise<void> {
  // Wait for redirect to Stytch OAuth start endpoint
  await page.waitForURL(new RegExp(`/api/auth/oauth/${provider}/start`));
}

/**
 * Assert OAuth start request succeeds
 */
export async function assertOAuthStartSuccess(
  page: Page,
  provider: 'github' | 'google'
): Promise<void> {
  const response = await page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/auth/oauth/${provider}/start`) && resp.request().method() === 'GET'
  );

  expect(response.ok(), `OAuth ${provider} start should succeed`).toBeTruthy();
}

/**
 * Fill and submit welcome-profile form
 */
export async function completeWelcomeProfile(
  page: Page,
  options: {
    name: string;
    username: string;
  }
): Promise<void> {
  const { name, username } = options;

  // Wait for welcome-profile page
  await expect(page).toHaveURL(new RegExp('/welcome-profile'));

  // Fill form
  await page.fill('#name', name);
  await page.fill('#username', username);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForLoadState('domcontentloaded');
}
