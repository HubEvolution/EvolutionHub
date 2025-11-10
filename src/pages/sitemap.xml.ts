import type { APIRoute } from 'astro';
import { blogService } from '@/lib/blog';
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

const STATIC_PATHS: readonly string[] = [
  '/',
  '/en/',
  '/pricing',
  '/en/pricing',
  '/faq',
  '/en/faq',
  '/kontakt',
  '/en/kontakt',
  '/impressum',
  '/en/impressum',
  '/datenschutz',
  '/en/datenschutz',
  '/agb',
  '/en/agb',
  '/cookie-einstellungen',
  '/en/cookie-settings',
  '/docs',
  '/en/docs',
  '/blog/',
  '/en/blog/',
  '/tools',
  '/en/tools',
  '/tools/imag-enhancer/app',
  '/en/tools/imag-enhancer/app',
  '/tools/prompt-enhancer/app',
  '/en/tools/prompt-enhancer/app',
  '/tools/video-enhancer/app',
  '/en/tools/video-enhancer/app',
  '/tools/webscraper/app',
  '/en/tools/webscraper/app',
  '/tools/voice-visualizer/app',
  '/en/tools/voice-visualizer/app',
];

function buildBlogPath(slug: string, lang: string | undefined): string {
  const normalizedSlug = slug.replace(/^\/+|\/+$|\s+/g, '');
  if (lang === 'en') return `/en/blog/${normalizedSlug}/`;
  return `/blog/${normalizedSlug}/`;
}

export const GET: APIRoute = async ({ url }: { url: URL }) => {
  const origin = ENV_SITE || `${url.protocol}//${url.host}`;

  const pathSet = new Set<string>(STATIC_PATHS);

  try {
    const posts = await blogService.getPublishedPosts();
    posts.forEach((post) => {
      pathSet.add(buildBlogPath(post.slug, post.data.lang as string | undefined));
    });
  } catch (error) {
    console.error('Failed to fetch blog posts for sitemap:', error);
  }

  const paths = Array.from(pathSet).sort((a, b) => a.localeCompare(b, 'en'));

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
