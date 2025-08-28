import { defineMiddleware } from 'astro:middleware';
import type { Locale } from '@/lib/i18n';
import { validateSession } from '@/lib/auth-v2';

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
  // Detailliertes Request-Logging (nur DEV), mit Redaction
  if (import.meta.env.DEV) {
    console.log('[Middleware] Incoming request:', {
      url: context.request.url,
      method: context.request.method,
      headers: sanitizeHeaders(context.request.headers),
    });
  }

  // WWW -> Apex Redirect (Fallback zu Cloudflare Redirect Rules)
  try {
    const u = new URL(context.request.url);
    if (u.hostname === 'www.hub-evolution.com') {
      u.hostname = 'hub-evolution.com';
      return Response.redirect(u.toString(), 301);
    }
  } catch (e) {
    console.warn('[Middleware] URL parse error for redirect check:', e);
  }

  // Locale-Handling: Cookie persistieren und neutrale Pfade ggf. umleiten
  const url = new URL(context.request.url);
  const path = url.pathname;

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
      console.warn('[Middleware] Failed to set cspNonce on locals:', e);
    }
  }

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
        console.log('[Middleware] Fallback parsed pref_locale from raw header:', cookieLocale);
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
    return /(bot|crawl|spider|slurp|mediapartners|crawler|facebookexternalhit|whatsapp|telegram|discord|preview|linkchecker)/i.test(ua);
  }

  // Auth-Routen sollen niemals durch das Welcome-Gate unterbrochen werden
  function isAuthRoute(p: string): boolean {
    // Unterstützt optionale Sprachpräfixe /de/ oder /en/
    const AUTH_RE = /^\/(?:(?:de|en)\/)?(?:login|register|forgot-password|reset-password|verify-email|email-verified|auth\/password-reset-sent)(\/|$)/;
    return AUTH_RE.test(p);
  }

  const preferredLocale: Locale = existingLocale
    ?? cookieLocale
    ?? detectFromAcceptLanguage(context.request.headers.get('accept-language'));

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
    const build = (p: string) => targetLocale === 'en' ? (p === '/' ? '/en/' : `/en${p}`) : p;
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
        console.log('[Middleware] pref_locale cookie explicitly set to', targetLocale);
      }
    } catch (e) {
      console.warn('[Middleware] Failed to explicitly set pref_locale cookie:', e);
    }

    const nextUrl = safeParseNext(url.searchParams.get('next')) ?? url;
    const location = `${url.origin}${mapPathToLocale(targetLocale, nextUrl)}`;
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
        console.log('[Middleware] pref_locale cookie synced to URL locale', existingLocale);
      }
    } catch (e) {
      console.warn('[Middleware] Failed to sync pref_locale cookie with URL locale:', e);
    }
  }

  // Bestimme, ob Redirect vermieden werden soll (APIs/Assets)
  const isApi = path.startsWith('/api/');
  const isAsset = /\.(css|js|mjs|map|svg|png|jpe?g|webp|gif|ico|json|xml|txt|woff2?|ttf)$/i.test(path)
    || path === '/favicon.ico'
    || path.startsWith('/assets/')
    || path.startsWith('/icons/')
    || path.startsWith('/images/');

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

  // Frühzeitiger Redirect: neutrale Pfade -> /en/* wenn cookie=en vorhanden
  if (!existingLocale && !isApi && !isAsset && (cookieLocale === 'en' || refererSuggestsEn) && !path.startsWith('/welcome') && !isAuthRoute(path)) {
    const target = path === '/' ? '/en/' : `/en${path}`;
    const location = `${url.origin}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', 'en');
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      console.log('[Middleware] Early neutral -> cookie=en, redirect to EN:', location);
    }
    return new Response(null, { status: 302, headers });
  }

  // Zeige Splash/Welcome beim ersten sichtbaren Besuch dieser Session
  // Überspringe Splash, wenn bereits ein Locale-Cookie vorhanden ist
  if (!sessionWelcomeSeen && !cookieLocale && !isApi && !isAsset && !bot && !path.startsWith('/welcome') && !isAuthRoute(path) && !existingLocale) {
    try {
      // Session-Cookie (kein maxAge) setzen, damit Splash nur einmal pro Session erscheint
      context.cookies.set(sessionGateCookie, '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
      });
      if (import.meta.env.DEV) {
        console.log('[Middleware] Session splash gate -> set session_welcome_seen cookie');
      }
    } catch (e) {
      console.warn('[Middleware] Failed to set session splash cookie:', e);
    }
    const location = `${url.origin}/welcome?next=${encodeURIComponent(url.toString())}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      console.log('[Middleware] First visible visit this session -> redirect to welcome:', location);
    }
    return new Response(null, { status: 302, headers });
  }

  // Erste Besuche (kein Cookie, kein Locale in URL, kein Bot) -> Splash/Welcome mit next
  // Respektiere Session-Gate, um doppelte Redirects zu vermeiden
  if (!sessionWelcomeSeen && !cookieLocale && !existingLocale && !isApi && !isAsset && !bot && !path.startsWith('/welcome') && !isAuthRoute(path)) {
    const location = `${url.origin}/welcome?next=${encodeURIComponent(url.toString())}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      console.log('[Middleware] First visit -> redirect to welcome:', location);
    }
    return new Response(null, { status: 302, headers });
  }

  // Fallback: /de/* -> nur zu /en/* normalisieren, wenn explizit cookie=en gesetzt ist
  // Änderung: Auth-Routen NIE normalisieren, damit Locale stabil bleibt (Option B)
  const isDePrefixed = path === '/de' || path.startsWith('/de/');
  if (isDePrefixed && !isApi && !isAsset && !isAuthRoute(path) && cookieLocale === 'en') {
    const pathWithoutDe = path.replace(/^\/de(\/|$)/, '/');
    const target = (pathWithoutDe === '/' ? '/en/' : `/en${pathWithoutDe}`);
    const location = `${url.origin}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', 'en');
    const vary = 'Cookie, Accept-Language';
    headers.set('Vary', vary);
    if (import.meta.env.DEV) {
      console.log('[Middleware] Redirecting /de-prefixed path to', location);
    }
    return new Response(null, { status: 308, headers });
  }

  // Symmetrischer Schutz: Auth-Routen unter /en/* niemals normalisieren
  // (Expliziter Guard für zukünftige Erweiterungen; derzeit keine EN-Normalisierung aktiv.)
  const isEnPrefixed = path === '/en' || path.startsWith('/en/');
  if (isEnPrefixed && isAuthRoute(path)) {
    // no-op: bewusst keine Normalisierung für Auth-Routen unter /en/*
  }

  // Bot/Crawler: Splash überspringen; neutrale Pfade anhand Accept-Language für Bots umleiten
  if (bot && !existingLocale && !isApi && !isAsset) {
    const botLocale = detectFromAcceptLanguage(context.request.headers.get('accept-language'));
    if (botLocale === 'en') {
      const target = path === '/' ? '/en/' : `/en${path}`;
      const location = `${url.origin}${target}${url.search}${url.hash}`;
      const headers = new Headers();
      headers.set('Location', location);
      headers.set('Content-Language', 'en');
      headers.set('Vary', 'Cookie, Accept-Language');
      if (import.meta.env.DEV) {
        console.log('[Middleware] Bot neutral -> redirect to EN:', location);
      }
      return new Response(null, { status: 302, headers });
    }
  }

  // Neutrale Pfade nur bei gesetztem Cookie=en auf /en/... umleiten; sonst neutral (DE) belassen
  if (!existingLocale && !isApi && !isAsset && cookieLocale === 'en' && !path.startsWith('/welcome') && !isAuthRoute(path)) {
    const target = path === '/' ? '/en/' : `/en${path}`;
    const location = `${url.origin}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', 'en');
    headers.set('Vary', 'Cookie, Accept-Language');
    if (import.meta.env.DEV) {
      console.log('[Middleware] Neutral path -> cookie=en, redirect to EN:', location);
    }
    return new Response(null, { status: 302, headers });
  }

  // Authentifizierung
  if (!context.locals.runtime) {
    if (import.meta.env.DEV) {
      console.log('[Middleware] No runtime context available');
    }
    context.locals.user = null;
    context.locals.session = null;
  } else {
    const sessionId = context.cookies.get('session_id')?.value ?? null;
    if (import.meta.env.DEV) {
      console.log('[Middleware] Session ID from cookie:', sessionId ? 'Present' : 'Not present');
    }

    if (!sessionId) {
      context.locals.user = null;
      context.locals.session = null;
    } else {
      // Session validieren und Locals setzen
      try {
        const { session, user } = await validateSession(context.locals.runtime.env.DB, sessionId);
        if (import.meta.env.DEV) {
          console.log('[Middleware] Session validation result:', {
            sessionValid: !!session,
            userValid: !!user,
          });
        }

        context.locals.session = session;
        context.locals.user = user;
      } catch (error) {
        console.error('[Middleware] Error during session validation:', error);
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
    if (user && user.email_verified === false && isDashboardRoute(path) && !isVerifyEmailRoute(path)) {
      const targetLocale: Locale = existingLocale ?? preferredLocale;
      const base = targetLocale === 'en' ? '/en/verify-email' : '/verify-email';
      const params = new URLSearchParams();
      if (user.email) params.set('email', user.email);
      const location = `${url.origin}${base}${params.toString() ? `?${params.toString()}` : ''}`;
      const headers = new Headers();
      headers.set('Location', location);
      headers.set('Vary', 'Cookie, Accept-Language');
      headers.set('Content-Language', targetLocale);
      if (import.meta.env.DEV) {
        console.log('[Middleware] Unverified user -> redirect to verify-email:', { location });
      }
      return new Response(null, { status: 302, headers });
    }
  } catch (e) {
    console.warn('[Middleware] Verification gate check failed:', e);
  }
  
  // Führe den nächsten Middleware-Schritt aus
  const response = await next();
  
  // Detailliertes Response-Logging (nur DEV), mit Redaction
  if (import.meta.env.DEV) {
    const redacted = sanitizeHeaders(response.headers as unknown as Headers);
    console.log('[Middleware] Outgoing response:', {
      status: response.status,
      statusText: response.statusText,
      headers: redacted,
    });
  }
  
  // MIME-Typ-Korrektur für Assets
  if (import.meta.env.DEV) {
    console.log('[Middleware] Processing path:', path);
  }
  
  // Setze MIME-Typen für verschiedene Dateitypen
  if (path.endsWith('.css')) { // Geänderte Bedingung: Alle .css-Dateien berücksichtigen
    response.headers.set('Content-Type', 'text/css');
    if (import.meta.env.DEV) {
      console.log('[Middleware] Set Content-Type to text/css for CSS file');
    }
  } else if (path.endsWith('.js')) {
    response.headers.set('Content-Type', 'application/javascript');
    if (import.meta.env.DEV) {
      console.log('[Middleware] Set Content-Type to application/javascript for JS file');
    }
  } else if (path.endsWith('.svg')) {
    response.headers.set('Content-Type', 'image/svg+xml');
    if (import.meta.env.DEV) {
      console.log('[Middleware] Set Content-Type to image/svg+xml for SVG file');
    }
  }
  
  // Content-Language & Vary Header setzen
  const effectiveLocale: Locale = existingLocale ?? preferredLocale;
  response.headers.set('Content-Language', effectiveLocale);
  const existingVary = response.headers.get('Vary') || '';
  const varyParts = new Set(existingVary.split(',').map((v: string) => v.trim()).filter(Boolean));
  varyParts.add('Cookie');
  varyParts.add('Accept-Language');
  response.headers.set('Vary', Array.from(varyParts).join(', '));

  // Sicherheits-Header hinzufügen
  // X-Robots-Tag for welcome page (HTTP-level noindex)
  if (path === '/welcome') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  // CSP: relax in development for Astro/Vite HMR and inline module scripts; strict in production
  // Wrangler "dev" runs a built worker, so import.meta.env.DEV can be false.
  // Treat localhost/127.0.0.1 as development to keep relaxed CSP during local E2E/dev.
  const __devLike = import.meta.env.DEV || url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  if (__devLike) {
    const devCsp = [
      "default-src 'self' data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io",
      "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io",
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
    const prodCsp = [
      "default-src 'self'",
      // Allow inline scripts only with our per-request nonce; include strict-dynamic for modern browsers
      `script-src 'self' 'nonce-${cspNonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io`,
      // Optional: also set script-src-elem explicitly for broader compatibility
      `script-src-elem 'self' 'nonce-${cspNonce}' https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io`,
      // Allow connections to same-origin and HTTPS (and websockets if used)
      "connect-src 'self' https: wss:",
      // Styles keep 'unsafe-inline' to support inline <style is:global> blocks and third-party CSS
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "report-uri /api/csp-report",
    ].join('; ');
    response.headers.set('Content-Security-Policy', prodCsp);
  }
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  // Referrer-Policy nur auf Reset-Passwort-Seiten erzwingen (keine Weitergabe sensibler Token über Referrer)
  const isResetPasswordPath =
    path === '/reset-password' || path === '/reset-password/' ||
    path === '/de/reset-password' || path === '/de/reset-password/' ||
    path === '/en/reset-password' || path === '/en/reset-password/';
  if (isResetPasswordPath) {
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  if (import.meta.env.DEV) {
    console.log('[Middleware] Security headers applied.');
  }
  return response;
});