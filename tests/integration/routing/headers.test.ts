import { describe, it, expect } from 'vitest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

function cookie(v: string) {
  return { Cookie: v };
}

describe('Headers sanity', () => {
  it('GET / sets Content-Language and Vary', async () => {
    const res = await fetch(`${BASE}/`, {
      headers: cookie('pref_locale=de; session_welcome_seen=1'),
    });
    expect(res.status).toBe(200);
    const cl = res.headers.get('content-language');
    const vary = res.headers.get('vary') || '';
    expect(cl === 'de' || cl === 'en').toBeTruthy();
    expect(vary.toLowerCase()).toContain('cookie');
    expect(vary.toLowerCase()).toContain('accept-language');
  });

  it('GET /en/ sets Content-Language and Vary', async () => {
    const res = await fetch(`${BASE}/en/`, {
      headers: cookie('pref_locale=en; session_welcome_seen=1'),
    });
    expect(res.status).toBe(200);
    const cl = res.headers.get('content-language');
    const vary = res.headers.get('vary') || '';
    expect(cl).toBe('en');
    expect(vary.toLowerCase()).toContain('cookie');
    expect(vary.toLowerCase()).toContain('accept-language');
  });
});
