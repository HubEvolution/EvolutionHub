import type { APIContext } from 'astro';
import { withApiMiddleware, type ApiHandler, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { authLimiter } from '@/lib/rate-limiter';
import { stytchMagicLinkLoginOrCreate, StytchError } from '@/lib/stytch';

const parseBody = async (request: Request): Promise<{ email?: string; r?: string; name?: string; username?: string; locale?: string }> => {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const json: unknown = await request.json();
      if (json && typeof json === 'object') {
        const anyJson = json as Record<string, unknown>;
        return {
          email: typeof anyJson.email === 'string' ? anyJson.email : undefined,
          r: typeof anyJson.r === 'string' ? anyJson.r : undefined,
          name: typeof anyJson.name === 'string' ? anyJson.name : undefined,
          username: typeof anyJson.username === 'string' ? anyJson.username : undefined,
          locale: typeof anyJson.locale === 'string' ? anyJson.locale : undefined,
        };
      }
      return {};
    } catch {
      return {};
    }
  }
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    try {
      const form = await request.formData();
      const emailVal = form.get('email');
      const rVal = form.get('r');
      const nameVal = form.get('name');
      const usernameVal = form.get('username');
      return {
        email: typeof emailVal === 'string' ? emailVal : undefined,
        r: typeof rVal === 'string' ? rVal : undefined,
        name: typeof nameVal === 'string' ? nameVal : undefined,
        username: typeof usernameVal === 'string' ? usernameVal : undefined,
        locale: typeof form.get('locale') === 'string' ? (form.get('locale') as string) : undefined,
      };
    } catch {
      return {};
    }
  }
  return {};
};

function isValidEmail(email: string): boolean {
  // Simple pragmatic check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedRelativePath(r: string): boolean {
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//');
}

function isValidName(name: string | undefined): name is string {
  if (typeof name !== 'string') return false;
  const len = name.trim().length;
  return len >= 2 && len <= 50;
}

function isValidUsername(username: string | undefined): username is string {
  if (typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 30) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
}

const handler: ApiHandler = async (context: APIContext) => {
  const { request } = context;
  const { email, r, name, username, locale } = await parseBody(request);
  if (!email || !isValidEmail(email)) {
    return createApiError('validation_error', 'Ungültige E-Mail-Adresse');
  }

  const origin = new URL(request.url).origin;
  // Do NOT include dynamic r in the Stytch redirect URL, Stytch validates query params strictly.
  const callbackUrl = `${origin}/api/auth/callback`;

  // Persist desired redirect in a short-lived, HttpOnly cookie for the callback to consume
  if (r && isAllowedRelativePath(r)) {
    const isHttps = origin.startsWith('https://');
    context.cookies.set('post_auth_redirect', r, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge: 10 * 60, // 10 minutes
    });
  }

  // Persist optional profile data for initial account creation
  const maybeProfile: Record<string, string> = {};
  if (isValidName(name)) maybeProfile.name = name.trim();
  if (isValidUsername(username)) maybeProfile.username = username;
  if (Object.keys(maybeProfile).length > 0) {
    try {
      const isHttps = origin.startsWith('https://');
      context.cookies.set('post_auth_profile', JSON.stringify(maybeProfile), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: isHttps,
        maxAge: 10 * 60, // 10 minutes
      });
    } catch {}
  }

  // Persist locale hint so the callback can localize the final redirect consistently
  if (locale === 'de' || locale === 'en') {
    const isHttps = origin.startsWith('https://');
    context.cookies.set('post_auth_locale', locale, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge: 10 * 60, // 10 minutes
    });
  }

  try {
    await stytchMagicLinkLoginOrCreate(context, {
      email,
      login_magic_link_url: callbackUrl,
      signup_magic_link_url: callbackUrl,
    });
  } catch (err) {
    if (err instanceof StytchError) {
      const status = err.status;
      // Map provider status to our unified error types
      if (status === 429) {
        return createApiError('rate_limit', 'Provider rate limit');
      }
      if (status === 401 || status === 403) {
        return createApiError('forbidden', 'Provider authorization error');
      }
      if (status >= 400 && status < 500) {
        return createApiError('validation_error', 'Provider rejected request');
      }
      return createApiError('server_error', 'Provider error');
    }
    // Unknown error
    return createApiError('server_error', 'Magic link request failed');
  }

  // Progressive enhancement: if this was a normal form POST (browser navigation),
  // redirect back to the localized login page with a success hint instead of
  // showing a raw JSON page.
  try {
    const accept = request.headers.get('accept') || '';
    if (/\btext\/html\b/i.test(accept)) {
      const loc = (locale === 'de' || locale === 'en') ? locale : 'en';
      const target = loc === 'de' ? '/de/login?success=magic_sent' : '/en/login?success=magic_sent';
      return new Response(null, {
        status: 303,
        headers: {
          Location: target,
          'Cache-Control': 'no-store',
        },
      });
    }
  } catch {}

  return createApiSuccess({ sent: true });
};

export const POST = withApiMiddleware(handler, {
  rateLimiter: authLimiter,
  // CSRF/Origin defaults to same-origin for unsafe methods; no extra config needed
});

export const GET = () => createApiError('method_not_allowed', 'Method Not Allowed');
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const OPTIONS = GET;
export const HEAD = GET;
