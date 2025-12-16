import { describe, it, expect } from 'vitest';

import { TEST_URL } from '../../shared/http';

const cookieHeader = 'session_welcome_seen=1';

async function getText(path: string): Promise<{ res: Response; text: string }> {
  const res = await fetch(`${TEST_URL}${path}`, {
    redirect: 'manual',
    headers: {
      Origin: TEST_URL,
      Cookie: cookieHeader,
    },
  });
  const text = await res.text();
  return { res, text };
}

describe('robots.txt & sitemap.xml SEO (integration)', () => {
  it('robots.txt is environment-aware and does not hardcode the production sitemap in tests', async () => {
    const { res, text } = await getText('/robots.txt');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') || '').toContain('text/plain');

    // In CI tests we run with ENVIRONMENT=development. That should not return the staging disallow-all body.
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Allow: /');

    // Must not hardcode the production domain (regression guard)
    expect(text).not.toContain('https://hub-evolution.com/sitemap.xml');

    // Sitemap line should exist.
    // Accept relative (preferred) or absolute (if served by the dynamic worker route).
    const hasRelative = text.includes('Sitemap: /sitemap.xml');
    const hasAbsolute = text.includes(`Sitemap: ${TEST_URL}/sitemap.xml`);
    expect(hasRelative || hasAbsolute).toBe(true);
  });

  it('sitemap.xml uses slashless URLs (except /) and does not contain /blog/ or /en/blog/ trailing slashes', async () => {
    const { res, text } = await getText('/sitemap.xml');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') || '').toContain('application/xml');

    // Root is allowed as /, but no other loc/hreflang should include a trailing slash.
    expect(text).not.toContain('<loc>' + TEST_URL + '/blog/</loc>');
    expect(text).not.toContain('<loc>' + TEST_URL + '/en/blog/</loc>');

    // Alternates should also be slashless.
    expect(text).not.toContain('hreflang="en" href="' + TEST_URL + '/en/"');

    // Positive check: we should still include the blog index URLs.
    expect(text).toContain('<loc>' + TEST_URL + '/blog</loc>');
    expect(text).toContain('<loc>' + TEST_URL + '/en/blog</loc>');
  });
});
