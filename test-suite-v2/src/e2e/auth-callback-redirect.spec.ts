import { test, expect } from '@playwright/test';

// This E2E validates the simplified direct redirect from /api/auth/callback
// and asserts that session cookies are set. It only runs against local targets;
// for remote TEST_BASE_URL, we skip to avoid calling the real Stytch API.

const BASE = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';

function isRemote(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return !(u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

const REMOTE = isRemote(BASE);

test.describe('Auth callback direct redirect', () => {
  test.skip(REMOTE, 'Runs only on local dev (uses E2E_FAKE_STYTCH)');

  test('callback sets session cookies and redirects to dashboard', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Start with a clean cookie jar
    const cookiesBefore = await context.cookies(BASE);
    expect(cookiesBefore.find(c => c.name === '__Host-session' || c.name === 'session_id')).toBeFalsy();

    // Use any token value; in local dev E2E_FAKE_STYTCH=1 makes authenticate return a fake verified user
    const url = new URL('/api/auth/callback', BASE);
    url.searchParams.set('token', 'e2e-fake');
    url.searchParams.set('email', 'e2e@example.com');

    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });

    // Expect to land on dashboard (possibly localized by cookie; default is non-localized)
    const current = new URL(page.url());
    expect(current.pathname === '/dashboard' || current.pathname === '/en/dashboard' || current.pathname === '/de/dashboard').toBeTruthy();

    // Session cookies should be present; HttpOnly is asserted via cookie metadata
    const cookiesAfter = await context.cookies(BASE);
    const legacy = cookiesAfter.find(c => c.name === 'session_id');
    const hostSess = cookiesAfter.find(c => c.name === '__Host-session');

    expect(legacy).toBeTruthy();
    expect(hostSess).toBeTruthy();

    // Both cookies should be HttpOnly and Path=/; Secure may be false on plain HTTP local dev
    expect(legacy?.httpOnly).toBeTruthy();
    expect(hostSess?.httpOnly).toBeTruthy();
    expect(legacy?.path).toBe('/');
    expect(hostSess?.path).toBe('/');

    await context.close();
  });
});
