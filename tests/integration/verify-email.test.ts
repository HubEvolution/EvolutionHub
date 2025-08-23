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
  };
}

describe('Verify Email API - locale-aware redirects', () => {
  beforeAll(async () => {
    if (!ENV_URL) throw new Error('TEST_BASE_URL must be provided by global setup');
    TEST_URL = ENV_URL.replace(/\/$/, '');
    const r = await fetch(`${TEST_URL}/api/auth/verify-email?token=abc`, { redirect: 'manual' });
    if (r.status !== 302) throw new Error(`Worker not ready at ${TEST_URL}`);
  });

  it('redirects to /register (de) with InvalidVerificationLink when token too short and locale=de', async () => {
    const res = await fetchManual('/api/auth/verify-email?token=abc&locale=de');
    expect(res.status).toBe(302);
    expect(res.redirected).toBe(true);
    expect(res.location).toContain('/register?error=InvalidVerificationLink');
  });

  it('redirects to /en/register using Referer locale when no locale query is provided', async () => {
    const res = await fetchManual('/api/auth/verify-email?token=abc', {
      headers: {
        referer: `${TEST_URL}/en/login`,
      },
    });
    expect(res.status).toBe(302);
    expect(res.redirected).toBe(true);
    expect(res.location).toContain('/en/register?error=InvalidVerificationLink');
  });

  it('redirects to /register (de) with VerificationLinkExpired for unknown (but well-formed) token', async () => {
    // Use a well-formed token (>= 32 chars) that is not present in DB
    const randomToken = 'X'.repeat(64) + Date.now().toString(36);
    const path = `/api/auth/verify-email?token=${encodeURIComponent(randomToken)}&locale=de`;
    // eslint-disable-next-line no-console
    console.log('Verify URL:', `${TEST_URL}${path}`);
    const res = await fetchManual(path);
    expect(res.status).toBe(302);
    expect(res.redirected).toBe(true);
    // eslint-disable-next-line no-console
    console.log('Redirect location:', res.location);
    expect(res.location).toContain('/register?error=VerificationLinkExpired');
  });
});
