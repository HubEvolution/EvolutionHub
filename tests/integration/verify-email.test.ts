import { describe, it, expect, beforeAll } from 'vitest';

let TEST_URL = '';
const ENV_URL = process.env.TEST_BASE_URL || '';
// Allow self-signed localhost certs (wrangler https)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

type FetchManualResult = {
  status: number;
  redirected: boolean;
  location: string | null;
  contentType: string;
  text: string;
  json: <T>() => Promise<T | null>;
};

async function fetchManual(path: string, init: RequestInit = {}): Promise<FetchManualResult> {
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
    redirected: response.type === 'opaqueredirect' || response.status === 302,
    location: response.headers.get('location') || null,
    contentType: response.headers.get('content-type') || '',
    text: response.status !== 302 ? await clone.text() : '',
    json: async <T>() => {
      try {
        return (await response.json()) as T;
      } catch {
        return null;
      }
    },
  };
}

describe('Verify Email API - deprecated 410 behavior', () => {
  beforeAll(async () => {
    if (!ENV_URL) throw new Error('TEST_BASE_URL must be provided by global setup');
    TEST_URL = ENV_URL.replace(/\/$/, '');
    const r = await fetch(`${TEST_URL}/api/auth/verify-email?token=abc`, {
      redirect: 'manual',
    });
    if (r.status !== 410) throw new Error(`Worker not ready at ${TEST_URL}`);
  });

  it('GET /api/auth/verify-email returns 410 HTML (deprecated endpoint)', async () => {
    const res = await fetchManual('/api/auth/verify-email?token=abc&locale=de');
    expect(res.status).toBe(410);
    expect(res.redirected).toBe(false);
    expect(res.contentType).toContain('text/html');
    expect(res.text).toMatch(/410|Gone|deprecated/i);
  });

  it('POST /api/auth/verify-email returns 410 JSON with details.Allow = "GET"', async () => {
    const res = await fetchManual('/api/auth/verify-email?token=abc', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: TEST_URL,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(410);
    expect(res.contentType).toContain('application/json');
    const body = await res.json<{ success: boolean; error?: { type?: string } }>();
    expect(body).toBeTruthy();
    expect(body?.success).toBe(false);
    expect(body?.error?.type).toBe('gone');
  });

  it('PUT /api/auth/verify-email returns 410 JSON with details.Allow = "GET"', async () => {
    const res = await fetchManual('/api/auth/verify-email?token=abc', {
      method: 'PUT',
      headers: {
        origin: TEST_URL,
      },
    });
    expect(res.status).toBe(410);
    expect(res.contentType).toContain('application/json');
    const body = await res.json<{ success: boolean; error?: { type?: string } }>();
    expect(body).toBeTruthy();
    expect(body?.success).toBe(false);
    expect(body?.error?.type).toBe('gone');
  });
});
