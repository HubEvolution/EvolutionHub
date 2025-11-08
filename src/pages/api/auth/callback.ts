import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withRedirectMiddleware,
  type ApiHandler,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { createSecureRedirect } from '@/lib/response-helpers';
import { localizePath, isLocalizedPath } from '@/lib/locale-path';
import type { Locale } from '@/lib/i18n';
import { stytchMagicLinkAuthenticate } from '@/lib/stytch';
import { createSession } from '@/lib/auth-v2';
import { recordReferralSignup } from '@/lib/services/referral-event-service';
import { logUserEvent } from '@/lib/security-logger';

function isAllowedRelativePath(r: string): boolean {
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//');
}

async function upsertUser(
  db: D1Database,
  email: string,
  desiredName?: string,
  desiredUsername?: string
): Promise<{ id: string; isNew: boolean }> {
  const existing = await db
    .prepare('SELECT id, email_verified FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email_verified?: number }>();
  const nowUnix = Math.floor(Date.now() / 1000);
  if (existing && existing.id) {
    // Ensure verified flag
    await db
      .prepare(
        'UPDATE users SET email_verified = 1, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?'
      )
      .bind(nowUnix, existing.id)
      .run();
    return { id: existing.id, isNew: false };
  }
  const id = crypto.randomUUID();
  const fallbackName = email.split('@')[0] || 'user';
  const name = (desiredName && desiredName.trim().slice(0, 50)) || fallbackName;
  const baseForUsername = (desiredUsername && desiredUsername.trim()) || name;
  const usernameBase =
    baseForUsername.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || `user_${id.slice(0, 6)}`;
  // Ensure unique username by appending suffix if necessary
  let username = usernameBase;
  let suffix = 0;
  while (true) {
    const taken = await db
      .prepare('SELECT 1 FROM users WHERE username = ?')
      .bind(username)
      .first<{ 1: number }>();
    if (!taken) break;
    suffix += 1;
    if (suffix >= 2) {
      username = `${usernameBase}_${id.slice(0, 6)}`.slice(0, 30);
    } else {
      username = `${usernameBase}_${suffix}`.slice(0, 30);
    }
  }
  await db
    .prepare(
      'INSERT INTO users (id, email, name, username, image, created_at, email_verified, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    )
    .bind(id, email, name, username, null, new Date().toISOString(), nowUnix)
    .run();
  return { id, isNew: true };
}

const getHandler: ApiHandler = async (context: APIContext) => {
  const url = new URL(context.request.url);
  const token = url.searchParams.get('token') || '';
  const devEnv =
    ((context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env
      ?.ENVIRONMENT || 'development') === 'development';
  const startedAt = Date.now();
  // Server-Timing instrumentation
  const t0 = startedAt;
  let durAuth = 0;
  let durUpsert = 0;
  let durSession = 0;
  let durRedirect = 0;
  let stytchRequestId: string | undefined;
  if (devEnv) {
    console.log('[auth][magic][callback] received', { hasToken: Boolean(token) });
  }
  if (!token) {
    // Pending final UX: redirect to login with error
    return createSecureRedirect('/en/login?magic_error=MissingToken');
  }

  // Authenticate with Stytch (or dev bypass)
  let stytchEmail: string | undefined;
  const envRec = (context.locals as unknown as { runtime?: { env?: Record<string, unknown> } })
    ?.runtime?.env;
  const bypassStr =
    typeof envRec?.STYTCH_BYPASS === 'string' ? (envRec.STYTCH_BYPASS as string) : undefined;
  const isBypass = devEnv && (bypassStr === '1' || bypassStr === 'true') && token === 'dev-ok';
  if (isBypass) {
    // In Dev/Test, allow bypass with explicit email param
    stytchEmail = url.searchParams.get('email') || undefined;
    if (devEnv) {
      console.log('[auth][magic][callback] using dev bypass', { hasEmail: Boolean(stytchEmail) });
    }
  } else {
    let pkceVerifier: string | undefined;
    try {
      const v = context.cookies.get('pkce_verifier')?.value || '';
      if (v) pkceVerifier = v;
    } catch {}
    try {
      const _tAuth = Date.now();
      const authRes = await stytchMagicLinkAuthenticate(context, token, pkceVerifier);
      const emails = authRes.user?.emails || [];
      stytchEmail = emails.find((e) => e.verified)?.email || emails[0]?.email;
      {
        const rid = (authRes as { request_id?: string } | null)?.request_id;
        if (typeof rid === 'string') stytchRequestId = rid;
      }
      durAuth = Date.now() - _tAuth;
      if (devEnv) {
        console.log('[auth][magic][callback] provider accepted', {
          ms: Date.now() - startedAt,
          hasEmail: Boolean(stytchEmail),
        });
      }
    } catch (_e) {
      if (devEnv) {
        console.warn('[auth][magic][callback] provider rejected', { ms: Date.now() - startedAt });
      }
      return createSecureRedirect('/en/login?magic_error=InvalidOrExpired');
    }
  }

  // Ensure user exists and is verified
  const env = (context.locals as unknown as { runtime?: { env?: Record<string, unknown> } })
    ?.runtime?.env;
  const db: D1Database | undefined = (env?.DB as unknown as D1Database) || undefined;
  if (!db) {
    return createSecureRedirect('/en/login?magic_error=ServerConfig');
  }

  // Determine email for upsert: prefer Stytch response, fallback to optional email param
  const emailParam = url.searchParams.get('email') || undefined;
  const email = stytchEmail || emailParam;
  if (!email) {
    return createSecureRedirect('/en/login?magic_error=MissingEmail');
  }

  // Read optional profile cookie (JSON: { name?: string, username?: string })
  let desiredName: string | undefined;
  let desiredUsername: string | undefined;
  try {
    const profCookie = context.cookies.get('post_auth_profile')?.value || '';
    if (profCookie) {
      const data = JSON.parse(profCookie) as Record<string, unknown>;
      if (typeof data.name === 'string') desiredName = data.name;
      if (typeof data.username === 'string') desiredUsername = data.username;
    }
  } catch (_err) {
    // Ignore profile cookie parsing failures
  }

  const _tUpsert = Date.now();
  const upsert = await upsertUser(db, email, desiredName, desiredUsername);
  durUpsert = Date.now() - _tUpsert;

  const referralCookie = context.cookies.get('post_auth_referral')?.value || '';
  if (referralCookie) {
    try {
      const referralResult = await recordReferralSignup(db, {
        referralCode: referralCookie,
        referredUserId: upsert.id,
        occurredAt: Date.now(),
        status: upsert.isNew ? 'verified' : 'pending',
      });

      if (referralResult.recorded) {
        logUserEvent(upsert.id, 'referral_signup_recorded', {
          referralCode: referralCookie,
          signupStatus: upsert.isNew ? 'verified' : 'pending',
        });
      } else {
        logUserEvent(upsert.id, 'referral_signup_skipped', {
          referralCode: referralCookie,
          reason: referralResult.reason ?? 'unknown',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[auth][magic][callback] referral_record_failed', {
        message,
      });
      logUserEvent(upsert.id, 'referral_signup_error', {
        referralCode: referralCookie,
        message,
      });
    }
  }

  try {
    context.cookies.delete('post_auth_referral', { path: '/' });
  } catch (_err) {
    // Ignore referral cookie deletion failures
  }

  // Create app session
  const session = await createSession(db, upsert.id);

  const isHttps = url.protocol === 'https:';
  const maxAge = 60 * 60 * 24 * 30; // 30 days

  // Transitional: set both legacy and target cookie
  const _tSession = Date.now();
  try {
    context.cookies.set('session_id', session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge,
    });
    // __Host-session requires HTTPS (secure: true), so only set it on HTTPS connections
    if (isHttps) {
      context.cookies.set('__Host-session', session.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
        maxAge,
      });
    }
  } catch (_err) {
    // Ignore cookie setting failures; session will be retried on next request
  }
  durSession = Date.now() - _tSession;

  // Determine redirect target: prefer cookie set during request phase over query param
  const rCookie = context.cookies.get('post_auth_redirect')?.value || '';
  const r = url.searchParams.get('r') || '';
  let target = (env?.AUTH_REDIRECT as string) || '/dashboard';
  if (isAllowedRelativePath(rCookie)) {
    target = rCookie;
    try {
      context.cookies.delete('post_auth_redirect', { path: '/' });
    } catch (_err) {
      // Ignore cookie deletion failures
    }
  }

  // Clear optional profile cookie once consumed
  try {
    context.cookies.delete('post_auth_profile', { path: '/' });
  } catch (_err) {
    // Ignore cookie deletion failures
  }
  if (!isAllowedRelativePath(rCookie) && isAllowedRelativePath(r)) {
    target = r;
  }

  // Localize target based on locale cookies (prefer post_auth_locale, fallback to pref_locale)
  let effectiveLocale: Locale | undefined;
  try {
    const postAuthLocale = context.cookies.get('post_auth_locale')?.value as Locale | undefined;
    const prefLocale = context.cookies.get('pref_locale')?.value as Locale | undefined;
    effectiveLocale =
      postAuthLocale === 'de' || postAuthLocale === 'en'
        ? postAuthLocale
        : prefLocale === 'de' || prefLocale === 'en'
          ? prefLocale
          : undefined;
    if (effectiveLocale && !isLocalizedPath(target)) {
      target = localizePath(effectiveLocale, target);
    }
    if (postAuthLocale === 'de' || postAuthLocale === 'en') {
      try {
        context.cookies.delete('post_auth_locale', { path: '/' });
      } catch (_err) {
        // Ignore cookie deletion failures
      }
    }
  } catch (_err) {
    // Ignore locale processing failures
  }

  // Create redirect with explicit Set-Cookie headers
  const _tRedirect = Date.now();
  let redirectTarget = target;
  const hasProfileFromRequest = Boolean(desiredName) || Boolean(desiredUsername);
  const hasLocale = isLocalizedPath(target) || !!effectiveLocale;
  if (!hasLocale) {
    // Locale unknown – route once through welcome locale picker
    const nextParam = encodeURIComponent(target);
    redirectTarget = `/welcome?next=${nextParam}`;
    if (devEnv) {
      console.log('[auth][magic][callback] redirect to welcome (no locale known)', { target });
    }
  } else if (upsert.isNew && !hasProfileFromRequest) {
    // First-time user without profile → locale-specific welcome-profile
    const nextParam = encodeURIComponent(target);
    // Prefer effectiveLocale if available; fallback to target prefix; default neutral (de)
    let welcomePath = effectiveLocale === 'en' ? '/en/welcome-profile' : '/welcome-profile';
    if (!effectiveLocale) {
      if (target.startsWith('/en/')) welcomePath = '/en/welcome-profile';
      else if (target.startsWith('/de/')) welcomePath = '/de/welcome-profile';
    }
    redirectTarget = `${welcomePath}?next=${nextParam}`;
    if (devEnv) {
      console.log('[auth][magic][callback] redirect first-time to welcome-profile', {
        target,
        welcomePath,
      });
    }
  } else {
    if (devEnv) {
      console.log('[auth][magic][callback] redirect to target', { target });
    }
  }

  // Create redirect with explicit Set-Cookie headers
  const cookieValue = `session_id=${session.id}; Path=/; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}; Max-Age=${maxAge}`;
  const response = createSecureRedirect(redirectTarget);
  response.headers.append('Set-Cookie', cookieValue);
  if (isHttps) {
    const hostCookie = `__Host-session=${session.id}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${maxAge}`;
    response.headers.append('Set-Cookie', hostCookie);
  }
  try {
    context.cookies.delete('pkce_verifier', { path: '/' });
  } catch {}
  if (stytchRequestId) {
    try {
      response.headers.set('X-Stytch-Request-Id', stytchRequestId);
    } catch {}
  }
  durRedirect = Date.now() - _tRedirect;

  // Append Server-Timing header
  try {
    const total = Date.now() - t0;
    const parts = [
      `stytch_auth;dur=${durAuth}`,
      `db_upsert;dur=${durUpsert}`,
      `session_cookie;dur=${durSession}`,
      `redirect_build;dur=${durRedirect}`,
      `total;dur=${total}`,
    ];
    response.headers.set('Server-Timing', parts.join(', '));
  } catch {}

  if (devEnv) {
    console.log('[auth][magic][callback] response headers Set-Cookie', { cookie: cookieValue });
  }

  return response;
};

export const GET = withRedirectMiddleware(getHandler);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
