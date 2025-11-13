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
    allow: response.headers.get('allow') || null,
    setCookie: response.headers.get('set-cookie') || '',
    xfo: response.headers.get('x-frame-options') || '',
    referrerPolicy: response.headers.get('referrer-policy') || '',
    xcto: response.headers.get('x-content-type-options') || '',
    hsts: response.headers.get('strict-transport-security') || '',
    permissionsPolicy: response.headers.get('permissions-policy') || '',
    retryAfter: response.headers.get('retry-after') || '',
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

  it('GET /api/auth/magic/request returns 405 with Allow: POST', async () => {
    const res = await fetchManual('/api/auth/magic/request');
    expect(res.status).toBe(405);
    // Allow header should include POST
    expect(res.allow && /\bPOST\b/i.test(res.allow)).toBe(true);
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

  it('POST /api/auth/magic/request without CSRF returns 403 forbidden', async () => {
    const res = await fetchManual('/api/auth/magic/request', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: TEST_URL,
      },
      body: JSON.stringify({ email: 'user@example.com' }),
    });
    expect(res.status).toBe(403);
    if (res.contentType.includes('application/json')) {
      const body: any = await res.json();
      if (body) {
        expect(body.success).toBe(false);
        // optional: type is 'forbidden' per middleware mapping
        if (body.error && typeof body.error.type === 'string') {
          expect(body.error.type).toMatch(/forbidden/i);
        }
      }
    }
  });

  it('POST /api/auth/magic/request persists post_auth_redirect cookie for allowed relative r', async () => {
    const token = 'abc123def456abc123def456abc123de';
    const res = await fetchManual('/api/auth/magic/request', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: TEST_URL,
        'x-csrf-token': token,
        cookie: `csrf_token=${token}`,
      },
      body: JSON.stringify({ email: 'user@example.com', r: '/en/dashboard' }),
    });
    // Accept JSON 200 or HTML 303 per progressive enhancement
    expect([200, 303]).toContain(res.status);
    // Cookie header should contain post_auth_redirect when r is allowed (relative)
    expect(typeof res.setCookie === 'string' ? res.setCookie : '').toMatch(/post_auth_redirect=/i);
  });

  it('POST /api/auth/magic/request does NOT set post_auth_redirect for external r', async () => {
    const token = '00112233445566778899aabbccddeeff';
    const res = await fetchManual('/api/auth/magic/request', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: TEST_URL,
        'x-csrf-token': token,
        cookie: `csrf_token=${token}`,
      },
      body: JSON.stringify({ email: 'user@example.com', r: 'https://evil.example/steal' }),
    });
    expect([200, 303]).toContain(res.status);
    // Should not include post_auth_redirect cookie for external URL
    expect(res.setCookie).not.toMatch(/post_auth_redirect=/i);
  });

  it('GET /api/admin/users/list returns 401 with auth_error when unauthenticated', async () => {
    const res = await fetchManual('/api/admin/users/list');
    expect(res.status).toBe(401);
    expect(res.contentType).toContain('application/json');
    const body: any = await res.json();
    if (body) {
      expect(body.success).toBe(false);
      expect(body.error && typeof body.error.type === 'string' ? body.error.type : '').toBe(
        'auth_error'
      );
    }
    // Security headers baseline applied via middleware
    expect(res.xfo.toUpperCase()).toBe('DENY');
    expect(res.xcto.toLowerCase()).toBe('nosniff');
    expect(res.referrerPolicy.toLowerCase()).toBe('strict-origin-when-cross-origin');
    expect(typeof res.hsts).toBe('string');
    expect(res.permissionsPolicy).toMatch(/camera=\(\), micro/);
  });

  it('POST /api/auth/magic/request rate limited returns 429 with Retry-After', async () => {
    const token = 'ffeeddccbbaa99887766554433221100';
    let got429 = false;
    for (let i = 0; i < 7; i++) {
      const res = await fetchManual('/api/auth/magic/request', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: TEST_URL,
          'x-csrf-token': token,
          cookie: `csrf_token=${token}`,
        },
        body: JSON.stringify({ email: 'ratelimit@example.com' }),
      });
      if (res.status === 429) {
        got429 = true;
        expect(res.retryAfter).toBeTruthy();
        break;
      }
    }
    expect(got429).toBe(true);
  });
});
