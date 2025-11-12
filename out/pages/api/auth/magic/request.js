'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.GET =
  exports.POST =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const rate_limiter_1 = require('@/lib/rate-limiter');
const stytch_1 = require('@/lib/stytch');
const security_logger_1 = require('@/lib/security-logger');
const utils_1 = require('@/lib/referrals/utils');
async function sha256(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}
function base64url(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function randomVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}
const parseBody = async (request) => {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const json = await request.json();
      if (json && typeof json === 'object') {
        const anyJson = json;
        return {
          email: typeof anyJson.email === 'string' ? anyJson.email : undefined,
          r: typeof anyJson.r === 'string' ? anyJson.r : undefined,
          name: typeof anyJson.name === 'string' ? anyJson.name : undefined,
          username: typeof anyJson.username === 'string' ? anyJson.username : undefined,
          locale: typeof anyJson.locale === 'string' ? anyJson.locale : undefined,
          turnstileToken:
            typeof anyJson['cf-turnstile-response'] === 'string'
              ? anyJson['cf-turnstile-response']
              : typeof anyJson.turnstileToken === 'string'
                ? anyJson.turnstileToken
                : undefined,
          referralCode: typeof anyJson.referralCode === 'string' ? anyJson.referralCode : undefined,
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
        locale: typeof form.get('locale') === 'string' ? form.get('locale') : undefined,
        turnstileToken:
          typeof form.get('cf-turnstile-response') === 'string'
            ? form.get('cf-turnstile-response')
            : undefined,
        referralCode:
          typeof form.get('referralCode') === 'string' ? form.get('referralCode') : undefined,
      };
    } catch {
      return {};
    }
  }
  return {};
};
function isValidEmail(email) {
  // Simple pragmatic check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isAllowedRelativePath(r) {
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//');
}
function isValidName(name) {
  if (typeof name !== 'string') return false;
  const len = name.trim().length;
  return len >= 2 && len <= 50;
}
function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 30) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
}
const handler = async (context) => {
  const { request } = context;
  const { email, r, name, username, locale, turnstileToken, referralCode } =
    await parseBody(request);
  if (!email || !isValidEmail(email)) {
    return (0, api_middleware_1.createApiError)('validation_error', 'Ungültige E-Mail-Adresse');
  }
  // In Remote Dev, request.url.origin is *.workers.dev. To keep local UX and
  // avoid whitelisting workers.dev in Stytch, prefer BASE_URL in development.
  const cfEnv = context.locals?.runtime?.env || {};
  const turnstileSecret = cfEnv?.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!turnstileToken || typeof turnstileToken !== 'string' || turnstileToken.length < 10) {
      (0, security_logger_1.logMetricCounter)('turnstile_verify_failed', 1, {
        source: 'magic_request',
        reason: 'missing_token',
      });
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Turnstile verification required'
      );
    }
    const cfConnectingIp = request.headers.get('cf-connecting-ip') || '';
    const xff = request.headers.get('x-forwarded-for') || '';
    const ip = cfConnectingIp || (xff.split(',')[0] || '').trim();
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: ip,
        }),
      });
      const verifyJson = await verifyRes.json();
      const ok = verifyRes.ok && verifyJson && verifyJson.success === true;
      if (!ok) {
        (0, security_logger_1.logMetricCounter)('turnstile_verify_failed', 1, {
          source: 'magic_request',
          reason: 'bad_token',
        });
        return (0, api_middleware_1.createApiError)(
          'validation_error',
          'Turnstile verification failed'
        );
      }
    } catch {
      (0, security_logger_1.logMetricCounter)('turnstile_verify_unavailable', 1, {
        source: 'magic_request',
      });
      return (0, api_middleware_1.createApiError)(
        'server_error',
        'Turnstile verification unavailable'
      );
    }
    (0, security_logger_1.logMetricCounter)('turnstile_verify_success', 1, {
      source: 'magic_request',
    });
  }
  const isDev = (cfEnv.ENVIRONMENT || cfEnv?.NODE_ENV) === 'development';
  const origin =
    isDev && typeof cfEnv.BASE_URL === 'string' && cfEnv.BASE_URL
      ? cfEnv.BASE_URL
      : new URL(request.url).origin;
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
  const maybeProfile = {};
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
    } catch {
      // Ignore cookie setting failures
    }
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
  const sanitizedReferral = (0, utils_1.sanitizeReferralCode)(referralCode);
  if (sanitizedReferral) {
    try {
      const isHttps = origin.startsWith('https://');
      context.cookies.set('post_auth_referral', sanitizedReferral, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: isHttps,
        maxAge: 10 * 60,
      });
    } catch {
      // Ignore referral persistence failures
    }
  }
  const devEnv =
    ((context.locals?.runtime?.env || {}).ENVIRONMENT || 'development') === 'development';
  const startedAt = Date.now();
  let pkceChallenge;
  const usePkce = cfEnv?.STYTCH_PKCE === '1' || cfEnv?.STYTCH_PKCE === 'true';
  if (usePkce) {
    const verifier = randomVerifier();
    const hash = await sha256(verifier);
    pkceChallenge = base64url(hash);
    const isHttps = origin.startsWith('https://');
    context.cookies.set('pkce_verifier', verifier, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge: 10 * 60,
    });
  }
  try {
    if (devEnv) {
      console.log('[auth][magic][request] sending to provider', {
        emailDomain: email.split('@')[1] || 'n/a',
        callbackUrl,
      });
    }
    await (0, stytch_1.stytchMagicLinkLoginOrCreate)(context, {
      email,
      login_magic_link_url: callbackUrl,
      signup_magic_link_url: callbackUrl,
      ...(pkceChallenge ? { pkce_code_challenge: pkceChallenge } : {}),
    });
    (0, security_logger_1.logMetricCounter)('auth_magic_request_success', 1, {
      source: 'magic_request',
    });
    if (devEnv) {
      console.log('[auth][magic][request] provider accepted', { ms: Date.now() - startedAt });
    }
  } catch (err) {
    (0, security_logger_1.logMetricCounter)('auth_magic_request_error', 1, {
      source: 'magic_request',
    });
    if (devEnv) {
      const e = err;
      console.warn('[auth][magic][request] provider error', {
        status: typeof e?.status === 'number' ? e.status : undefined,
        providerType: typeof e?.providerType === 'string' ? e.providerType : undefined,
        message: typeof e?.message === 'string' ? e.message : undefined,
      });
    }
    try {
      const e = err;
      const status = typeof e?.status === 'number' ? e.status : undefined;
      const providerType = typeof e?.providerType === 'string' ? e.providerType : undefined;
      const requestId = typeof e?.requestId === 'string' ? e.requestId : undefined;
      // Minimal structured log for production diagnostics (no sensitive data)
      console.error('[auth][magic][request] provider_error', {
        status,
        providerType,
        requestId,
      });
    } catch {}
    if (err instanceof stytch_1.StytchError) {
      const status = err.status;
      // Map provider status to our unified error types
      if (status === 429) {
        return (0, api_middleware_1.createApiError)('rate_limit', 'Provider rate limit');
      }
      if (status === 401 || status === 403) {
        return (0, api_middleware_1.createApiError)('forbidden', 'Provider authorization error');
      }
      if (status >= 400 && status < 500) {
        return (0, api_middleware_1.createApiError)(
          'validation_error',
          'Provider rejected request'
        );
      }
      return (0, api_middleware_1.createApiError)('server_error', 'Provider error');
    }
    // Unknown error
    return (0, api_middleware_1.createApiError)('server_error', 'Magic link request failed');
  }
  // Progressive enhancement: if this was a normal form POST (browser navigation),
  // redirect back to the localized login page with a success hint instead of
  // showing a raw JSON page.
  try {
    const accept = request.headers.get('accept') || '';
    if (/\btext\/html\b/i.test(accept)) {
      const loc = locale === 'de' || locale === 'en' ? locale : 'en';
      const target = loc === 'de' ? '/de/login?success=magic_sent' : '/en/login?success=magic_sent';
      return new Response(null, {
        status: 303,
        headers: {
          Location: target,
          'Cache-Control': 'no-store',
        },
      });
    }
  } catch {
    // Ignore redirect preparation failures
  }
  return (0, api_middleware_1.createApiSuccess)({ sent: true });
};
exports.POST = (0, api_middleware_1.withApiMiddleware)(handler, {
  rateLimiter: rate_limiter_1.authLimiter,
  enforceCsrfToken: true,
});
const GET = () => (0, api_middleware_1.createApiError)('method_not_allowed', 'Method Not Allowed');
exports.GET = GET;
exports.PUT = exports.GET;
exports.PATCH = exports.GET;
exports.DELETE = exports.GET;
exports.OPTIONS = exports.GET;
exports.HEAD = exports.GET;
