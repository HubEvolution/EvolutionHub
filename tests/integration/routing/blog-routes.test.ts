import { describe, it, expect } from 'vitest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

const cookieHeader = 'pref_locale=de; session_welcome_seen=1';

function extractBlogSlugsFromHtml(html: string, max: number): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();

  const hrefRegex =
    /href="\/(?:en\/)?blog\/(?!kategorie\/|category\/|tag\/|tags\/)([a-z0-9-]+)\/?"/gi;
  let match: RegExpExecArray | null = null;
  while ((match = hrefRegex.exec(html))) {
    const slug = match[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
    if (slugs.length >= max) break;
  }

  return slugs;
}

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

  it('GET /blog/<slug>/ resolves (200) for at least one published post', async () => {
    const indexRes = await fetchFollow('/blog/');
    expect(indexRes.status).toBe(200);
    const indexHtml = await indexRes.text();
    const slugs = extractBlogSlugsFromHtml(indexHtml, 2);
    if (slugs.length === 0) return;

    for (const slug of slugs) {
      const res = await fetchFollow(`/blog/${slug}/`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html.toLowerCase()).toContain('<title>');
    }
  });

  it('GET /blog/<slug> (no trailing slash) redirects or serves', async () => {
    const indexRes = await fetchFollow('/blog/');
    expect(indexRes.status).toBe(200);
    const indexHtml = await indexRes.text();
    const slugs = extractBlogSlugsFromHtml(indexHtml, 1);
    if (slugs.length === 0) return;
    const slug = slugs[0];

    const res = await fetchManual(`/blog/${slug}`);
    if (res.status >= 300 && res.status < 400) {
      // Accept redirect to trailing slash or index.html
      const loc = res.headers.get('location') || '';
      expect(loc).toMatch(new RegExp(`/blog/${slug}(/|/index.html)?$`));
    } else {
      expect(res.status).toBe(200);
    }
  });
});
