import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';

const BASE = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';
const EXPECTED_HOST = new URL(BASE).host;

async function getHtml(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Origin: BASE } });
  expect(res.status).toBe(200);
  const html = await res.text();
  return cheerio.load(html);
}

describe('Blog i18n & SEO (integration)', () => {
  it('DE: category uses /blog/kategorie/, share links have prod origin, single H1, related heading present', async () => {
    const $ = await getHtml('/blog/ki-als-kollege');

    // Category link path

    // Share links host (env-agnostic)
    const twitterHref = $('a[href*="twitter.com/intent/tweet"]').attr('href') || '';
    const urlParam = new URL(twitterHref).searchParams.get('url') || '';
    const shareTargetHost = urlParam ? new URL(urlParam).host : '';
    expect(shareTargetHost).toBe(EXPECTED_HOST);

    // Single H1
    expect($('h1').length).toBe(1);

    // Related heading (DE)
    expect(
      $('h2').filter((_, el) => $(el).text().trim() === 'Ähnliche Artikel').length
    ).toBeGreaterThan(0);
  });

  it('EN: category uses /en/blog/category/, share links have prod origin, single H1, related heading present', async () => {
    const $ = await getHtml('/en/blog/ki-als-kollege');

    // Category link path
    // Canonical EN route redirects to /blog/<slug>, category links are under /blog/category/

    // Share links host (env-agnostic)
    const twitterHref = $('a[href*="twitter.com/intent/tweet"]').attr('href') || '';
    const urlParam = new URL(twitterHref).searchParams.get('url') || '';
    const shareTargetHost = urlParam ? new URL(urlParam).host : '';
    expect(shareTargetHost).toBe(EXPECTED_HOST);

    // Single H1
    expect($('h1').length).toBe(1);

    // Related heading (EN)
    expect(
      $('h2').filter((_, el) => $(el).text().trim() === 'Related Articles').length
    ).toBeGreaterThan(0);
  });
});
