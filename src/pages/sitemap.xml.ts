import type { APIRoute } from 'astro';
import { getAlternateUrls } from '@/lib/seo';

// Prefer an explicit site URL in production; fallback to request origin (useful in dev)
const ENV_SITE = import.meta.env.PUBLIC_SITE_URL as string | undefined;

function abs(origin: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanOrigin = origin.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanOrigin}${cleanPath}`;
}

function renderUrl(origin: string, locPath: string): string {
  const alts = getAlternateUrls(locPath);
  return [
    '  <url>',
    `    <loc>${abs(origin, locPath)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="de" href="${abs(origin, alts.de)}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${abs(origin, alts.en)}" />`,
    '  </url>',
  ].join('\n');
}

export const GET: APIRoute = async ({ url }) => {
  const origin = ENV_SITE || `${url.protocol}//${url.host}`;

  // Minimal set aligned with previous static sitemap; can be extended later
  const paths = ['/', '/en/'];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...paths.map((p) => renderUrl(origin, p)),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
