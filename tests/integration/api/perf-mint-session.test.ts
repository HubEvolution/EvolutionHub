import { describe, it, expect } from 'vitest';
import { getJson, safeParseJson, TEST_URL } from '../../shared/http';

type ApiJson = {
  success: boolean;
  data?: unknown;
  error?: { type?: string; message?: string; details?: unknown };
};

describe('GET /api/perf/mint-session', () => {
  it('returns 403 without internal token', async () => {
    const { res, json } = await getJson<ApiJson>('/api/perf/mint-session');
    expect(res.status).toBe(403);
    expect(json?.success).toBe(false);
  });

  it('mints a session + csrf token when valid internal token is provided', async () => {
    const seedRes = await fetch(`${TEST_URL}/api/test/seed-suite-v2`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Origin: TEST_URL,
        'x-test-seed': '1',
      },
    });
    expect(seedRes.ok).toBe(true);

    const token = 'ci-internal-health-token';

    const res = await fetch(`${TEST_URL}/api/perf/mint-session`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Origin: TEST_URL,
        'x-internal-health': token,
      },
    });
    const text = res.status !== 302 ? await res.text().catch(() => '') : '';
    const json = text ? safeParseJson<ApiJson>(text) : null;

    if (res.status !== 200) {
      throw new Error(
        `Mint failed: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`
      );
    }

    expect(json?.success).toBe(true);

    const data = (json?.data || {}) as { userId?: unknown; csrfToken?: unknown };
    expect(typeof data.userId).toBe('string');
    expect(typeof data.csrfToken).toBe('string');

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('session_id=');
    expect(setCookie).toContain('csrf_token=');
  });
});
