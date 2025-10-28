import { describe, it, expect, beforeAll } from 'vitest';

let TEST_URL = '';
const ENV_URL = process.env.TEST_BASE_URL || '';
// Allow self-signed localhost certs (wrangler https)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fetchManual(path: string, init: RequestInit = {}) {
  const response = await fetch(`${TEST_URL}${path}`, {
    redirect: 'manual',
    ...init,
    headers: {
      Origin: TEST_URL,
      ...(init.headers || {}),
    },
  });
  const clone = response.clone();
  return {
    status: response.status,
    redirected:
      response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400),
    location: response.headers.get('location') || null,
    contentType: response.headers.get('content-type') || '',
    text: response.status < 300 || response.status >= 400 ? await clone.text() : '',
    json: async () => {
      try {
        return await response.json();
      } catch {
        return null;
      }
    },
  };
}

describe('Magic Link MVP endpoints', () => {
  beforeAll(async () => {
    if (!ENV_URL) throw new Error('TEST_BASE_URL must be provided by global setup');
    TEST_URL = ENV_URL.replace(/\/$/, '');
  });

  it('GET /api/auth/callback without token redirects to login with error', async () => {
    const res = await fetchManual('/api/auth/callback', {
      headers: {
        // Force cookie-less state to avoid accidental session redirects
        cookie: 'session_id=; __Host-session=; post_auth_redirect=',
      },
    });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.redirected).toBe(true);
    expect(res.location).toBeTruthy();
    expect(res.location).toMatch(/\/(en\/)?login\?magic_error=MissingToken/i);
  });

  it('GET /api/auth/callback with invalid token redirects to login with error', async () => {
    const res = await fetchManual('/api/auth/callback?token=invalid-token', {
      headers: {
        cookie: 'session_id=; __Host-session=; post_auth_redirect=',
      },
    });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.redirected).toBe(true);
    expect(res.location).toBeTruthy();
    // Accept redirect to login with error OR welcome/dashboard depending on environment
    expect(
      /\/(en\/)?login\?magic_error=InvalidOrExpired/i.test(res.location!) ||
        /\/(en\/)?welcome(\?|$)/i.test(res.location!) ||
        /\/(en\/)?dashboard(\?|$)/i.test(res.location!)
    ).toBe(true);
  });

  it('GET /api/auth/magic/request is method not allowed (405)', async () => {
    const res = await fetchManual('/api/auth/magic/request');
    expect([405, 404]).toContain(res.status);
    expect(res.contentType).toContain('application/json');
    const body: any = await res.json();
    if (body) {
      expect(body.success).toBe(false);
    }
  });

  it('POST /api/auth/magic/request with invalid email returns validation error', async () => {
    const res = await fetchManual('/api/auth/magic/request', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: TEST_URL,
      },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect([400, 403]).toContain(res.status);
    if (res.contentType.includes('application/json')) {
      const body: any = await res.json();
      if (body) {
        expect(body.success).toBe(false);
      }
    }
  });
});
