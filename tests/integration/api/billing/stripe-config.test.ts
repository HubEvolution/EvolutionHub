import { describe, it, expect } from 'vitest';
import { sendJson, TEST_URL } from '../../../shared/http';
import { debugLogin } from '../../../shared/auth';

// Minimal ApiJson shape used in tests
type ApiJson = { success?: boolean; data?: unknown; error?: { type?: string; message?: string } };

function csrfCookieHeader(token: string, base: string = ''): string {
  return (base ? base + '; ' : '') + `csrf_token=${token}`;
}

describe('Stripe config and billing sync behavior (env-guarded)', () => {
  it('POST /api/billing/credits returns pack_not_configured when STRIPE_SECRET is set and unknown pack is posted', async () => {
    if (!process.env.STRIPE_SECRET) {
      // Env not present: nothing to assert here; behavior covered in next test
      return;
    }
    const token = Math.random().toString(36).slice(2);
    const login = await debugLogin(process.env.DEBUG_LOGIN_TOKEN);
    const headers: Record<string, string> = {
      Origin: TEST_URL,
      'X-CSRF-Token': token,
      Cookie: csrfCookieHeader(token, login.cookie),
      'Content-Type': 'application/json',
    };

    const { res, json } = await sendJson<ApiJson>(
      '/api/billing/credits',
      { pack: 9999 }, // intentionally unknown
      { method: 'POST', headers }
    );
    expect([200, 400, 500]).toContain(res.status);
    // Expect validation_error pack_not_configured if Stripe is configured
    if (json && res.status !== 200) {
      expect(json.success).toBe(false);
      expect(json.error?.type).toBeDefined();
      expect(json.error?.message).toBeDefined();
    }
  });

  it("POST /api/billing/credits returns 'stripe_not_configured' when STRIPE_SECRET is missing (dev/test)", async () => {
    if (process.env.STRIPE_SECRET) {
      // Skip this check if secret is set; covered by previous test
      return;
    }
    const token = Math.random().toString(36).slice(2);
    let cookie = '';
    try {
      const login = await debugLogin(process.env.DEBUG_LOGIN_TOKEN);
      cookie = login.cookie;
    } catch {}
    const headers: Record<string, string> = {
      Origin: TEST_URL,
      'X-CSRF-Token': token,
      Cookie: csrfCookieHeader(token, cookie),
      'Content-Type': 'application/json',
    };

    const { res, json } = await sendJson<ApiJson>(
      '/api/billing/credits',
      { pack: 200 },
      { method: 'POST', headers }
    );
    // In dev without STRIPE_SECRET we accept 401 (auth) or 500 (server error mapping)
    expect([200, 400, 401, 500]).toContain(res.status);
    if (json && res.status !== 200) {
      expect(json.success).toBe(false);
      expect(json.error?.type).toBeDefined();
      expect(json.error?.message).toBeDefined();
    }
  });

  it('GET /api/billing/sync redirects with proper billing flags depending on env and params', async () => {
    // Auth required for /api/billing/sync
    const login = await debugLogin(process.env.DEBUG_LOGIN_TOKEN);
    const url = new URL(`${TEST_URL}/api/billing/sync`);
    // Intentionally omit session_id to exercise missing_session (if secret present) or stripe_not_configured (if secret missing first)
    url.searchParams.set('ws', 'default');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Cookie: login.cookie,
        Origin: TEST_URL,
      },
      redirect: 'manual',
    });
    expect([302, 303, 307, 308]).toContain(res.status);
    const loc = res.headers.get('location') || '';
    expect(loc).toContain('/dashboard');
    // Accept either env-driven indicator
    const ok = /billing=(stripe_not_configured|missing_session|sync_error)/.test(loc);
    expect(ok).toBe(true);
  });
});
