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
    username = `${usernameBase}_${suffix}`.slice(0, 30);
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
    ((context.locals as any)?.runtime?.env?.ENVIRONMENT || 'development') === 'development';
  const startedAt = Date.now();
  if (devEnv) {
    console.log('[auth][magic][callback] received', { hasToken: Boolean(token) });
  }
  if (!token) {
    // Pending final UX: redirect to login with error
    return createSecureRedirect('/en/login?magic_error=MissingToken');
  }

  // Authenticate with Stytch (or dev bypass)
  let stytchEmail: string | undefined;
  const envBypass = (context.locals as any)?.runtime?.env?.STYTCH_BYPASS;
  const isBypass = envBypass === '1' && token === 'dev-ok';
  if (isBypass) {
    // In Dev/Test, allow bypass with explicit email param
    stytchEmail = url.searchParams.get('email') || undefined;
    if (devEnv) {
      console.log('[auth][magic][callback] using dev bypass', { hasEmail: Boolean(stytchEmail) });
    }
  } else {
    try {
      const authRes = await stytchMagicLinkAuthenticate(context, token);
      const emails = authRes.user?.emails || [];
      stytchEmail = emails.find((e) => e.verified)?.email || emails[0]?.email;
      if (devEnv) {
        console.log('[auth][magic][callback] provider accepted', {
          ms: Date.now() - startedAt,
          hasEmail: Boolean(stytchEmail),
        });
      }
    } catch (e) {
      if (devEnv) {
        console.warn('[auth][magic][callback] provider rejected', { ms: Date.now() - startedAt });
      }
      return createSecureRedirect('/en/login?magic_error=InvalidOrExpired');
    }
  }

  // Ensure user exists and is verified
  const env = (context.locals as unknown as { runtime?: { env?: Record<string, any> } })?.runtime
    ?.env;
  const db: D1Database | undefined = env?.DB as unknown as D1Database;
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
      const data = JSON.parse(profCookie);
      if (typeof data.name === 'string') desiredName = data.name;
      if (typeof data.username === 'string') desiredUsername = data.username;
    }
  } catch (_err) {
    // Ignore profile cookie parsing failures
  }

  const upsert = await upsertUser(db, email, desiredName, desiredUsername);

  // Create app session
  const session = await createSession(db, upsert.id);

  const isHttps = url.protocol === 'https:';
  const maxAge = 60 * 60 * 24 * 30; // 30 days

  // Transitional: set both legacy and target cookie
  try {
    context.cookies.set('session_id', session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      maxAge,
    });
    context.cookies.set('__Host-session', session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: isHttps,
      maxAge,
    });
  } catch (_err) {
    // Ignore cookie setting failures; session will be retried on next request
  }

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

  // Localize target based on locale hint cookie (only if target is not already localized)
  try {
    const localeCookie = context.cookies.get('post_auth_locale')?.value as Locale | undefined;
    if (localeCookie === 'de' || localeCookie === 'en') {
      if (!isLocalizedPath(target)) {
        target = localizePath(localeCookie, target);
      }
      try {
        context.cookies.delete('post_auth_locale', { path: '/' });
      } catch (_err) {
        // Ignore cookie deletion failures
      }
    }
  } catch (_err) {
    // Ignore locale processing failures
  }

  // If this is a first-time user and no explicit profile data was provided,
  // guide them through a lightweight profile completion step.
  const hasProfileFromRequest = Boolean(desiredName) || Boolean(desiredUsername);
  if (upsert.isNew && !hasProfileFromRequest) {
    const nextParam = encodeURIComponent(target);
    if (devEnv) {
      console.log('[auth][magic][callback] redirect first-time to welcome-profile', { target });
    }
    return createSecureRedirect(`/welcome-profile?next=${nextParam}`);
  }
  if (devEnv) {
    console.log('[auth][magic][callback] redirect to target', { target });
  }
  // Direct redirect to target (simplified flow; no cross-tab broadcast)
  return createSecureRedirect(target);
};

export const GET = withRedirectMiddleware(getHandler);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
