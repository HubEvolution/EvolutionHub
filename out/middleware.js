"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRequest = void 0;
const astro_middleware_1 = require("astro:middleware");
const auth_v2_1 = require("@/lib/auth-v2");
const logger_1 = require("@/server/utils/logger");
const accept_language_1 = require("@/lib/i18n/accept-language");
// Helper: redact sensitive headers and anonymize IPs for logs
function anonymizeIp(value) {
    if (!value)
        return value;
    // handle IPv4 list like "1.2.3.4, 5.6.7.8"
    const parts = value.split(',').map((p) => p.trim());
    const anonymized = parts.map((ip) => {
        // IPv4
        const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (m)
            return `${m[1]}.${m[2]}.${m[3]}.0`;
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
function sanitizeHeaders(h) {
    const obj = {};
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
function generateNonce() {
    try {
        const arr = new Uint8Array(16);
        const cryptoObj = globalThis.crypto;
        cryptoObj?.getRandomValues(arr);
        let s = '';
        for (const b of arr)
            s += String.fromCharCode(b);
        return btoa(s);
    }
    catch {
        return Math.random().toString(36).slice(2);
    }
}
exports.onRequest = (0, astro_middleware_1.defineMiddleware)(async (context, next) => {
    // Generate request ID for tracing
    const requestId = (0, logger_1.generateRequestId)();
    const startTime = Date.now();
    const url = new URL(context.request.url);
    let tAfterSession = startTime;
    let tAfterNext = startTime;
    // Log request start
    (0, logger_1.log)('info', `${context.request.method} ${url.pathname}`, {
        requestId,
        endpoint: url.pathname,
        method: context.request.method,
    });
    // WWW -> Apex Redirect (before auth)
    try {
        const u = new URL(context.request.url);
        if (u.hostname === 'www.hub-evolution.com') {
            u.hostname = 'hub-evolution.com';
            (0, logger_1.log)('info', `WWW redirect: ${u.hostname}`, { requestId });
            return Response.redirect(u.toString(), 301);
        }
    }
    catch (e) {
        (0, logger_1.log)('warn', `URL parse error for redirect check: ${e}`, { requestId });
    }
    // Basic Auth gate removed (was previously here guarding production HTML pages)
    // WWW -> Apex Redirect handled earlier (before Basic Auth)
    // Locale-Handling: Cookie persistieren und neutrale Pfade ggf. umleiten
    const path = url.pathname;
    // In Remote Dev zeigt url.origin auf *.workers.dev. Für lokale UX und korrekte
    // Callback-URLs verwenden wir in Development die BASE_URL aus dem Runtime-Env.
    const cfEnv = context.locals
        ?.runtime?.env;
    const isDevEnv = (cfEnv?.ENVIRONMENT || cfEnv?.NODE_ENV) ===
        'development';
    const isLoopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1';
    const originForRedirects = !isLoopback && isDevEnv && cfEnv?.BASE_URL ? cfEnv.BASE_URL : url.origin;
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
        context.locals.cspNonce = cspNonce;
    }
    catch (e) {
        if (import.meta.env.DEV) {
            (0, logger_1.log)('warn', '[Middleware] Failed to set cspNonce on locals', {
                requestId,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
    }
    // Removed: notify normalization (simplified auth flow redirects directly from callback)
    const LOCALE_PREFIX_RE = /^\/(de|en)(\/|$)/;
    const existingLocale = (() => {
        const m = path.match(LOCALE_PREFIX_RE);
        return m?.[1] ?? null;
    })();
    const cookieName = 'pref_locale';
    let cookieLocale = (() => {
        const v = context.cookies.get(cookieName)?.value;
        return v === 'de' || v === 'en' ? v : null;
    })();
    // Fallback: parse raw Cookie header, in case cookies API misses it (dev quirk)
    if (!cookieLocale) {
        const raw = context.request.headers.get('cookie') || '';
        const match = raw.match(/(?:^|;\s*)pref_locale=(de|en)(?:;|$)/i);
        if (match) {
            cookieLocale = match[1].toLowerCase();
            if (import.meta.env.DEV) {
                (0, logger_1.log)('debug', '[Middleware] Fallback parsed pref_locale from raw header', {
                    requestId,
                    cookieLocale,
                });
            }
        }
    }
    // Session-basierte Splash-Gate: einmal pro Browser-Session anzeigen
    const sessionGateCookie = 'session_welcome_seen';
    let sessionWelcomeSeen = context.cookies.get(sessionGateCookie)?.value === '1';
    if (!sessionWelcomeSeen) {
        const raw = context.request.headers.get('cookie') || '';
        const m = raw.match(/(?:^|;\s*)session_welcome_seen=([^;]+)/i);
        if (m && m[1] === '1') {
            sessionWelcomeSeen = true;
            if (import.meta.env.DEV) {
                (0, logger_1.log)('debug', '[Middleware] Fallback parsed session_welcome_seen from raw header', {
                    requestId,
                });
            }
        }
    }
    function detectFromAcceptLanguage(header) {
        return (0, accept_language_1.pickBestLanguage)(header, 'de');
    }
    // Einfache Bot-/Crawler-Erkennung anhand des User-Agent
    function isBot(userAgent) {
        const ua = (userAgent || '').toLowerCase();
        if (!ua)
            return false;
        return /(bot|crawl|spider|slurp|mediapartners|crawler|facebookexternalhit|whatsapp|telegram|discord|preview|linkchecker)/i.test(ua);
    }
    // Auth-Routen sollen niemals durch das Welcome-Gate unterbrochen werden
    function isAuthRoute(p) {
        // Unterstützt optionale Sprachpräfixe /de/ oder /en/
        // Removed auth/notify from the list; flow no longer uses the route
        const AUTH_RE = /^\/(?:(?:de|en)\/)?(?:login|register|forgot-password|reset-password|verify-email|email-verified|auth\/password-reset-sent)(\/|$)/;
        return AUTH_RE.test(p);
    }
    // Guests dürfen die Imag-Enhancer-Toolrouten direkt nutzen (besserer Funnel)
    // -> Splash-/Welcome-Gate überspringen für diese Routen
    function isGuestAccessibleToolRoute(p) {
        // Optionales Sprachpräfix /de oder /en unterstützen
        const TOOL_RE = /^\/(?:(?:de|en)\/)?tools\/(imag-enhancer|webscraper|prompt-enhancer|voice-visualizer|video-enhancer)(?:\/app)?(?:\/?$)/;
        return TOOL_RE.test(p);
    }
    function isBlogRoute(p) {
        const BLOG_RE = /^\/(?:(?:de|en)\/)?blog(?:\/|$)/;
        return BLOG_RE.test(p);
    }
    // Admin routes should not be locale-prefixed and must bypass gates
    function isAdminRoute(p) {
        const ADMIN_RE = /^\/admin(\/|$)/;
        return ADMIN_RE.test(p);
    }
    // Central guard: routes that should never be gated by the welcome splash
    // Placeholder; actual value assigned after dependencies are declared (isApi, isAsset, isR2Proxy, bot)
    let skipSplash = false;
    const preferredLocale = existingLocale ??
        cookieLocale ??
        detectFromAcceptLanguage(context.request.headers.get('accept-language'));
    // (Entfernt) Unabhängige Benutzerpräferenz war redundant und ungenutzt
    // Helper: bereinigt und parst den next-Parameter sicher (nur gleiche Origin erlaubt)
    function safeParseNext(nextRaw) {
        if (!nextRaw)
            return null;
        try {
            const nextUrl = new URL(nextRaw, url.origin);
            if (nextUrl.origin !== url.origin)
                return null;
            return nextUrl;
        }
        catch {
            return null;
        }
    }
    // Helper: mappt einen Pfad auf Ziel-Locale (ähnlich switchLocalePath)
    function mapPathToLocale(targetLocale, base) {
        const LOCALE_RE = /^\/(de|en)(\/|$)/;
        const pathname = base.pathname.replace(LOCALE_RE, '/');
        const build = (p) => (targetLocale === 'en' ? (p === '/' ? '/en/' : `/en${p}`) : p);
        const targetPath = build(pathname);
        const next = new URL(base.toString());
        // Entferne Steuerparameter
        next.searchParams.delete('set_locale');
        next.searchParams.delete('next');
        return `${targetPath}${next.search}${next.hash}`;
    }
    // Explizite Locale-Auswahl via ?set_locale=de|en -> Cookie setzen und redirect zu gemapptem next
    const setLocaleParam = url.searchParams.get('set_locale') ?? url.searchParams.get('lang');
    if (setLocaleParam === 'de' || setLocaleParam === 'en') {
        const targetLocale = setLocaleParam;
        try {
            context.cookies.set(cookieName, targetLocale, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: url.protocol === 'https:',
                maxAge: 60 * 60 * 24 * 180, // 180 Tage
            });
            // Mark welcome as seen to avoid immediate splash redirects after explicit locale selection
            context.cookies.set('session_welcome_seen', '1', {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: url.protocol === 'https:',
            });
            if (import.meta.env.DEV) {
                (0, logger_1.log)('debug', '[Middleware] pref_locale cookie explicitly set', { requestId, targetLocale });
            }
        }
        catch (e) {
            (0, logger_1.log)('warn', '[Middleware] Failed to explicitly set pref_locale cookie', {
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
                    (0, logger_1.log)('debug', '[Middleware] set_locale loop-guard activated; next pointed to welcome, using fallback', {
                        requestId,
                        fallbackPath,
                        targetLocale,
                    });
                }
            }
        }
        catch (e) {
            if (import.meta.env.DEV) {
                (0, logger_1.log)('warn', '[Middleware] set_locale next parsing failed', {
                    requestId,
                    errorMessage: e instanceof Error ? e.message : String(e),
                });
            }
        }
        const location = `${mapPathToLocale(targetLocale, effectiveNext)}`;
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
                (0, logger_1.log)('debug', '[Middleware] pref_locale cookie synced to URL locale', {
                    requestId,
                    existingLocale,
                });
            }
        }
        catch (e) {
            (0, logger_1.log)('warn', '[Middleware] Failed to sync pref_locale cookie with URL locale', {
                requestId,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
    }
    // Bestimme, ob Redirect vermieden werden soll (APIs/Assets)
    const isApi = path.startsWith('/api/');
    const isAsset = /\.(css|js|mjs|map|svg|png|jpe?g|webp|gif|ico|json|xml|txt|woff2?|ttf|webmanifest)$/i.test(path) ||
        path === '/favicon.ico' ||
        path.startsWith('/assets/') ||
        path.startsWith('/icons/') ||
        path.startsWith('/images/') ||
        path.startsWith('/favicons/');
    // Same treatment for path-based checks further down
    const isR2Proxy = path.startsWith('/r2-ai/');
    const bot = isBot(context.request.headers.get('user-agent'));
    // Now that dependencies are declared, compute the central guard
    skipSplash =
        isApi ||
            isAsset ||
            isR2Proxy ||
            bot ||
            path.startsWith('/welcome') ||
            isAuthRoute(path) ||
            isGuestAccessibleToolRoute(path) ||
            isBlogRoute(path) ||
            isAdminRoute(path);
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
    }
    catch (e) {
        if (import.meta.env.DEV) {
            (0, logger_1.log)('warn', '[Middleware] Failed to parse referer header', {
                requestId,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
    }
    // Frühzeitiger Redirect: neutrale Pfade -> /en/* NUR wenn kein Cookie gesetzt ist, aber Referer EN nahelegt
    const shouldPreferEnByReferer = !cookieLocale && refererSuggestsEn;
    if (!existingLocale &&
        !isApi &&
        !isAsset &&
        !isR2Proxy &&
        shouldPreferEnByReferer &&
        !path.startsWith('/welcome') &&
        !isAuthRoute(path) &&
        !isAdminRoute(path)) {
        const target = path === '/' ? '/en/' : `/en${path}`;
        const location = `${target}${url.search}${url.hash}`;
        const headers = new Headers();
        headers.set('Location', location);
        headers.set('Content-Language', 'en');
        headers.set('Vary', 'Cookie, Accept-Language');
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] Early neutral -> referer suggests EN (no cookie), redirect to EN', { requestId, location });
        }
        return new Response(null, { status: 302, headers });
    }
    const bypassSplash = (() => {
        try {
            const v = (cfEnv && cfEnv['WELCOME_BYPASS_SPLASH']) || '';
            return v === '1' || v === 'true';
        }
        catch {
            return false;
        }
    })();
    if (bypassSplash && !skipSplash && !sessionWelcomeSeen && !cookieLocale && !existingLocale) {
        const best = detectFromAcceptLanguage(context.request.headers.get('accept-language'));
        try {
            context.cookies.set(cookieName, best, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: url.protocol === 'https:',
                maxAge: 60 * 60 * 24 * 180,
            });
        }
        catch { }
        const location = `${mapPathToLocale(best, url)}`;
        const headers = new Headers();
        headers.set('Location', location);
        headers.set('Content-Language', best);
        headers.set('Vary', 'Cookie, Accept-Language');
        return new Response(null, { status: 302, headers });
    }
    // Zeige Splash/Welcome beim ersten sichtbaren Besuch dieser Session
    // Überspringe Splash, wenn bereits ein Locale-Cookie vorhanden ist
    if (!skipSplash && !sessionWelcomeSeen && !cookieLocale && !existingLocale) {
        try {
            // Session-Cookie (kein maxAge) setzen, damit Splash nur einmal pro Session erscheint
            context.cookies.set(sessionGateCookie, '1', {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: url.protocol === 'https:',
            });
            if (import.meta.env.DEV) {
                (0, logger_1.log)('debug', '[Middleware] Session splash gate -> set session_welcome_seen cookie', {
                    requestId,
                });
            }
        }
        catch (e) {
            (0, logger_1.log)('warn', '[Middleware] Failed to set session splash cookie', {
                requestId,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
        const nextParam = `${url.pathname}${url.search}${url.hash}`;
        const location = `/welcome?next=${encodeURIComponent(nextParam)}`;
        const headers = new Headers();
        headers.set('Location', location);
        headers.set('Vary', 'Cookie, Accept-Language');
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] First visible visit this session -> redirect to welcome', {
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
        const target = (() => {
            if (isAdminRoute(pathWithoutDe)) {
                // Always keep admin route neutral
                return pathWithoutDe;
            }
            if (cookieLocale === 'en') {
                return pathWithoutDe === '/' ? '/en/' : `/en${pathWithoutDe}`;
            }
            return pathWithoutDe;
        })();
        const location = `${originForRedirects}${target}${url.search}${url.hash}`;
        const headers = new Headers();
        headers.set('Location', location);
        headers.set('Content-Language', cookieLocale === 'en' ? 'en' : 'de');
        headers.set('Vary', 'Cookie, Accept-Language');
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] Normalize /de/* to canonical', { requestId, location });
        }
        return new Response(null, { status: 308, headers });
    }
    // Bot/Crawler: Splash überspringen; neutrale Pfade anhand Accept-Language für Bots umleiten
    if (bot && !existingLocale && !isApi && !isAsset && !isR2Proxy) {
        const botLocale = detectFromAcceptLanguage(context.request.headers.get('accept-language'));
        if (botLocale === 'en') {
            const target = path === '/' ? '/en/' : `/en${path}`;
            const location = `${target}${url.search}${url.hash}`;
            const headers = new Headers();
            headers.set('Location', location);
            headers.set('Content-Language', 'en');
            headers.set('Vary', 'Cookie, Accept-Language');
            if (import.meta.env.DEV) {
                (0, logger_1.log)('debug', '[Middleware] Bot neutral -> redirect to EN', { requestId, location });
            }
            return new Response(null, { status: 302, headers });
        }
    }
    // Neutrale Pfade nur bei gesetztem Cookie=en auf /en/... umleiten; sonst neutral (DE) belassen
    if (!existingLocale &&
        !isApi &&
        !isAsset &&
        !isR2Proxy &&
        cookieLocale === 'en' &&
        !path.startsWith('/welcome') &&
        !isAuthRoute(path) &&
        !isAdminRoute(path)) {
        const target = path === '/' ? '/en/' : `/en${path}`;
        const location = `${originForRedirects}${target}${url.search}${url.hash}`;
        const headers = new Headers();
        headers.set('Location', location);
        headers.set('Content-Language', 'en');
        headers.set('Vary', 'Cookie, Accept-Language');
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] Neutral path -> cookie=en, redirect to EN', {
                requestId,
                location,
            });
        }
        return new Response(null, { status: 302, headers });
    }
    // Authentifizierung
    if (!context.locals.runtime) {
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] No runtime context available', { requestId });
        }
        context.locals.user = null;
        context.locals.session = null;
    }
    else {
        // Try __Host-session first (stricter, SameSite=Strict), fallback to session_id (SameSite=Lax)
        const sessionId = context.cookies.get('__Host-session')?.value ??
            context.cookies.get('session_id')?.value ??
            null;
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] Session ID from cookie', { requestId, present: !!sessionId });
        }
        if (!sessionId) {
            context.locals.user = null;
            context.locals.session = null;
        }
        else {
            // Session validieren und Locals setzen
            try {
                const { session, user } = await (0, auth_v2_1.validateSession)(context.locals.runtime.env.DB, sessionId);
                if (import.meta.env.DEV) {
                    (0, logger_1.log)('debug', '[Middleware] Session validation result', {
                        requestId,
                        sessionValid: !!session,
                        userValid: !!user,
                    });
                }
                context.locals.session = session;
                context.locals.user = user;
            }
            catch (error) {
                (0, logger_1.log)('error', '[Middleware] Error during session validation', {
                    requestId,
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
                context.locals.session = null;
                context.locals.user = null;
            }
        }
    }
    // mark end of session validation for Server-Timing
    tAfterSession = Date.now();
    if (isAdminRoute(path)) {
        const u = context.locals.user;
        if (!u) {
            const targetLocale = existingLocale ?? preferredLocale;
            const base = targetLocale === 'en' ? '/en/login' : '/login';
            const nextParam = `${url.pathname}${url.search}${url.hash}`;
            const headers = new Headers();
            headers.set('Location', `${base}?next=${encodeURIComponent(nextParam)}`);
            headers.set('Vary', 'Cookie, Accept-Language');
            headers.set('Content-Language', targetLocale);
            return new Response(null, { status: 302, headers });
        }
        try {
            const db = context.locals?.runtime?.env?.DB;
            let role = 'user';
            if (db) {
                const row = await db
                    .prepare('SELECT role FROM users WHERE id = ?')
                    .bind(u.id)
                    .first();
                role = row?.role || 'user';
            }
            if (role !== 'admin') {
                const targetLocale = existingLocale ?? preferredLocale;
                const base = targetLocale === 'en' ? '/en/dashboard' : '/dashboard';
                const headers = new Headers();
                headers.set('Location', base);
                headers.set('Vary', 'Cookie, Accept-Language');
                headers.set('Content-Language', targetLocale);
                return new Response(null, { status: 302, headers });
            }
        }
        catch { }
    }
    // Early redirect (after session validation): if user exists and path is a login route, redirect to dashboard
    try {
        const user = context.locals.user;
        const isLoginRoute = (p) => {
            const LOGIN_RE = /^\/(?:(?:de|en)\/)?login(?:\/?|$)/;
            return LOGIN_RE.test(p);
        };
        if (user && isLoginRoute(path)) {
            const targetLocale = existingLocale ?? preferredLocale;
            const base = targetLocale === 'en' ? '/en/dashboard' : '/dashboard';
            const location = `${base}`;
            const headers = new Headers();
            headers.set('Location', location);
            headers.set('Vary', 'Cookie, Accept-Language');
            headers.set('Content-Language', targetLocale);
            return new Response(null, { status: 302, headers });
        }
    }
    catch (e) {
        (0, logger_1.log)('warn', '[Middleware] Early login redirect check failed', {
            requestId,
            errorMessage: e instanceof Error ? e.message : String(e),
        });
    }
    // Verification gate: redirect unverifizierte Nutzer vom Dashboard zu /verify-email
    try {
        const user = context.locals.user;
        const isDashboardRoute = (p) => {
            const DASH_RE = /^\/(?:(?:de|en)\/)?.*dashboard(\/|$)/;
            return DASH_RE.test(p);
        };
        const isVerifyEmailRoute = (p) => {
            const VE_RE = /^\/(?:(?:de|en)\/)?.*verify-email(\/|$)/;
            return VE_RE.test(p);
        };
        if (user &&
            user.email_verified === false &&
            isDashboardRoute(path) &&
            !isVerifyEmailRoute(path)) {
            const targetLocale = existingLocale ?? preferredLocale;
            const base = targetLocale === 'en' ? '/en/verify-email' : '/verify-email';
            const params = new URLSearchParams();
            if (user.email)
                params.set('email', user.email);
            const location = `${base}${params.toString() ? `?${params.toString()}` : ''}`;
            const headers = new Headers();
            headers.set('Location', location);
            headers.set('Vary', 'Cookie, Accept-Language');
            headers.set('Content-Language', targetLocale);
            if (import.meta.env.DEV) {
                (0, logger_1.log)('debug', '[Middleware] Unverified user -> redirect to verify-email', {
                    requestId,
                    location,
                });
            }
            return new Response(null, { status: 302, headers });
        }
    }
    catch (e) {
        (0, logger_1.log)('warn', '[Middleware] Verification gate check failed', {
            requestId,
            errorMessage: e instanceof Error ? e.message : String(e),
        });
    }
    // Führe den nächsten Middleware-Schritt aus
    let response = await next();
    tAfterNext = Date.now();
    // Ensure mutable headers: some response objects (e.g., redirects) can have immutable headers.
    // Clone headers and re-wrap the response so all subsequent `headers.set` calls succeed.
    try {
        const cloned = new Headers(response.headers);
        response = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: cloned,
        });
    }
    catch {
        // Best-effort: if cloning fails, continue; subsequent header sets may throw in rare cases.
    }
    // Detailliertes Response-Logging (nur DEV), mit Redaction
    if (import.meta.env.DEV) {
        const redacted = sanitizeHeaders(response.headers);
        (0, logger_1.log)('debug', '[Middleware] Outgoing response', {
            requestId,
            status: response.status,
            statusText: response.statusText,
            headers: redacted,
        });
    }
    // MIME-Typ-Korrektur für Assets
    if (import.meta.env.DEV) {
        (0, logger_1.log)('debug', '[Middleware] Processing path', { requestId, path });
    }
    // Setze MIME-Typen für verschiedene Dateitypen
    if (path.endsWith('.css')) {
        // Geänderte Bedingung: Alle .css-Dateien berücksichtigen
        response.headers.set('Content-Type', 'text/css');
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] Set Content-Type to text/css for CSS file', { requestId });
        }
    }
    else if (path.endsWith('.js')) {
        response.headers.set('Content-Type', 'application/javascript');
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] Set Content-Type to application/javascript for JS file', {
                requestId,
            });
        }
    }
    else if (path.endsWith('.svg')) {
        response.headers.set('Content-Type', 'image/svg+xml');
        if (import.meta.env.DEV) {
            (0, logger_1.log)('debug', '[Middleware] Set Content-Type to image/svg+xml for SVG file', { requestId });
        }
    }
    // Content-Language & Vary Header setzen
    const effectiveLocale = existingLocale ?? preferredLocale;
    response.headers.set('Content-Language', effectiveLocale);
    const existingVary = response.headers.get('Vary') || '';
    const varyParts = new Set(existingVary
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean));
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
    }
    catch {
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
    const envFlagDev = !!(cfEnv &&
        (cfEnv.ENVIRONMENT === 'development' ||
            cfEnv.NODE_ENV === 'development'));
    const __devLike = import.meta.env.DEV ||
        import.meta.env.MODE === 'development' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === 'localhost' ||
        url.hostname === '::1' ||
        envFlagDev;
    if (__devLike) {
        const devCsp = [
            "default-src 'self' data: blob:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com",
            "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com",
            "connect-src 'self' ws: http: https:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
            "img-src 'self' data: blob: https:",
            "font-src 'self' https://fonts.gstatic.com",
            "frame-src 'self' https://challenges.cloudflare.com",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
        ].join('; ');
        response.headers.set('Content-Security-Policy', devCsp);
    }
    else {
        // Use strict nonce-based CSP only when ENVIRONMENT === 'production'.
        // Cloudflare sets NODE_ENV='production' even for preview/testing, so we MUST NOT rely on NODE_ENV here.
        const isProduction = !!(cfEnv && cfEnv.ENVIRONMENT === 'production');
        // Important: In non-production we must NOT include a nonce together with 'unsafe-inline'.
        // Browsers ignore 'unsafe-inline' when a nonce or hash is present, which would still block inline scripts.
        // Therefore:
        // - Production: strict nonce-based policy with 'strict-dynamic'.
        // - Non-production: relaxed policy with 'unsafe-inline' and 'unsafe-eval' (no nonce, no strict-dynamic).
        const csp = (isProduction
            ? [
                "default-src 'self'",
                `script-src 'self' 'nonce-${cspNonce}' https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
                `script-src-elem 'self' 'nonce-${cspNonce}' https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
                "connect-src 'self' https: wss:",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
                "img-src 'self' data: blob: https:",
                "font-src 'self' https://fonts.gstatic.com",
                "frame-src 'self' https://challenges.cloudflare.com",
                "frame-ancestors 'self'",
                "object-src 'none'",
                "base-uri 'self'",
                'report-uri /api/csp-report',
            ]
            : [
                "default-src 'self' data: blob:",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com",
                "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com",
                "connect-src 'self' ws: http: https:",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
                "img-src 'self' data: blob: https:",
                "font-src 'self' https://fonts.gstatic.com",
                "frame-src 'self' https://challenges.cloudflare.com",
                "frame-ancestors 'self'",
                "object-src 'none'",
                "base-uri 'self'",
                'report-uri /api/csp-report',
            ]).join('; ');
        response.headers.set('Content-Security-Policy', csp);
    }
    // Route-scoped CSP relaxation for Video Enhancer: allow blob: media for client-side duration detection
    try {
        const vePaths = /^\/(?:(?:de|en)\/)?tools\/video-enhancer(?:\/app)?\/?$/;
        if (vePaths.test(path)) {
            const current = response.headers.get('Content-Security-Policy') || '';
            const parts = current
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean);
            let hasMedia = false;
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].toLowerCase().startsWith('media-src ')) {
                    hasMedia = true;
                    if (!/\bblob:\b/.test(parts[i])) {
                        parts[i] = parts[i] + ' blob:';
                    }
                    if (!/\b'self'\b/.test(parts[i])) {
                        parts[i] = parts[i] + " 'self'";
                    }
                    break;
                }
            }
            if (!hasMedia) {
                parts.push("media-src 'self' blob:");
            }
            response.headers.set('Content-Security-Policy', parts.join('; '));
        }
    }
    catch {
        // best-effort; keep original CSP if anything goes wrong
    }
    // In Production: augment CSP with sha256-hashes of inline scripts (e.g., Astro runtime)
    try {
        const isProduction = !!(cfEnv && cfEnv.ENVIRONMENT === 'production');
        const ct0 = response.headers.get('Content-Type') || '';
        const hasStrictNonce = (response.headers.get('Content-Security-Policy') || '').includes("script-src 'self' 'nonce-");
        if (isProduction && ct0.includes('text/html') && hasStrictNonce) {
            // Read body from a clone to avoid consuming the original response stream
            const clonedForHash = response.clone();
            const html = await clonedForHash.text();
            // Helper: compute sha256 base64
            async function sha256Base64(input) {
                const enc = new TextEncoder().encode(input);
                const digest = await crypto.subtle.digest('SHA-256', enc);
                const bytes = new Uint8Array(digest);
                let bin = '';
                for (let i = 0; i < bytes.length; i++)
                    bin += String.fromCharCode(bytes[i]);
                return btoa(bin);
            }
            // Extract inline scripts without nonce/src and non-JSON types
            const hashes = [];
            const re = /<script(?![^>]*\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi;
            let m;
            while ((m = re.exec(html))) {
                const attrs = m[1] || '';
                const hasNonce = /\bnonce\s*=/.test(attrs);
                const typeMatch = attrs.match(/\btype\s*=\s*(["'])([^"']+)\1/i);
                const type = typeMatch ? typeMatch[2].toLowerCase() : 'text/javascript';
                if (hasNonce)
                    continue;
                if (type.startsWith('application/ld+json') || type.startsWith('application/json'))
                    continue;
                const code = m[2] || '';
                if (!code)
                    continue;
                // Compute hash and collect
                const h = await sha256Base64(code);
                hashes.push(`'sha256-${h}'`);
            }
            if (hashes.length > 0) {
                const current = response.headers.get('Content-Security-Policy') || '';
                const appendToDirective = (csp, dir) => {
                    const parts = csp.split(';').map((s) => s.trim());
                    for (let i = 0; i < parts.length; i++) {
                        if (parts[i].toLowerCase().startsWith(dir + ' ')) {
                            const existing = parts[i];
                            const add = hashes.filter((h) => !existing.includes(h)).join(' ');
                            parts[i] = add ? existing + ' ' + add : existing;
                            break;
                        }
                    }
                    return parts.join('; ');
                };
                let nextCsp = current;
                nextCsp = appendToDirective(nextCsp, 'script-src');
                nextCsp = appendToDirective(nextCsp, 'script-src-elem');
                // Rebuild response with same HTML body and updated CSP
                const newHeaders = new Headers(response.headers);
                newHeaders.set('Content-Security-Policy', nextCsp);
                response = new Response(html, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            }
        }
    }
    catch {
        // Best-effort: if hashing fails, keep original response/CSP
    }
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('X-Frame-Options', 'DENY');
    // Add missing headers for HTML responses (previously only on API routes)
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    // Route-scoped override: allow microphone on voice-visualizer tool pages only
    try {
        const voicePaths = /^\/(?:(?:de|en)\/)?tools\/voice-visualizer(?:\/app)?\/?$/;
        if (voicePaths.test(path)) {
            const base = response.headers.get('Permissions-Policy') || '';
            response.headers.set('Permissions-Policy', base.replace(/microphone=\(\)/, 'microphone=(self)'));
        }
    }
    catch {
        // Ignore header setting failures
    }
    const ct = response.headers.get('Content-Type') || '';
    if (ct.includes('text/html') && !response.headers.has('Referrer-Policy')) {
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
    // Global: Disable caching for HTML to avoid stale index pages (keep assets long-cacheable)
    try {
        if (ct.includes('text/html')) {
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            response.headers.set('Pragma', 'no-cache');
            response.headers.set('Expires', '0');
        }
    }
    catch { }
    // Referrer-Policy nur auf Reset-Passwort-Seiten erzwingen (keine Weitergabe sensibler Token über Referrer)
    const isResetPasswordPath = path === '/reset-password' ||
        path === '/reset-password/' ||
        path === '/de/reset-password' ||
        path === '/de/reset-password/' ||
        path === '/en/reset-password' ||
        path === '/en/reset-password/';
    if (isResetPasswordPath) {
        response.headers.set('Referrer-Policy', 'no-referrer');
    }
    try {
        const durSession = Math.max(0, tAfterSession - startTime);
        const durRender = Math.max(0, tAfterNext - tAfterSession);
        const durTotal = Math.max(0, tAfterNext - startTime);
        const existing = response.headers.get('Server-Timing');
        const value = `session;dur=${durSession}, render;dur=${durRender}, total;dur=${durTotal}`;
        response.headers.set('Server-Timing', existing ? `${existing}, ${value}` : value);
    }
    catch { }
    // Log response with timing
    const duration = Date.now() - startTime;
    (0, logger_1.log)('info', `${context.request.method} ${url.pathname} -> ${response.status}`, {
        requestId,
        duration,
        status: response.status,
    });
    return response;
});
