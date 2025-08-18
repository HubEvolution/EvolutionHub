import { defineMiddleware } from 'astro:middleware';
import type { Locale } from '@/lib/i18n';

export const onRequest = defineMiddleware(async (context, next) => {
  // Detaillierte Request-Logging
  console.log('[Middleware] Incoming request:', {
    url: context.request.url,
    method: context.request.method,
    headers: Object.fromEntries(context.request.headers.entries()),
  });

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

  const LOCALE_PREFIX_RE = /^\/(de|en)(\/|$)/;
  const existingLocale = (() => {
    const m = path.match(LOCALE_PREFIX_RE);
    return (m?.[1] as Locale) ?? null;
  })();

  const cookieName = 'pref_locale';
  const cookieLocale = ((): Locale | null => {
    const v = context.cookies.get(cookieName)?.value;
    return v === 'de' || v === 'en' ? (v as Locale) : null;
  })();

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

  const preferredLocale: Locale = existingLocale
    ?? cookieLocale
    ?? detectFromAcceptLanguage(context.request.headers.get('accept-language'));

  // Unabhängige Benutzerpräferenz (ignoriert bestehende URL-Locale)
  const userPreferredLocale: Locale = cookieLocale
    ?? detectFromAcceptLanguage(context.request.headers.get('accept-language'));

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
      console.log('[Middleware] pref_locale cookie explicitly set to', targetLocale);
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
      console.log('[Middleware] pref_locale cookie synced to URL locale', existingLocale);
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

  // Zeige Splash/Welcome beim ersten sichtbaren Besuch dieser Session
  if (!sessionWelcomeSeen && !isApi && !isAsset && !bot && !path.startsWith('/welcome')) {
    try {
      // Session-Cookie (kein maxAge) setzen, damit Splash nur einmal pro Session erscheint
      context.cookies.set(sessionGateCookie, '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
      });
      console.log('[Middleware] Session splash gate -> set session_welcome_seen cookie');
    } catch (e) {
      console.warn('[Middleware] Failed to set session splash cookie:', e);
    }
    const location = `${url.origin}/welcome?next=${encodeURIComponent(url.toString())}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Vary', 'Cookie, Accept-Language');
    console.log('[Middleware] First visible visit this session -> redirect to welcome:', location);
    return new Response(null, { status: 302, headers });
  }

  // Erste Besuche (kein Cookie, kein Locale in URL, kein Bot) -> Splash/Welcome mit next
  if (!cookieLocale && !existingLocale && !isApi && !isAsset && !bot && !path.startsWith('/welcome')) {
    const location = `${url.origin}/welcome?next=${encodeURIComponent(url.toString())}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Vary', 'Cookie, Accept-Language');
    console.log('[Middleware] First visit -> redirect to welcome:', location);
    return new Response(null, { status: 302, headers });
  }

  // Fallback: /de/* -> neutral bzw. /en/* je nach bevorzugter Locale
  const isDePrefixed = path === '/de' || path.startsWith('/de/');
  if (isDePrefixed && !isApi && !isAsset) {
    const pathWithoutDe = path.replace(/^\/de(\/|$)/, '/');
    const target = userPreferredLocale === 'en'
      ? (pathWithoutDe === '/' ? '/en/' : `/en${pathWithoutDe}`)
      : pathWithoutDe;
    const location = `${url.origin}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', userPreferredLocale);
    const vary = 'Cookie, Accept-Language';
    headers.set('Vary', vary);
    console.log('[Middleware] Redirecting /de-prefixed path to', location);
    return new Response(null, { status: 308, headers });
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
      console.log('[Middleware] Bot neutral -> redirect to EN:', location);
      return new Response(null, { status: 302, headers });
    }
  }

  // Neutrale Pfade nur bei gesetztem Cookie=en auf /en/... umleiten; sonst neutral (DE) belassen
  if (!existingLocale && !isApi && !isAsset && cookieLocale === 'en' && !path.startsWith('/welcome')) {
    const target = path === '/' ? '/en/' : `/en${path}`;
    const location = `${url.origin}${target}${url.search}${url.hash}`;
    const headers = new Headers();
    headers.set('Location', location);
    headers.set('Content-Language', 'en');
    headers.set('Vary', 'Cookie, Accept-Language');
    console.log('[Middleware] Neutral path -> cookie=en, redirect to EN:', location);
    return new Response(null, { status: 302, headers });
  }

  // Authentifizierung
  if (!context.locals.runtime) {
    console.log('[Middleware] No runtime context available');
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }
  
  const sessionId = context.cookies.get('session_id')?.value ?? null;
  console.log('[Middleware] Session ID from cookie:', sessionId ? 'Present' : 'Not present');

  if (!sessionId) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }

  // TEMPORÄR DEAKTIVIERT FÜR UI-TESTS
  // try {
  //   const { session, user } = await validateSession(context.locals.runtime.env.DB, sessionId);
  //   console.log('[Middleware] Session validation result:', {
  //     sessionValid: !!session,
  //     userValid: !!user,
  //   });

  //   context.locals.session = session;
  //   context.locals.user = user;
  // } catch (error) {
  //   console.error('[Middleware] Error during session validation:', error);
  //   context.locals.session = null;
  //   context.locals.user = null;
  // }
  
  // User und Session bereits auf null gesetzt (siehe oben)
  
  // Führe den nächsten Middleware-Schritt aus
  const response = await next();
  
  // Detaillierte Response-Logging
  console.log('[Middleware] Outgoing response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
  });
  
  // MIME-Typ-Korrektur für Assets
  console.log('[Middleware] Processing path:', path);
  
  // Setze MIME-Typen für verschiedene Dateitypen
  if (path.endsWith('.css')) { // Geänderte Bedingung: Alle .css-Dateien berücksichtigen
    response.headers.set('Content-Type', 'text/css');
    console.log('[Middleware] Set Content-Type to text/css for CSS file');
  } else if (path.endsWith('.js')) {
    response.headers.set('Content-Type', 'application/javascript');
    console.log('[Middleware] Set Content-Type to application/javascript for JS file');
  } else if (path.endsWith('.svg')) {
    response.headers.set('Content-Type', 'image/svg+xml');
    console.log('[Middleware] Set Content-Type to image/svg+xml for SVG file');
  }
  
  // Content-Language & Vary Header setzen
  const effectiveLocale: Locale = existingLocale ?? preferredLocale;
  response.headers.set('Content-Language', effectiveLocale);
  const existingVary = response.headers.get('Vary') || '';
  const varyParts = new Set(existingVary.split(',').map((v) => v.trim()).filter(Boolean));
  varyParts.add('Cookie');
  varyParts.add('Accept-Language');
  response.headers.set('Vary', Array.from(varyParts).join(', '));

  // Sicherheits-Header hinzufügen
  // X-Robots-Tag for welcome page (HTTP-level noindex)
  if (path === '/welcome') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; report-uri /csp-report;");
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
  console.log('[Middleware] Security headers applied.');
  return response;
});