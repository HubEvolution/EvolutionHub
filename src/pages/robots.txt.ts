import type { APIContext, APIRoute } from 'astro';

const ENV_SITE = import.meta.env.PUBLIC_SITE_URL as string | undefined;

function pickOrigin(url: URL): string {
  return ENV_SITE || `${url.protocol}//${url.host}`;
}

function getEnvironment(runtimeEnv: unknown): string {
  if (!runtimeEnv || typeof runtimeEnv !== 'object') return '';
  const envValue = (runtimeEnv as Record<string, unknown>).ENVIRONMENT;
  return typeof envValue === 'string' ? envValue : '';
}

export const GET: APIRoute = async (context: APIContext) => {
  const { url, locals } = context;
  const env = getEnvironment((locals as { runtime?: { env?: unknown } } | undefined)?.runtime?.env);
  const origin = pickOrigin(url);

  if (env === 'staging') {
    const body = ['User-agent: *', 'Disallow: /', ''].join('\n');
    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /en/login',
    'Disallow: /en/register',
    'Disallow: /admin/',
    'Disallow: /*.json$',
    'Crawl-delay: 1',
    '',
    'User-agent: AhrefsBot',
    'Disallow: /',
    '',
    'User-agent: SemrushBot',
    'Disallow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
