import { describe, it, expect, beforeAll } from 'vitest';

let TEST_URL = '';
const ENV_URL = process.env.TEST_BASE_URL || '';
const IS_EXTERNAL = !!ENV_URL; // External testing (Cloudflare TEST/Staging/Prod)
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
    redirected:
      response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400),
    location: response.headers.get('location') || null,
    contentType: response.headers.get('content-type') || '',
    setCookie: response.headers.get('set-cookie') || '',
    text: response.status < 300 || response.status >= 400 ? await clone.text() : '',
  };
}

function extractCookieHeader(setCookieHeader: string): string {
  if (!setCookieHeader) return '';
  // naive parse: split by comma but respect that commas may appear very rarely; our case has 2 simple cookies
  const parts = setCookieHeader.split(/,(?=[^;]+?=)/g);
  const pairs = parts.map((p) => p.trim().split(';')[0]).filter(Boolean);
  return pairs.join('; ');
}

describe('Magic Link Happy Path (dev bypass)', () => {
  beforeAll(async () => {
    if (!ENV_URL) throw new Error('TEST_BASE_URL must be provided by global setup');
    TEST_URL = ENV_URL.replace(/\/$/, '');
  });

  // In external environments, the dev-bypass is intentionally disabled.
  // The real Magic Link flow is covered by E2E tests (Playwright) or manual smoke tests.
  const itOrSkip = IS_EXTERNAL ? it.skip : it;

  itOrSkip(
    'GET /api/auth/callback?token=dev-ok&email=...&r=/dashboard -> 302 to /dashboard and session works',
    async () => {
      const email = `dev.user+${Date.now()}@example.com`;
      const res = await fetchManual(
        `/api/auth/callback?token=dev-ok&email=${encodeURIComponent(email)}&r=${encodeURIComponent('/dashboard')}`
      );
      expect(res.status).toBeGreaterThanOrEqual(300);
      expect(res.status).toBeLessThan(400);
      expect(res.location).toBe('/dashboard');
      const cookieHeader = extractCookieHeader(res.setCookie);
      expect(cookieHeader).toMatch(/(session_id|__Host-session)=/);

      // follow to dashboard with cookies
      const dash = await fetchManual('/dashboard', {
        headers: {
          cookie: cookieHeader,
        },
      });
      // We expect 200 OK HTML (or 302 to onboarding inside dashboard, also acceptable)
      expect([200, 302]).toContain(dash.status);
    }
  );
});
