import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { withRedirectMiddleware, type ApiHandler, createMethodNotAllowed } from '@/lib/api-middleware';
import { createSecureRedirect } from '@/lib/response-helpers';
import { localizePath, isLocalizedPath } from '@/lib/locale-path';
import type { Locale } from '@/lib/i18n';
import { stytchOAuthAuthenticate } from '@/lib/stytch';
import { createSession } from '@/lib/auth-v2';

function isAllowedRelativePath(r: string): boolean {
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//');
}

async function upsertUser(db: D1Database, email: string, desiredName?: string, desiredUsername?: string): Promise<{ id: string; isNew: boolean }> {
  const existing = await db.prepare('SELECT id, email_verified FROM users WHERE email = ?').bind(email).first<{ id: string; email_verified?: number }>();
  const nowUnix = Math.floor(Date.now() / 1000);
  if (existing && existing.id) {
    await db.prepare('UPDATE users SET email_verified = 1, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?')
      .bind(nowUnix, existing.id)
      .run();
    return { id: existing.id, isNew: false };
  }
  const id = crypto.randomUUID();
  const fallbackName = email.split('@')[0] || 'user';
  const name = (desiredName && desiredName.trim().slice(0, 50)) || fallbackName;
  const baseForUsername = (desiredUsername && desiredUsername.trim()) || name;
  const usernameBase = baseForUsername.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || `user_${id.slice(0, 6)}`;
  let username = usernameBase;
  let suffix = 0;
  while (true) {
    const taken = await db.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first<{ 1: number }>();
    if (!taken) break;
    suffix += 1;
    username = `${usernameBase}_${suffix}`.slice(0, 30);
  }
  await db.prepare(
    'INSERT INTO users (id, email, name, username, image, created_at, email_verified, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
  ).bind(
    id,
    email,
    name,
    username,
    null,
    new Date().toISOString(),
    nowUnix
  ).run();
  return { id, isNew: true };
}

const getHandler: ApiHandler = async (context: APIContext) => {
  const { request, params } = context;
  const url = new URL(request.url);
  const provider = String(params.provider || '').toLowerCase();
  const allowed = new Set(['github', 'google', 'apple', 'microsoft']);
  if (!allowed.has(provider)) {
    return createSecureRedirect('/en/login?magic_error=InvalidProvider');
  }

  // Stytch redirects back with stytch_token_type=oauth & token=...
  const tokenType = url.searchParams.get('stytch_token_type') || '';
  const token = url.searchParams.get('token') || '';
  const devEnv = ((context.locals as any)?.runtime?.env?.ENVIRONMENT || 'development') === 'development';
  const startedAt = Date.now();
  if (devEnv) {
    console.log('[auth][oauth][callback] received', { provider, tokenType, hasToken: Boolean(token) });
  }
  if (tokenType !== 'oauth' || !token) {
    return createSecureRedirect('/en/login?magic_error=InvalidOrExpired');
  }

  // Authenticate token with Stytch
  let stytchEmail: string | undefined;
  try {
    const authRes = await stytchOAuthAuthenticate(context, token);
    const emails = authRes.user?.emails || [];
    stytchEmail = emails.find((e) => e.verified)?.email || emails[0]?.email;
    if (devEnv) {
      console.log('[auth][oauth][callback] provider accepted', { ms: Date.now() - startedAt, hasEmail: Boolean(stytchEmail) });
    }
  } catch (_e) {
    if (devEnv) {
      console.warn('[auth][oauth][callback] provider rejected', { ms: Date.now() - startedAt });
    }
    return createSecureRedirect('/en/login?magic_error=InvalidOrExpired');
  }

  // Ensure user exists and is verified
  const env = (context.locals as unknown as { runtime?: { env?: Record<string, any> } })?.runtime?.env;
  const db: D1Database | undefined = env?.DB as unknown as D1Database;
  if (!db) {
    return createSecureRedirect('/en/login?magic_error=ServerConfig');
  }

  // Optional profile cookie (same as magic link flow)
  let desiredName: string | undefined;
  let desiredUsername: string | undefined;
  try {
    const profCookie = context.cookies.get('post_auth_profile')?.value || '';
    if (profCookie) {
      const data = JSON.parse(profCookie);
      if (typeof data.name === 'string') desiredName = data.name;
      if (typeof data.username === 'string') desiredUsername = data.username;
    }
  } catch {
    // Ignore profile cookie parsing failures
  }

  const email = stytchEmail;
  if (!email) {
    return createSecureRedirect('/en/login?magic_error=MissingEmail');
  }

  const upsert = await upsertUser(db, email, desiredName, desiredUsername);

  // Create session
  const session = await createSession(db, upsert.id);

  const isHttps = url.protocol === 'https:';
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  try {
    context.cookies.set('session_id', session.id, {
      path: '/', httpOnly: true, sameSite: 'lax', secure: isHttps, maxAge,
    });
    context.cookies.set('__Host-session', session.id, {
      path: '/', httpOnly: true, sameSite: 'strict', secure: isHttps, maxAge,
    });
  } catch {
    // Ignore cookie setting failures
  }

  // Resolve redirect target
  const rCookie = context.cookies.get('post_auth_redirect')?.value || '';
  const r = url.searchParams.get('r') || '';
  let target = (env?.AUTH_REDIRECT as string) || '/dashboard';
  if (isAllowedRelativePath(rCookie)) {
    target = rCookie;
    try { context.cookies.delete('post_auth_redirect', { path: '/' }); } catch {
      // Ignore cookie deletion failures
    }
  }
  try {
    context.cookies.delete('post_auth_profile', { path: '/' });
  } catch {
    // Ignore cookie deletion failures
  }
  if (!isAllowedRelativePath(rCookie) && isAllowedRelativePath(r)) {
    target = r;
  }

  // Localize target if possible
  try {
    const localeCookie = context.cookies.get('post_auth_locale')?.value as Locale | undefined;
    if (localeCookie === 'de' || localeCookie === 'en') {
      if (!isLocalizedPath(target)) {
        target = localizePath(localeCookie, target);
      }
      try { context.cookies.delete('post_auth_locale', { path: '/' }); } catch (_err) {
        // Ignore cookie deletion failures
      }
    }
  } catch (_err) {
    // Ignore locale processing failures
  }

  if (upsert.isNew && !(desiredName || desiredUsername)) {
    const nextParam = encodeURIComponent(target);
    if (devEnv) {
      console.log('[auth][oauth][callback] redirect first-time to welcome-profile', { target });
    }
    return createSecureRedirect(`/welcome-profile?next=${nextParam}`);
  }
  if (devEnv) {
    console.log('[auth][oauth][callback] redirect to target', { target });
  }
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
