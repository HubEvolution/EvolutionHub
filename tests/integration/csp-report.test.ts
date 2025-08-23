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
  return {
    status: response.status,
    redirected: response.type === 'opaqueredirect' || response.status === 302,
    location: response.headers.get('location') || null,
    text: response.status !== 302 ? await response.text() : '',
    headers: response.headers,
  };
}

describe('CSP Report API', () => {
  beforeAll(async () => {
    if (!ENV_URL) throw new Error('TEST_BASE_URL must be provided by global setup');
    TEST_URL = ENV_URL.replace(/\/$/, '');
    const r = await fetch(`${TEST_URL}/api/csp-report`, { method: 'GET', redirect: 'manual' });
    if (!(r.status === 405 && r.headers.get('allow') === 'POST')) {
      throw new Error(`Worker not ready at ${TEST_URL}`);
    }
  });

  it('POST application/csp-report -> 204, no redirect, no Set-Cookie', async () => {
    const body = {
      'csp-report': {
        'effective-directive': 'script-src',
        'blocked-uri': 'inline',
        'document-uri': `${TEST_URL}/`,
        'disposition': 'enforce',
      },
    };
    const res = await fetchManual('/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(204);
    expect(res.redirected).toBe(false);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('POST application/reports+json -> 204', async () => {
    const body = [
      {
        type: 'csp-violation',
        age: 0,
        url: `${TEST_URL}/`,
        body: {
          'effective-directive': 'style-src',
          'blocked-uri': 'https://evil.example.com',
          'document-uri': `${TEST_URL}/`,
        },
      },
    ];
    const res = await fetchManual('/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/reports+json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(204);
  });

  it('GET -> 405 with Allow: POST', async () => {
    const res = await fetchManual('/api/csp-report');
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('OPTIONS -> 405 with Allow: POST', async () => {
    const res = await fetchManual('/api/csp-report', { method: 'OPTIONS' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });
});
