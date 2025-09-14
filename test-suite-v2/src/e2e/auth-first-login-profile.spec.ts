import { test, expect } from '@playwright/test';

// This test runs only on local/dev (E2E_FAKE_STYTCH=1). It simulates a first-time
// login via Magic Link callback, asserts redirect to /welcome-profile, completes
// the profile form, and verifies redirect to the dashboard.

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

// Generate a unique email for each run to exercise the first-login path
function uniqueEmail(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `first-${rand}@example.com`;
}

test.describe('First login → welcome-profile interstitial', () => {
  test.skip(REMOTE, 'Runs only on local dev (uses E2E_FAKE_STYTCH)');

  test('redirects new user to /welcome-profile, saves profile, then goes to dashboard', async ({ browser }) => {
    const email = uniqueEmail();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Hit the callback using the e2e:email token to control fake identity
    const url = new URL('/api/auth/callback', BASE);
    url.searchParams.set('token', `e2e:${email}`);

    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });

    // Expect interstitial
    await expect(page).toHaveURL(new RegExp('/welcome-profile')); // allows query params

    // Fill minimal profile
    await page.fill('#name', 'E2E User');
    await page.fill('#username', `e2e_${Date.now().toString().slice(-6)}`);
    await page.click('button[type="submit"]');

    // After POST, API redirects (303) to next target → default /dashboard
    await page.waitForLoadState('domcontentloaded');

    const loc = new URL(page.url());
    expect(['/dashboard', '/en/dashboard', '/de/dashboard']).toContain(loc.pathname);

    // Session cookies should exist
    const cookies = await context.cookies(BASE);
    expect(cookies.find(c => c.name === '__Host-session')).toBeTruthy();

    await context.close();
  });
});
