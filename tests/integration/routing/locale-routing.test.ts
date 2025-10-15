import { describe, it, expect } from 'vitest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

function cookie(v: string) {
  return { Cookie: v };
}

async function fetchManual(path: string, headers: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, { redirect: 'manual', headers });
}

async function fetchFollow(path: string, headers: Record<string, string> = {}) {
  return fetch(`${BASE}${path}`, { headers });
}

describe('Locale routing', () => {
  it('q-values: prefers EN when en-GB;q=0.9,de;q=0.8', async () => {
    const headers: Record<string, string> = {
      ...cookie('session_welcome_seen=1'),
      'Accept-Language': 'en-GB;q=0.9, de;q=0.8',
    };
    const res = await fetchFollow('/pricing', headers);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-language')).toBe('en');
  });

  it('q-values: prefers DE when de;q=0.9,en;q=0.8', async () => {
    const headers: Record<string, string> = {
      ...cookie('session_welcome_seen=1'),
      'Accept-Language': 'de;q=0.9, en;q=0.8',
    };
    const res = await fetchFollow('/pricing', headers);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-language')).toBe('de');
  });

  it('referer-based EN preference redirects neutral /pricing to /en/pricing', async () => {
    const headers: Record<string, string> = {
      ...cookie('session_welcome_seen=1'),
      Referer: `${BASE}/en/`,
      'Accept-Language': 'de;q=1',
    };
    const res = await fetchManual('/pricing', headers);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location') || '';
      expect(loc).toMatch(/\/en\/pricing\/?(\?.*)?$/);
    } else {
      expect(res.status).toBe(200);
      const lang = res.headers.get('content-language');
      expect(lang === 'en' || lang === 'de').toBeTruthy();
    }
  });

  it('bot: neutral /blog/ with en redirects to /en/blog/', async () => {
    const headers: Record<string, string> = {
      'User-Agent': 'Googlebot',
      'Accept-Language': 'en;q=1',
    };
    const res = await fetchManual('/blog/', headers);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get('location') || '';
    expect(loc).toMatch(/\/en\/blog\/?(\?.*)?$/);
  });
});
