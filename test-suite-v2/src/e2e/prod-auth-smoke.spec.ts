import { test, expect } from '@playwright/test';

// Production auth smoke tests for hub-evolution.com
// Safe checks only: we verify that Magic Link request succeeds (200 JSON)
// and that callback without token redirects back to login with an error.
//
// To enable, set:
//   E2E_PROD_AUTH_SMOKE=1
//   TEST_BASE_URL=https://hub-evolution.com
//   STYTCH_TEST_EMAIL=<your test email>
// Otherwise this spec will be skipped.

const BASE = process.env.TEST_BASE_URL || '';
const ENABLED = process.env.E2E_PROD_AUTH_SMOKE === '1' || process.env.E2E_PROD_AUTH_SMOKE === 'true';
const EMAIL = process.env.STYTCH_TEST_EMAIL || '';

function isHubProd(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.origin === 'https://hub-evolution.com';
  } catch {
    return false;
  }
}

test.describe('Prod Auth Smoke (hub-evolution.com)', () => {
  test.skip(!(ENABLED && isHubProd(BASE) && EMAIL), 'Set E2E_PROD_AUTH_SMOKE=1, TEST_BASE_URL=https://hub-evolution.com and STYTCH_TEST_EMAIL to run');

  test('POST /api/auth/magic/request returns 200 { sent: true }', async ({ request }) => {
    const res = await request.post(new URL('/api/auth/magic/request', BASE).toString(), {
      headers: {
        'Origin': 'https://hub-evolution.com',
        'Content-Type': 'application/json'
      },
      data: {
        email: EMAIL,
        r: '/dashboard',
        locale: 'en'
      }
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, data: { sent: true } });
  });

  test('GET /login returns security headers (CSP, HSTS, X-Frame-Options, COOP)', async ({ request }) => {
    // English or neutral route should both set headers via middleware
    const res = await request.get(new URL('/en/login', BASE).toString(), { maxRedirects: 0 });
    expect([200, 302, 301, 303]).toContain(res.status());
    const headers = res.headers();
    // Core headers we expect in production
    expect(typeof headers['content-security-policy'] === 'string' || typeof headers['Content-Security-Policy'] === 'string').toBeTruthy();
    expect((headers['strict-transport-security'] || headers['Strict-Transport-Security'])?.includes('max-age')).toBeTruthy();
    expect((headers['x-frame-options'] || headers['X-Frame-Options'])?.toUpperCase()).toContain('DENY');
    expect((headers['cross-origin-opener-policy'] || headers['Cross-Origin-Opener-Policy'])?.toLowerCase()).toBe('same-origin');
  });

  test('GET /api/auth/callback without token redirects to login error', async ({ request }) => {
    const res = await request.get(new URL('/api/auth/callback', BASE).toString(), { maxRedirects: 0 });
    expect([302, 301, 303]).toContain(res.status());
    const loc = res.headers()['location'] || res.headers()['Location'];
    expect(typeof loc).toBe('string');
    const location = String(loc);
    expect(location.includes('/en/login?magic_error=MissingToken') || location.includes('/login?magic_error=MissingToken')).toBeTruthy();
    // Redirect responses should also carry security headers
    const headers = res.headers();
    expect(typeof headers['content-security-policy'] === 'string' || typeof headers['Content-Security-Policy'] === 'string').toBeTruthy();
    expect((headers['strict-transport-security'] || headers['Strict-Transport-Security'])?.includes('max-age')).toBeTruthy();
    expect((headers['x-frame-options'] || headers['X-Frame-Options'])?.toUpperCase()).toContain('DENY');
    expect((headers['cross-origin-opener-policy'] || headers['Cross-Origin-Opener-Policy'])?.toLowerCase()).toBe('same-origin');
  });

  test('GET /api/auth/callback with invalid token redirects to login InvalidOrExpired', async ({ request }) => {
    const url = new URL('/api/auth/callback', BASE);
    url.searchParams.set('token', 'definitely-invalid-token');
    const res = await request.get(url.toString(), { maxRedirects: 0 });
    expect([302, 301, 303]).toContain(res.status());
    const loc = res.headers()['location'] || res.headers()['Location'];
    expect(typeof loc).toBe('string');
    const location = String(loc);
    expect(location.includes('/en/login?magic_error=InvalidOrExpired') || location.includes('/login?magic_error=InvalidOrExpired')).toBeTruthy();
  });
});
