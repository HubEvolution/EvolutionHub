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
      ...(init.headers || {}),
    },
  });
  const clone = response.clone();
  return {
    status: response.status,
    redirected: response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400),
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
    const res = await fetchManual('/api/auth/callback');
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.redirected).toBe(true);
    expect(res.location).toBeTruthy();
    expect(res.location).toMatch(/\/(en\/)?login\?magic_error=MissingToken/i);
  });

  it('GET /api/auth/callback with invalid token redirects to login with error', async () => {
    const res = await fetchManual('/api/auth/callback?token=invalid-token');
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.redirected).toBe(true);
    expect(res.location).toBeTruthy();
    expect(res.location).toMatch(/\/(en\/)?login\?magic_error=InvalidOrExpired/i);
  });

  it('GET /api/auth/magic/request is method not allowed (405)', async () => {
    const res = await fetchManual('/api/auth/magic/request');
    expect(res.status).toBe(405);
    expect(res.contentType).toContain('application/json');
    const body = await res.json();
    expect(body?.success).toBe(false);
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
    expect(res.status).toBe(400);
    expect(res.contentType).toContain('application/json');
    const body = await res.json();
    expect(body?.success).toBe(false);
    expect(body?.error?.type).toBe('validation_error');
  });
});
