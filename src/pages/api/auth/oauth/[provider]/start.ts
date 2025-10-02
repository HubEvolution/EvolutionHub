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
  const env = (locals as any)?.runtime?.env || {};
  const isDev = (env.ENVIRONMENT || env.NODE_ENV) === 'development';
  const origin = isDev && env.BASE_URL ? (env.BASE_URL as string) : url.origin;

  // Ensure locale hint is available for the callback localization.
  // Priority:
  // 1) explicit query param ?locale=de|en → set/override cookie
  // 2) if cookie missing, derive from Referer path prefix (/de or /en)
  try {
    const existing = cookies.get('post_auth_locale')?.value as 'de' | 'en' | undefined;
    const qp = (url.searchParams.get('locale') || '').toLowerCase();
    const isValidLocale = (v: string): v is 'de' | 'en' => v === 'de' || v === 'en';
    let derived: 'de' | 'en' | undefined;
    if (!qp && !existing) {
      const ref = request.headers.get('referer') || '';
      try {
        const refUrl = new URL(ref);
        const p = refUrl.pathname || '';
        if (p.startsWith('/de')) derived = 'de';
        else if (p.startsWith('/en')) derived = 'en';
      } catch {}
    }
    const finalLocale = isValidLocale(qp) ? (qp as 'de' | 'en') : existing || derived;
    if (finalLocale && finalLocale !== existing) {
      cookies.set('post_auth_locale', finalLocale, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
        maxAge: 60 * 10,
      });
    }
  } catch {
    // Best effort only; proceed without locale cookie if anything goes wrong
  }

  const projectId = env.STYTCH_PROJECT_ID as string | undefined;
  const publicToken = env.STYTCH_PUBLIC_TOKEN as string | undefined;
  const customDomain = (env.STYTCH_CUSTOM_DOMAIN as string | undefined)?.trim();
  // Prefer custom domain for PUBLIC endpoints if provided, else fall back to Stytch test/api
  const base = customDomain ? `https://${customDomain}` : resolveBaseUrl(projectId);

  if (!publicToken) {
    // Misconfiguration
    const locale = (cookies.get('post_auth_locale')?.value || 'en') as 'en' | 'de';
    const prefix = locale === 'de' ? '/de' : '/en';
    if (isDev) {
      console.warn('[auth][oauth][start] missing STYTCH_PUBLIC_TOKEN', {
        provider,
        origin,
        base,
        customDomain,
      });
    }
    return Response.redirect(`${origin}${prefix}/login?magic_error=ServerConfig`, 302);
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
  if (isDev) {
    const mask = (t: string) => (typeof t === 'string' && t.length > 8 ? `${t.slice(0, 6)}…` : t);
    console.log('[auth][oauth][start] redirecting to provider', {
      provider,
      base,
      origin,
      callbackUrl,
      hasState: Boolean(state),
      publicToken: mask(publicToken as string),
      final: `${sp.origin}${sp.pathname}`,
    });
  }
  return Response.redirect(sp.toString(), 302);
});

export const POST = GET; // Allow POST in case of form submission
