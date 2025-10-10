import { defineMiddleware } from 'astro:middleware';
import type { Locale } from '@/lib/i18n';
import { validateSession } from '@/lib/auth-v2';
import { log, generateRequestId } from '@/server/utils/logger';

// Helper: redact sensitive headers and anonymize IPs for logs
function anonymizeIp(value: string): string {
  if (!value) return value;
  // handle IPv4 list like "1.2.3.4, 5.6.7.8"
  const parts = value.split(',').map((p) => p.trim());
  const anonymized = parts.map((ip) => {
    // IPv4
    const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) return `${m[1]}.${m[2]}.${m[3]}.0`;
    // IPv6 – trim last hextet
    if (ip.includes(':')) {
      const segs = ip.split(':');
      if (segs.length > 1) {
        segs[segs.length - 1] = '0';
        return segs.join(':');
      }
    }
    return ip;
  });
  return anonymized.join(', ');
}

function sanitizeHeaders(h: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of h.entries()) {
    const key = k.toLowerCase();
    if (key === 'cookie' || key === 'authorization' || key === 'set-cookie') {
      obj[k] = '[redacted]';
      continue;
    }
    if (key === 'cf-connecting-ip' || key === 'x-forwarded-for' || key === 'x-real-ip') {
      obj[k] = anonymizeIp(v);
      continue;
    }
    obj[k] = v;
  }
  return obj;
}

// Generate a per-request CSP nonce (Web Crypto if available, fallback to Math.random)
function generateNonce(): string {
  try {
    const arr = new Uint8Array(16);
    const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
    cryptoObj?.getRandomValues(arr);
    let s = '';
    for (const b of arr) s += String.fromCharCode(b);
    return btoa(s);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Generate request ID for tracing
  const requestId = generateRequestId();
  const startTime = Date.now();
  const url = new URL(context.request.url);

  // Log request start
  log('info', `${context.request.method} ${url.pathname}`, {
    requestId,
    endpoint: url.pathname,
    method: context.request.method,
  });

  // WWW -> Apex Redirect (before auth)
  try {
    const u = new URL(context.request.url);
    if (u.hostname === 'www.hub-evolution.com') {
      u.hostname = 'hub-evolution.com';
      log('info', `WWW redirect: ${u.hostname}`, { requestId });
      return Response.redirect(u.toString(), 301);
    }
  } catch (e) {
    log('warn', `URL parse error for redirect check: ${e}`, { requestId });
  }

  // HTTP Basic Auth Check für temporären Produktionsschutz
  // Ausnahmen: API-Routen, Assets und Health-Checks sollen passwortfrei bleiben
  const requestUrl = new URL(context.request.url);
  // Umgebung ermitteln (nur in echter Produktion schützen)
  const runtimeEnv = (context.locals as unknown as { runtime?: { env?: Record<string, string> } })
    ?.runtime?.env;
  const environment =
    runtimeEnv?.ENVIRONMENT ||
    (runtimeEnv as Record<string, string> | undefined)?.NODE_ENV ||
    'development';
  const isProductionEnv = environment === 'production';
  const isProductionHost = requestUrl.hostname === 'hub-evolution.com';
  const isApiRoute = requestUrl.pathname.startsWith('/api/');
  // Treat R2 proxy route as an asset-like route: must never be redirected or gated
  // This ensures URLs like /r2-ai/ai-enhancer/uploads/... are always directly served
  const isR2ProxyRoute = requestUrl.pathname.startsWith('/r2-ai/');
  const isAssetFile =
    /\.(css|js|mjs|map|svg|png|jpe?g|webp|gif|ico|json|xml|txt|woff2?|ttf|webmanifest)$/i.test(
      requestUrl.pathname
    ) ||
    requestUrl.pathname === '/favicon.ico' ||
    requestUrl.pathname.startsWith('/_astro/') ||
    requestUrl.pathname.startsWith('/assets/') ||
    requestUrl.pathname.startsWith('/icons/') ||
    requestUrl.pathname.startsWith('/images/') ||
    requestUrl.pathname.startsWith('/favicons/');

  // Feature-Flag: Basic Auth nur aktivieren, wenn explizit erlaubt (default: true für Backwards-Kompatibilität)
  const siteAuthEnabledRaw = (context.locals.runtime?.env as any)?.SITE_AUTH_ENABLED as
    | string
    | undefined;
  const siteAuthEnabled = siteAuthEnabledRaw ? /^(1|true|yes|on)$/i.test(siteAuthEnabledRaw) : true;

  // Nur in echter Produktion auf Hauptdomain schützen, nicht APIs/Assets
  if (
    isProductionEnv &&
    isProductionHost &&
    !isApiRoute &&
    !isAssetFile &&
    !isR2ProxyRoute &&
    siteAuthEnabled
  ) {
    const correctUsername = 'admin';
    const correctPassword = (context.locals.runtime?.env as any)?.SITE_PASSWORD as
      | string
      | undefined;

    if (!correctPassword) {
      if (import.meta.env.DEV) {
        log('warn', '[Middleware] SITE_PASSWORD missing in production environment', { requestId });
      }
      return new Response('Service temporarily unavailable', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const auth = context.request.headers.get('Authorization');
    const challengeHeaders = new Headers();
    challengeHeaders.set('WWW-Authenticate', 'Basic realm="Evolution Hub", charset="UTF-8"');
    challengeHeaders.set('Cache-Control', 'no-store');
    challengeHeaders.set('Content-Type', 'text/html; charset=utf-8');

    if (!auth || !auth.startsWith('Basic ')) {
      return new Response('Authentication required', { status: 401, headers: challengeHeaders });
    }

    try {
      const decoded = atob(auth.slice(6));
      const sepIdx = decoded.indexOf(':');
      const username = sepIdx >= 0 ? decoded.slice(0, sepIdx) : '';
      const password = sepIdx >= 0 ? decoded.slice(sepIdx + 1) : '';

      if (username !== correctUsername || password !== correctPassword) {
        return new Response('Invalid credentials', { status: 401, headers: challengeHeaders });
      }
    } catch (error) {
      return new Response('Invalid authentication', { status: 401, headers: challengeHeaders });
    }
  }

  // WWW -> Apex Redirect handled earlier (before Basic Auth)

  // Locale-Handling: Cookie persistieren und neutrale Pfade ggf. umleiten
  const path = url.pathname;

  // In Remote Dev zeigt url.origin auf *.workers.dev. Für lokale UX und korrekte
  // Callback-URLs verwenden wir in Development die BASE_URL aus dem Runtime-Env.
  const cfEnv = (context.locals as unknown as { runtime?: { env?: Record<string, string> } })
    ?.runtime?.env;
  const isDevEnv =
    (cfEnv?.ENVIRONMENT || (cfEnv as Record<string, string> | undefined)?.NODE_ENV) ===
    'development';
  const originForRedirects = isDevEnv && cfEnv?.BASE_URL ? cfEnv.BASE_URL : url.origin;

  // Direkt-Weiterleitung: /favicon.ico -> /favicon.svg
  // Auskommentiert, damit favicon.ico aus public/ ausgeliefert werden kann.
  // if (path === '/favicon.ico') {
  //   const location = `${url.origin}/favicon.svg`;
  //   const headers = new Headers();
  //   headers.set('Location', location);
  //   // Dauerhafte Weiterleitung, damit Browser den neuen Pfad cachen
  //   return new Response(null, { status: 308, headers });
  // }  // Create and expose CSP Nonce early so it's available during render
  const cspNonce = generateNonce();
  try {
    // Expose for .astro via Astro.locals
    (context.locals as unknown as { cspNonce?: string }).cspNonce = cspNonce;
  } catch (e) {
    if (import.meta.env.DEV) {
      log('warn', '[Middleware] Failed to set cspNonce on locals', {
        requestId,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Removed: notify normalization (simplified auth flow redirects directly from callback)

  const LOCALE_PREFIX_RE = /^\/(de|en)(\/|$)/;
  const existingLocale = (() => {
    const m = path.match(LOCALE_PREFIX_RE);
    return (m?.[1] as Locale) ?? null;
  })();

  const cookieName = 'pref_locale';
  let cookieLocale = ((): Locale | null => {
    const v = context.cookies.get(cookieName)?.value;
    return v === 'de' || v === 'en' ? (v as Locale) : null;
  })();
  // Fallback: parse raw Cookie header, in case cookies API misses it (dev quirk)
  if (!cookieLocale) {
    const raw = context.request.headers.get('cookie') || '';
    const match = raw.match(/(?:^|;\s*)pref_locale=(de|en)(?:;|$)/i);
    if (match) {
      cookieLocale = match[1].toLowerCase() as Locale;
      if (import.meta.env.DEV) {
        log('debug', '[Middleware] Fallback parsed pref_locale from raw header', {
          requestId,
          cookieLocale,
        });
      }
    }
  }

  // Session-basierte Splash-Gate: einmal pro Browser-Session anzeigen
  const sessionGateCookie = 'session_welcome_seen';
  const sessionWelcomeSeen = context.cookies.get(sessionGateCookie)?.value === '1';

  function detectFromAcceptLanguage(header: string | null): Locale {
    const h = (header || '').toLowerCase();
    if (/(^|,|;|\s)de(-[a-z]{2})?/.test(h)) return 'de';
    if (/(^|,|;|\s)en(-[a-z]{2})?/.test(h)) return 'en';
    return 'de';
  }
  // Einfache Bot-/Crawler-Erkennung anhand des User-Agent
  function isBot(userAgent: string | null): boolean {
    const ua = (userAgent || '').toLowerCase();
    if (!ua) return false;
    return /(bot|crawl|spider|slurp|mediapartners|crawler|facebookexternalhit|whatsapp|telegram|discord|preview|linkchecker)/i.test(
      ua
    );
  }

  // Auth-Routen sollen niemals durch das Welcome-Gate unterbrochen werden
  function isAuthRoute(p: string): boolean {
    // Unterstützt optionale Sprachpräfixe /de/ oder /en/
    // Removed auth/notify from the list; flow no longer uses the route
    const AUTH_RE =
      /^\/(?:(?:de|en)\/)?(?:login|register|forgot-password|reset-password|verify-email|email-verified|auth\/password-reset-sent)(\/|$)/;
    return AUTH_RE.test(p);
  }

  // Guests dürfen die Imag-Enhancer-Toolrouten direkt nutzen (besserer Funnel)
  // -> Splash-/Welcome-Gate überspringen für diese Routen
  function isGuestAccessibleToolRoute(p: string): boolean {
    // Optionales Sprachpräfix /de oder /en unterstützen
    const TOOL_RE = /^\/(?:(?:de|en)\/)?tools\/imag-enhancer(?:\/app)?(?:\/?$)/;
    return TOOL_RE.test(p);
  }

  const preferredLocale: Locale =
    existingLocale ??
    cookieLocale ??
    detectFromAcceptLanguage(context.request.headers.get('accept-language'));

  // (Entfernt) Unabhängige Benutzerpräferenz war redundant und ungenutzt

  // Helper: bereinigt und parst den next-Parameter sicher (nur gleiche Origin erlaubt)
  function safeParseNext(nextRaw: string | null): URL | null {
    if (!nextRaw) return null;
    try {
      const nextUrl = new URL(nextRaw, url.origin);
      if (nextUrl.origin !== url.origin) return null;
      return nextUrl;
    } catch {
      return null;
    }
  }

  // Helper: mappt einen Pfad auf Ziel-Locale (ähnlich switchLocalePath)
  function mapPathToLocale(targetLocale: Locale, base: URL): string {
    const LOCALE_RE = /^\/(de|en)(\/|$)/;
    const pathname = base.pathname.replace(LOCALE_RE, '/');
    const build = (p: string) => (targetLocale === 'en' ? (p === '/' ? '/en/' : `/en${p}`) : p);
    const targetPath = build(pathname);
    const next = new URL(base.toString());
    // Entferne Steuerparameter
    next.searchParams.delete('set_locale');
    next.searchParams.delete('next');
    return `${targetPath}${next.search}${next.hash}`;
  }

  // Explizite Locale-Auswahl via ?set_locale=de|en -> Cookie setzen und redirect zu gemapptem next
  const setLocaleParam = url.searchParams.get('set_locale');
  if (setLocaleParam === 'de' || setLocaleParam === 'en') {
    const targetLocale = setLocaleParam as Locale;
    try {
      context.cookies.set(cookieName, targetLocale, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
        maxAge: 60 * 60 * 24 * 180, // 180 Tage
      });
      if (import.meta.env.DEV) {
        log('debug', '[Middleware] pref_locale cookie explicitly set', { requestId, targetLocale });
      }
    } catch (e) {
      log('warn', '[Middleware] Failed to explicitly set pref_locale cookie', {
        requestId,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }

    const nextUrl = safeParseNext(url.searchParams.get('next')) ?? url;
    // Loop-Guard: Wenn next auf /welcome zeigt, auf Startseite je nach Locale umleiten
    let effectiveNext = nextUrl;
    try {
      const p = effectiveNext.pathname.replace(/\/+$/, '');
      if (p === '/welcome' || p === '/en/welcome' || p === '/de/welcome') {
        const fallbackPath = targetLocale === 'en' ? '/en/' : '/';
        effectiveNext = new URL(fallbackPath, url.origin);
        if (import.meta.env.DEV) {
          log(
            'debug',
            '[Middleware] set_locale loop-guard activated; next pointed to welcome, using fallback',
            {
              requestId,
              fallbackPath,
              targetLocale,
            }
          );
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        log('warn', '[Middleware] set_locale next parsing failed', {
          requestId,
          errorMessage: e instanceof Error ? e.message : String(e),
        });
      }
    }
    const location = `${originForRedirects}${mapPathToLocale(targetLocale, effectiveNext)}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', targetLocale);
    headers.set('Vary', 'Cookie, Accept-Language');
    return new Response(null, { status: 302, headers });
  }

  // Cookie NUR setzen, wenn Locale explizit in der URL vorhanden ist
  if (existingLocale && cookieLocale !== existingLocale) {
    try {
      context.cookies.set(cookieName, existingLocale, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
        maxAge: 60 * 60 * 24 * 180,
      });
      if (import.meta.env.DEV) {
        log('debug', '[Middleware] pref_locale cookie synced to URL locale', {
          requestId,
          existingLocale,
        });
      }
    } catch (e) {
      log('warn', '[Middleware] Failed to sync pref_locale cookie with URL locale', {
        requestId,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Bestimme, ob Redirect vermieden werden soll (APIs/Assets)
  const isApi = path.startsWith('/api/');
  const isAsset =
    /\.(css|js|mjs|map|svg|png|jpe?g|webp|gif|ico|json|xml|txt|woff2?|ttf|webmanifest)$/i.test(
      path
    ) ||
    path === '/favicon.ico' ||
    path.startsWith('/assets/') ||
    path.startsWith('/icons/') ||
    path.startsWith('/images/') ||
    path.startsWith('/favicons/');
  // Same treatment for path-based checks further down
  const isR2Proxy = path.startsWith('/r2-ai/');

  const bot = isBot(context.request.headers.get('user-agent'));

  // Referer-basiertes Fallback-Signal: wenn vorherige Seite /en/... war, präferiere EN
  let refererSuggestsEn = false;
  try {
    const ref = context.request.headers.get('referer');
    if (ref) {
      const r = new URL(ref);
      if (r.origin === url.origin && (r.pathname === '/en' || r.pathname.startsWith('/en/'))) {
        refererSuggestsEn = true;
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Middleware] Failed to parse referer header:', e);
    }
  }

  // Frühzeitiger Redirect: neutrale Pfade -> /en/* NUR wenn kein Cookie gesetzt ist, aber Referer EN nahelegt
  const shouldPreferEnByReferer = !cookieLocale && refererSuggestsEn;
  if (
    !existingLocale &&
    !isApi &&
    !isAsset &&
    !isR2Proxy &&
    shouldPreferEnByReferer &&
    !path.startsWith('/welcome') &&
    !isAuthRoute(path)
  ) {
    const target = path === '/' ? '/en/' : `/en${path}`;
    const location = `${originForRedirects}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', 'en');
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      log(
        'debug',
        '[Middleware] Early neutral -> referer suggests EN (no cookie), redirect to EN',
        { requestId, location }
      );
    }
    return new Response(null, { status: 302, headers });
  }

  // Zeige Splash/Welcome beim ersten sichtbaren Besuch dieser Session
  // Überspringe Splash, wenn bereits ein Locale-Cookie vorhanden ist
  if (
    !sessionWelcomeSeen &&
    !cookieLocale &&
    !isApi &&
    !isAsset &&
    !isR2Proxy &&
    !bot &&
    !path.startsWith('/welcome') &&
    !isAuthRoute(path) &&
    !isGuestAccessibleToolRoute(path) &&
    !existingLocale
  ) {
    try {
      // Session-Cookie (kein maxAge) setzen, damit Splash nur einmal pro Session erscheint
      context.cookies.set(sessionGateCookie, '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
      });
      if (import.meta.env.DEV) {
        log('debug', '[Middleware] Session splash gate -> set session_welcome_seen cookie', {
          requestId,
        });
      }
    } catch (e) {
      log('warn', '[Middleware] Failed to set session splash cookie', {
        requestId,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
    const location = `${url.origin}/welcome?next=${encodeURIComponent(url.toString())}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] First visible visit this session -> redirect to welcome', {
        requestId,
        location,
      });
    }
    return new Response(null, { status: 302, headers });
  }

  // (Entfernt) Zweiter, redundanter Splash-Redirect-Block

  // Normalisiere /de/* auf kanonische URL
  // - DE ist neutral (ohne /de)
  // - EN ist unter /en/* (wenn Cookie-Präferenz 'en')
  const isDePrefixed = path === '/de' || path.startsWith('/de/');
  if (isDePrefixed && !isApi && !isAsset && !isR2Proxy && !isAuthRoute(path)) {
    const pathWithoutDe = path.replace(/^\/de(\/|$)/, '/');
    const target =
      cookieLocale === 'en'
        ? pathWithoutDe === '/'
          ? '/en/'
          : `/en${pathWithoutDe}`
        : pathWithoutDe;
    const location = `${originForRedirects}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', cookieLocale === 'en' ? 'en' : 'de');
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] Normalize /de/* to canonical', { requestId, location });
    }
    return new Response(null, { status: 308, headers });
  }

  // Bot/Crawler: Splash überspringen; neutrale Pfade anhand Accept-Language für Bots umleiten
  if (bot && !existingLocale && !isApi && !isAsset && !isR2Proxy) {
    const botLocale = detectFromAcceptLanguage(context.request.headers.get('accept-language'));
    if (botLocale === 'en') {
      const target = path === '/' ? '/en/' : `/en${path}`;
      const location = `${originForRedirects}${target}${url.search}${url.hash}`;
      const headers = new Headers();
      headers.set('Location', location);
      headers.set('Content-Language', 'en');
      headers.set('Vary', 'Cookie, Accept-Language');
      if (import.meta.env.DEV) {
        log('debug', '[Middleware] Bot neutral -> redirect to EN', { requestId, location });
      }
      return new Response(null, { status: 302, headers });
    }
  }

  // Neutrale Pfade nur bei gesetztem Cookie=en auf /en/... umleiten; sonst neutral (DE) belassen
  if (
    !existingLocale &&
    !isApi &&
    !isAsset &&
    !isR2Proxy &&
    cookieLocale === 'en' &&
    !path.startsWith('/welcome') &&
    !isAuthRoute(path)
  ) {
    const target = path === '/' ? '/en/' : `/en${path}`;
    const location = `${originForRedirects}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', 'en');
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] Neutral path -> cookie=en, redirect to EN', {
        requestId,
        location,
      });
    }
    return new Response(null, { status: 302, headers });
  }

  // Authentifizierung
  if (!context.locals.runtime) {
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] No runtime context available', { requestId });
    }
    context.locals.user = null;
    context.locals.session = null;
  } else {
    // Try __Host-session first (stricter, SameSite=Strict), fallback to session_id (SameSite=Lax)
    const sessionId =
      context.cookies.get('__Host-session')?.value ??
      context.cookies.get('session_id')?.value ??
      null;
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] Session ID from cookie', { requestId, present: !!sessionId });
    }

    if (!sessionId) {
      context.locals.user = null;
      context.locals.session = null;
    } else {
      // Session validieren und Locals setzen
      try {
        const { session, user } = await validateSession(context.locals.runtime.env.DB, sessionId);
        if (import.meta.env.DEV) {
          log('debug', '[Middleware] Session validation result', {
            requestId,
            sessionValid: !!session,
            userValid: !!user,
          });
        }

        context.locals.session = session;
        context.locals.user = user;
      } catch (error) {
        log('error', '[Middleware] Error during session validation', {
          requestId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        context.locals.session = null;
        context.locals.user = null;
      }
    }
  }

  // Verification gate: redirect unverifizierte Nutzer vom Dashboard zu /verify-email
  try {
    const user = context.locals.user;
    const isDashboardRoute = (p: string): boolean => {
      const DASH_RE = /^\/(?:(?:de|en)\/)?.*dashboard(\/|$)/;
      return DASH_RE.test(p);
    };
    const isVerifyEmailRoute = (p: string): boolean => {
      const VE_RE = /^\/(?:(?:de|en)\/)?.*verify-email(\/|$)/;
      return VE_RE.test(p);
    };
    if (
      user &&
      user.email_verified === false &&
      isDashboardRoute(path) &&
      !isVerifyEmailRoute(path)
    ) {
      const targetLocale: Locale = existingLocale ?? preferredLocale;
      const base = targetLocale === 'en' ? '/en/verify-email' : '/verify-email';
      const params = new URLSearchParams();
      if (user.email) params.set('email', user.email);
      const location = `${originForRedirects}${base}${params.toString() ? `?${params.toString()}` : ''}`;
      const headers = new Headers();
      headers.set('Location', location);
      headers.set('Vary', 'Cookie, Accept-Language');
      headers.set('Content-Language', targetLocale);
      if (import.meta.env.DEV) {
        log('debug', '[Middleware] Unverified user -> redirect to verify-email', {
          requestId,
          location,
        });
      }
      return new Response(null, { status: 302, headers });
    }
  } catch (e) {
    log('warn', '[Middleware] Verification gate check failed', {
      requestId,
      errorMessage: e instanceof Error ? e.message : String(e),
    });
  }

  // Führe den nächsten Middleware-Schritt aus
  const response = await next();

  // Detailliertes Response-Logging (nur DEV), mit Redaction
  if (import.meta.env.DEV) {
    const redacted = sanitizeHeaders(response.headers as unknown as Headers);
    log('debug', '[Middleware] Outgoing response', {
      requestId,
      status: response.status,
      statusText: response.statusText,
      headers: redacted,
    });
  }

  // MIME-Typ-Korrektur für Assets
  if (import.meta.env.DEV) {
    log('debug', '[Middleware] Processing path', { requestId, path });
  }

  // Setze MIME-Typen für verschiedene Dateitypen
  if (path.endsWith('.css')) {
    // Geänderte Bedingung: Alle .css-Dateien berücksichtigen
    response.headers.set('Content-Type', 'text/css');
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] Set Content-Type to text/css for CSS file', { requestId });
    }
  } else if (path.endsWith('.js')) {
    response.headers.set('Content-Type', 'application/javascript');
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] Set Content-Type to application/javascript for JS file', {
        requestId,
      });
    }
  } else if (path.endsWith('.svg')) {
    response.headers.set('Content-Type', 'image/svg+xml');
    if (import.meta.env.DEV) {
      log('debug', '[Middleware] Set Content-Type to image/svg+xml for SVG file', { requestId });
    }
  }

  // Content-Language & Vary Header setzen
  const effectiveLocale: Locale = existingLocale ?? preferredLocale;
  response.headers.set('Content-Language', effectiveLocale);
  const existingVary = response.headers.get('Vary') || '';
  const varyParts = new Set(
    existingVary
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean)
  );
  varyParts.add('Cookie');
  varyParts.add('Accept-Language');
  response.headers.set('Vary', Array.from(varyParts).join(', '));

  // Verhindere Caching für kritische Auth-Seiten (Login), um Stale-Bundles zu vermeiden
  try {
    const isLoginRoute = /^\/(?:(?:de|en)\/)?login(\/|$)/.test(path);
    if (isLoginRoute) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
  } catch {
    // Ignore header setting failures
  }

  // Sicherheits-Header hinzufügen
  // X-Robots-Tag for welcome page (HTTP-level noindex)
  if (path === '/welcome' || path === '/welcome/') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  // CSP: relax in development for Astro/Vite HMR and inline module scripts; strict in production
  // Wrangler "dev" runs a built worker, so import.meta.env.DEV can be false.
  // Treat local loopbacks as development to keep relaxed CSP during local E2E/dev.
  // cfEnv wurde weiter oben definiert
  const envFlagDev = !!(
    cfEnv &&
    (cfEnv.ENVIRONMENT === 'development' || (cfEnv as any).NODE_ENV === 'development')
  );
  const __devLike =
    import.meta.env.DEV ||
    import.meta.env.MODE === 'development' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === 'localhost' ||
    url.hostname === '::1' ||
    envFlagDev;
  if (__devLike) {
    const devCsp = [
      "default-src 'self' data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com",
      "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com",
      "connect-src 'self' ws: http: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');
    response.headers.set('Content-Security-Policy', devCsp);
  } else {
    // Use strict nonce-based CSP only when ENVIRONMENT === 'production'.
    // Cloudflare sets NODE_ENV='production' even for preview/testing, so we MUST NOT rely on NODE_ENV here.
    const isProduction = !!(cfEnv && cfEnv.ENVIRONMENT === 'production');
    // Important: In non-production we must NOT include a nonce together with 'unsafe-inline'.
    // Browsers ignore 'unsafe-inline' when a nonce or hash is present, which would still block inline scripts.
    // Therefore:
    // - Production: strict nonce-based policy with 'strict-dynamic'.
    // - Non-production: relaxed policy with 'unsafe-inline' and 'unsafe-eval' (no nonce, no strict-dynamic).
    const csp = (
      isProduction
        ? [
            "default-src 'self'",
            `script-src 'self' 'nonce-${cspNonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com`,
            `script-src-elem 'self' 'nonce-${cspNonce}' https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com`,
            "connect-src 'self' https: wss:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
            "img-src 'self' data: blob: https:",
            "font-src 'self' https://fonts.gstatic.com",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            'report-uri /api/csp-report',
          ]
        : [
            "default-src 'self' data: blob:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com",
            "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com",
            "connect-src 'self' ws: http: https:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
            "img-src 'self' data: blob: https:",
            "font-src 'self' https://fonts.gstatic.com",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            'report-uri /api/csp-report',
          ]
    ).join('; ');
    response.headers.set('Content-Security-Policy', csp);
  }
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  // Add missing headers for HTML responses (previously only on API routes)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  // Referrer-Policy nur auf Reset-Passwort-Seiten erzwingen (keine Weitergabe sensibler Token über Referrer)
  const isResetPasswordPath =
    path === '/reset-password' ||
    path === '/reset-password/' ||
    path === '/de/reset-password' ||
    path === '/de/reset-password/' ||
    path === '/en/reset-password' ||
    path === '/en/reset-password/';
  if (isResetPasswordPath) {
    response.headers.set('Referrer-Policy', 'no-referrer');
  }

  // Log response with timing
  const duration = Date.now() - startTime;
  log('info', `${context.request.method} ${url.pathname} -> ${response.status}`, {
    requestId,
    duration,
    status: response.status,
  });

  return response;
});
