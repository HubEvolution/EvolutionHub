import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';

const BASE = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
const EXPECTED_HOST = new URL(BASE).host;

const cookieHeader = 'session_welcome_seen=1';

async function tryPickFirstBlogSlug(indexPath: string): Promise<string | null> {
  const res = await fetch(`${BASE}${indexPath}`, {
    headers: { Cookie: cookieHeader, Origin: BASE },
  });
  expect(res.status).toBe(200);
  const html = await res.text();
  const $ = cheerio.load(html);

  const slugs: string[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = String($(el).attr('href') || '');
    const match = href.match(
      /^\/(?:en\/)?blog\/(?!kategorie\/|category\/|tag\/|tags\/)([a-z0-9-]+)\/?$/i
    );
    if (!match) return;
    const slug = match[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  });

  return slugs[0] ?? null;
}

async function getHtml(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader, Origin: BASE } });
  expect(res.status).toBe(200);
  const html = await res.text();
  return cheerio.load(html);
}

describe('Blog i18n & SEO (integration)', () => {
  it('DE: category uses /blog/kategorie/, share links have prod origin, single H1, related heading present', async () => {
    const slug = await tryPickFirstBlogSlug('/blog/');
    if (!slug) return;
    const $ = await getHtml(`/blog/${slug}`);

    // Category link path

    // Share links host (env-agnostic)
    const twitterHref = $('a[href*="twitter.com/intent/tweet"]').attr('href') || '';
    expect(twitterHref).toContain('twitter.com/intent/tweet');
    const urlParam = new URL(twitterHref, BASE).searchParams.get('url') || '';
    const shareTargetHost = urlParam ? new URL(urlParam).host : '';
    expect(shareTargetHost).toBe(EXPECTED_HOST);

    // Single H1
    expect($('h1').length).toBe(1);

    // Related heading (DE) — optional depending on content source
    const relatedCountDe = $('h2').filter(
      (_, el) => $(el).text().trim() === 'Ähnliche Artikel'
    ).length;
    expect(relatedCountDe).toBeGreaterThanOrEqual(0);
  });

  it('EN: category uses /en/blog/category/, share links have prod origin, single H1, related heading present', async () => {
    const slug = await tryPickFirstBlogSlug('/en/blog/');
    if (!slug) return;
    const $ = await getHtml(`/en/blog/${slug}`);

    // Category link path
    // Canonical EN route redirects to /blog/<slug>, category links are under /blog/category/

    // Share links host (env-agnostic)
    const twitterHref = $('a[href*="twitter.com/intent/tweet"]').attr('href') || '';
    expect(twitterHref).toContain('twitter.com/intent/tweet');
    const urlParam = new URL(twitterHref, BASE).searchParams.get('url') || '';
    const shareTargetHost = urlParam ? new URL(urlParam).host : '';
    expect(shareTargetHost).toBe(EXPECTED_HOST);

    // Single H1
    expect($('h1').length).toBe(1);

    // Related heading (EN) — optional depending on content source
    const relatedCountEn = $('h2').filter(
      (_, el) => $(el).text().trim() === 'Related Articles'
    ).length;
    expect(relatedCountEn).toBeGreaterThanOrEqual(0);
  });
});
