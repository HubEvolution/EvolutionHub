'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = void 0;
const seo_1 = require('@/lib/seo');
// Prefer an explicit site URL in production; fallback to request origin (useful in dev)
const ENV_SITE = import.meta.env.PUBLIC_SITE_URL;
function abs(origin, path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanOrigin = origin.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanOrigin}${cleanPath}`;
}
function renderUrl(origin, locPath) {
  const alts = (0, seo_1.getAlternateUrls)(locPath);
  return [
    '  <url>',
    `    <loc>${abs(origin, locPath)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="de" href="${abs(origin, alts.de)}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${abs(origin, alts.en)}" />`,
    '  </url>',
  ].join('\n');
}
const GET = async ({ url }) => {
  const origin = ENV_SITE || `${url.protocol}//${url.host}`;
  // Minimal set aligned with current SEO requirements; extend as new pages launch
  const paths = [
    '/',
    '/en/',
    '/tools/webscraper/app',
    '/en/pricing',
    '/en/faq',
    '/en/kontakt',
    '/kontakt',
    '/en/impressum',
  ];
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
exports.GET = GET;
