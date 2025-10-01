import type { APIRoute } from 'astro';
import { withRedirectMiddleware } from '@/lib/api-middleware';

function isAllowedRelativePath(path: string): boolean {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

function resolveBaseUrl(projectId?: string): string {
  if (projectId && projectId.startsWith('project-live-')) return 'https://api.stytch.com';
  return 'https://test.stytch.com';
}

export const GET: APIRoute = withRedirectMiddleware(async (context) => {
  const { request, params, cookies, locals } = context;
  const provider = String(params.provider || '').toLowerCase();
  const allowed = new Set(['github', 'google', 'apple', 'microsoft']);
  if (!allowed.has(provider)) {
    // Unknown provider → back to login
    const locale = (cookies.get('post_auth_locale')?.value || 'en') as 'en' | 'de';
    const prefix = locale === 'de' ? '/de' : '/en';
    return Response.redirect(new URL(`${prefix}/login?magic_error=InvalidProvider`, request.url), 302);
  }

  const url = new URL(request.url);
  const origin = url.origin;

  const env = (locals as any)?.runtime?.env || {};
  const projectId = env.STYTCH_PROJECT_ID as string | undefined;
  const publicToken = env.STYTCH_PUBLIC_TOKEN as string | undefined;
  const customDomain = (env.STYTCH_CUSTOM_DOMAIN as string | undefined)?.trim();
  // Prefer custom domain for PUBLIC endpoints if provided, else fall back to Stytch test/api
  const base = customDomain ? `https://${customDomain}` : resolveBaseUrl(projectId);

  if (!publicToken) {
    // Misconfiguration
    const locale = (cookies.get('post_auth_locale')?.value || 'en') as 'en' | 'de';
    const prefix = locale === 'de' ? '/de' : '/en';
    return Response.redirect(new URL(`${prefix}/login?magic_error=ServerConfig`, request.url), 302);
  }

  // Desired redirect after successful auth; stored as cookie similar to Magic Link flow
  const rParam = url.searchParams.get('r') || '';
  if (isAllowedRelativePath(rParam)) {
    cookies.set('post_auth_redirect', rParam, {
      path: '/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 60 * 10,
    });
  }

  // OAuth callback back into our app
  const callbackUrl = `${origin}/api/auth/oauth/${provider}/callback`;

  // Build Stytch public start URL (client-side endpoint)
  const sp = new URL(`${base}/v1/public/oauth/${provider}/start`);
  sp.searchParams.set('public_token', publicToken);
  sp.searchParams.set('login_redirect_url', callbackUrl);
  sp.searchParams.set('signup_redirect_url', callbackUrl);
  // optional: scopes, state
  const state = url.searchParams.get('state') || '';
  if (state) sp.searchParams.set('state', state);

  return Response.redirect(sp.toString(), 302);
});

export const POST = GET; // Allow POST in case of form submission
