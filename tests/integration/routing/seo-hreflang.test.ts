import { describe, it, expect } from 'vitest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: 'pref_locale=de; session_welcome_seen=1' },
  });
  const html = await res.text();
  return { status: res.status, html };
}

describe('SEO hreflang/canonical', () => {
  it('root / has canonical and hreflang alternates', async () => {
    const { status, html } = await get('/');
    expect(status).toBe(200);
    expect(html).toMatch(/<link[^>]+rel="canonical"/i);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="de"/i);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="en"/i);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="x-default"/i);
  });

  it('EN /en/ has canonical and hreflang alternates', async () => {
    const { status, html } = await get('/en/');
    expect(status).toBe(200);
    expect(html).toMatch(/<link[^>]+rel="canonical"/i);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="de"/i);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="en"/i);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+hreflang="x-default"/i);
  });
});
