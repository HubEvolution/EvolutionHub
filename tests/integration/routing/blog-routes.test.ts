import { describe, it, expect } from 'vitest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

const cookieHeader = 'pref_locale=de; session_welcome_seen=1';

async function fetchManual(path: string) {
  return fetch(`${BASE}${path}`, {
    redirect: 'manual',
    headers: { Cookie: cookieHeader },
  });
}

async function fetchFollow(path: string) {
  return fetch(`${BASE}${path}`, {
    headers: { Cookie: cookieHeader },
  });
}

describe('Blog routes', () => {
  it('GET /blog/ returns 200 and contains Blog heading', async () => {
    const res = await fetchFollow('/blog/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.toLowerCase()).toContain('<title>');
    expect(html).toMatch(/Blog|Aktuelle Artikel|Evolution Hub/);
  });

  const slugs = ['digital-detox-kreativitaet', 'new-work-ist-eine-haltung'];

  for (const slug of slugs) {
    it(`GET /blog/${slug}/ resolves (200)`, async () => {
      const res = await fetchFollow(`/blog/${slug}/`);
      expect(res.status).toBe(200);
      // Body could be article HTML or a dev redirect page to /welcome; both are acceptable for smoke
      const html = await res.text();
      expect(html.toLowerCase()).toContain('<title>');
    });

    it(`GET /blog/${slug} (no trailing slash) redirects or serves`, async () => {
      const res = await fetchManual(`/blog/${slug}`);
      if (res.status >= 300 && res.status < 400) {
        // Accept redirect to trailing slash or index.html
        const loc = res.headers.get('location') || '';
        expect(loc).toMatch(new RegExp(`/blog/${slug}(/|/index.html)?$`));
      } else {
        expect(res.status).toBe(200);
      }
    });
  }
});
