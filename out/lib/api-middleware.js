"use strict";
/**
 * API-Middleware für einheitliche Fehlerbehandlung, Rate-Limiting und Security-Headers
 *
 * Diese Middleware kann in API-Endpunkten verwendet werden, um gemeinsame
 * Funktionalitäten wie Fehlerbehandlung, Rate-Limiting und Security-Headers
 * zu zentralisieren.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySecurityHeaders = applySecurityHeaders;
exports.createMethodNotAllowed = createMethodNotAllowed;
exports.createApiError = createApiError;
exports.createApiSuccess = createApiSuccess;
exports.withApiMiddleware = withApiMiddleware;
exports.withAuthApiMiddleware = withAuthApiMiddleware;
exports.withRedirectMiddleware = withRedirectMiddleware;
const rate_limiter_1 = require("@/lib/rate-limiter");
const logger_factory_1 = require("@/server/utils/logger-factory");
// Logger-Instanzen erstellen
const securityLogger = logger_factory_1.loggerFactory.createSecurityLogger();
const logger = logger_factory_1.loggerFactory.createLogger('api-middleware');
/**
 * Wendet Sicherheits-Header auf eine Response an, um die Anwendung vor
 * verschiedenen Sicherheitsbedrohungen zu schützen.
 *
 * @param response - Die Response, auf die die Sicherheitsheader angewendet werden sollen
 * @returns Die Response mit angewendeten Sicherheitsheadern
 */
function applySecurityHeaders(response) {
    // Some framework-generated responses (e.g., redirects) may have immutable headers.
    // Clone headers, set security headers on the clone, and return a new Response preserving body/status.
    const headers = new Headers(response.headers);
    // Hinweis: CSP wird zentral in der globalen Middleware (src/middleware.ts) gesetzt.
    // API-Antworten (JSON) benötigen keine CSP und sollten diese nicht überschreiben.
    // X-Content-Type-Options
    headers.set('X-Content-Type-Options', 'nosniff');
    // X-Frame-Options
    headers.set('X-Frame-Options', 'DENY');
    // Referrer-Policy
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Strict-Transport-Security (with preload to match global middleware)
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // Permissions-Policy
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
/**
 * Hilfsfunktion: Erzeugt eine 405-Response im standardisierten Fehlerformat
 * und setzt den Allow-Header entsprechend.
 */
function createMethodNotAllowed(allow, message = 'Method Not Allowed') {
    const body = {
        success: false,
        error: {
            type: 'method_not_allowed',
            message,
        },
    };
    return new Response(JSON.stringify(body), {
        status: errorStatusCodes['method_not_allowed'],
        headers: {
            'Content-Type': 'application/json',
            Allow: allow,
        },
    });
}
// Interne Helper
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
function normalizeOrigin(value) {
    if (!value)
        return null;
    try {
        const u = new URL(value);
        return `${u.protocol}//${u.host}`;
    }
    catch {
        // value könnte bereits eine Origin sein (z. B. "https://example.com"), versuche als URL mit Pfad
        try {
            const u2 = new URL(value, value.startsWith('http') ? value : `https://${value}`);
            return `${u2.protocol}//${u2.host}`;
        }
        catch {
            return null;
        }
    }
}
function extractOriginFromHeaders(request) {
    const origin = request.headers.get('origin');
    if (origin)
        return normalizeOrigin(origin);
    const referer = request.headers.get('referer');
    if (!referer)
        return null;
    try {
        const u = new URL(referer);
        return `${u.protocol}//${u.host}`;
    }
    catch {
        return null;
    }
}
function getEnvAllowedOrigins(context) {
    try {
        const env = context.locals?.runtime?.env ||
            {};
        const raw = env?.ALLOWED_ORIGINS ||
            env?.ALLOW_ORIGINS ||
            env?.APP_ORIGIN ||
            env?.PUBLIC_APP_ORIGIN ||
            '';
        const list = String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((o) => normalizeOrigin(o))
            .filter((o) => !!o);
        return list;
    }
    catch {
        return [];
    }
}
function resolveAllowedOrigins(context, options) {
    const reqOrigin = normalizeOrigin(new URL(context.request.url).origin);
    const envOrigins = getEnvAllowedOrigins(context);
    const custom = (options.allowedOrigins || [])
        .map((o) => normalizeOrigin(o))
        .filter((o) => !!o);
    // Immer die aktuelle Origin erlauben
    const base = new Set([...(reqOrigin ? [reqOrigin] : []), ...envOrigins, ...custom]);
    return Array.from(base);
}
function validateCsrfAndOrigin(context, options) {
    const method = context.request.method.toUpperCase();
    const requireSame = options.requireSameOriginForUnsafeMethods !== false; // default true
    if (!UNSAFE_METHODS.has(method))
        return null;
    const allowedOrigins = resolveAllowedOrigins(context, options);
    const headerOrigin = extractOriginFromHeaders(context.request);
    // Allow development-time relaxation via runtime env AUTH_CSRF_RELAXED ("1"/"true")
    let relaxSameOrigin = false;
    try {
        const env = context.locals?.runtime?.env ||
            {};
        const v = env.AUTH_CSRF_RELAXED;
        relaxSameOrigin = v === '1' || v === 'true';
    }
    catch {
        relaxSameOrigin = false;
    }
    if (requireSame) {
        if (relaxSameOrigin) {
            return null;
        }
        if (!headerOrigin) {
            return createApiError('forbidden', 'Missing Origin/Referer header');
        }
        if (!allowedOrigins.includes(headerOrigin)) {
            const logger = logger_factory_1.loggerFactory.createSecurityLogger();
            const path = new URL(context.request.url).pathname;
            logger.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
                reason: 'csrf_origin_rejected',
                endpoint: path,
                origin: headerOrigin,
                allowedOrigins,
            }, { ipAddress: context.clientAddress || 'unknown' });
            return createApiError('forbidden', 'Origin not allowed');
        }
    }
    if (options.enforceCsrfToken) {
        // Double-Submit-Cookie-Check: Header X-CSRF-Token muss Cookie csrf_token entsprechen
        const headerToken = context.request.headers.get('x-csrf-token');
        let cookieToken = null;
        try {
            cookieToken = context.cookies.get('csrf_token')?.value ?? null;
        }
        catch {
            cookieToken = null;
        }
        if (!headerToken || !cookieToken || headerToken !== cookieToken) {
            const path = new URL(context.request.url).pathname;
            const logger = logger_factory_1.loggerFactory.createSecurityLogger();
            logger.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
                reason: 'csrf_token_mismatch',
                endpoint: path,
                hasHeader: !!headerToken,
                hasCookie: !!cookieToken,
            }, { ipAddress: context.clientAddress || 'unknown' });
            return createApiError('forbidden', 'Invalid CSRF token');
        }
    }
    return null;
}
/**
 * Standard-Fehlermeldungen für verschiedene Fehlertypen
 */
const errorMessages = {
    validation_error: 'Ungültige Eingabedaten',
    auth_error: 'Authentifizierung fehlgeschlagen',
    not_found: 'Ressource nicht gefunden',
    rate_limit: 'Zu viele Anfragen',
    server_error: 'Interner Serverfehler',
    db_error: 'Datenbankfehler',
    forbidden: 'Zugriff verweigert',
    method_not_allowed: 'Methode nicht erlaubt',
    subscription_active: 'Aktives Abonnement verhindert die Aktion',
};
/**
 * HTTP-Statuscodes für verschiedene Fehlertypen
 */
const errorStatusCodes = {
    validation_error: 400,
    auth_error: 401,
    not_found: 404,
    rate_limit: 429,
    server_error: 500,
    db_error: 500,
    forbidden: 403,
    method_not_allowed: 405,
    subscription_active: 400,
};
/**
 * Erstellt eine standardisierte Fehlerantwort
 */
function createApiError(type, message, details) {
    const status = errorStatusCodes[type];
    const errorMessage = message || errorMessages[type];
    const responseBody = {
        success: false,
        error: {
            type,
            message: errorMessage,
            ...(details ? { details } : {}),
        },
    };
    return new Response(JSON.stringify(responseBody), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
/**
 * Erstellt eine standardisierte Erfolgsantwort
 */
function createApiSuccess(data, status = 200) {
    const responseBody = {
        success: true,
        data,
    };
    return new Response(JSON.stringify(responseBody), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
/**
 * Middleware für API-Endpunkte
 * Implementiert:
 * - Rate-Limiting
 * - Security-Headers
 * - Einheitliche Fehlerbehandlung
 * - Zentralisiertes Logging
 */
function withApiMiddleware(handler, options = {}) {
    return async (context) => {
        const { clientAddress, request, locals } = context;
        const localsWithUser = locals;
        const user = localsWithUser.user || localsWithUser.runtime?.user;
        const path = new URL(request.url).pathname;
        const method = request.method;
        try {
            // Rate-Limiting anwenden
            const limiter = options.rateLimiter || rate_limiter_1.apiRateLimiter;
            const rateLimitResult = await limiter(context);
            // Tolerant gegenüber unterschiedlichen Rückgabeformen
            const resultObj = rateLimitResult;
            if (rateLimitResult &&
                typeof resultObj.success === 'boolean' &&
                resultObj.success === false) {
                return applySecurityHeaders(createApiError('rate_limit', 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'));
            }
            // Wenn der Limiter eine Response liefert, diese direkt (mit Security-Headers) zurückgeben
            if (rateLimitResult instanceof Response) {
                return applySecurityHeaders(rateLimitResult);
            }
            // CSRF/Origin-Check für unsichere Methoden
            const csrfFailure = validateCsrfAndOrigin(context, options);
            if (csrfFailure) {
                return applySecurityHeaders(csrfFailure);
            }
            // API-Zugriff protokollieren (vor Ausführung)
            if (!options.disableAutoLogging) {
                securityLogger.logApiAccess({
                    endpoint: path,
                    method,
                    ...options.logMetadata,
                }, {
                    userId: user?.id || user?.sub || 'anonymous',
                    ipAddress: clientAddress || 'unknown',
                });
            }
            // Handler ausführen
            const response = await handler(context);
            // Security-Headers hinzufügen
            return applySecurityHeaders(response);
        }
        catch (error) {
            // Fehlerbehandlung
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Error in ${method} ${path}: ${errorMessage}`);
            // Benutzerdefinierte Fehlerbehandlung, falls vorhanden
            if (options.onError) {
                const errorResponse = await options.onError(context, error);
                return applySecurityHeaders(errorResponse);
            }
            // Standard-Fehlerbehandlung
            // Fehler loggen
            const errorStack = error instanceof Error ? error.stack : undefined;
            securityLogger.logApiError({
                endpoint: path,
                method,
                error: errorMessage,
                stack: errorStack,
                ...options.logMetadata,
            }, {
                userId: user?.id || user?.sub || 'anonymous',
                ipAddress: clientAddress || 'unknown',
            });
            // Falls ein Endpoint einen typisierten Fehler wirft (z. B. aus Services)
            // mit einem expliziten apiErrorType, diesen bevorzugt verwenden.
            const errorObj = error;
            const customType = errorObj?.apiErrorType;
            if (customType) {
                return applySecurityHeaders(createApiError(customType, errorMessage));
            }
            // Fehlertyp bestimmen
            let errorType = 'server_error';
            if (errorMessage.includes('UNIQUE constraint failed')) {
                errorType = 'validation_error';
                return createApiError(errorType, 'Diese Ressource existiert bereits');
            }
            else if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
                errorType = 'auth_error';
            }
            else if (errorMessage.includes('not found')) {
                errorType = 'not_found';
            }
            else if (errorMessage.includes('SQLITE_CONSTRAINT') || errorMessage.includes('database')) {
                errorType = 'db_error';
                // Generische Nachricht für DB-Fehler (keine internen Details preisgeben)
                return applySecurityHeaders(createApiError(errorType, 'Datenbankfehler'));
            }
            return applySecurityHeaders(createApiError(errorType, errorMessage));
        }
    };
}
/**
 * Middleware für authentifizierte API-Endpunkte
 * Erweitert die Standard-API-Middleware um Authentifizierungsprüfung
 */
function withAuthApiMiddleware(handler, options = {}) {
    return withApiMiddleware(async (context) => {
        // Prüfen, ob Benutzer authentifiziert ist
        const path = new URL(context.request.url).pathname;
        const localsWithUser = context.locals;
        const hasUser = Boolean(localsWithUser.user || localsWithUser.runtime?.user);
        if (!hasUser) {
            // Auth-Fehlschlag protokollieren und vereinheitlichte Antwort zurückgeben
            securityLogger.logAuthFailure({
                reason: 'unauthenticated_access',
                endpoint: path,
            }, {
                ipAddress: context.clientAddress || 'unknown',
            });
            if (options.onUnauthorized) {
                return options.onUnauthorized(context);
            }
            return createApiError('auth_error', 'Unauthorized');
        }
        return handler(context);
    }, { ...options, requireAuth: true });
}
/**
 * Middleware-Variante für Redirect-basierte Endpunkte
 * - Wendet Rate-Limiting, CSRF/Origin-Checks und Security-Headers an
 * - Bewahrt Response-Shape (z. B. Redirects), kein erzwungenes JSON-Schema
 */
function withRedirectMiddleware(handler, options = {}) {
    return async (context) => {
        const path = new URL(context.request.url).pathname;
        const method = context.request.method;
        try {
            // Rate-Limiting
            const limiter = options.rateLimiter || rate_limiter_1.apiRateLimiter;
            const rateLimitResult = await limiter(context);
            if (rateLimitResult instanceof Response) {
                return applySecurityHeaders(rateLimitResult);
            }
            // CSRF/Origin-Check
            const csrfFailure = validateCsrfAndOrigin(context, options);
            if (csrfFailure) {
                return applySecurityHeaders(csrfFailure);
            }
            const resp = await handler(context);
            return applySecurityHeaders(resp);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            securityLogger.logApiError({
                endpoint: path,
                method,
                error: errorMessage,
                stack: errorStack,
                ...options.logMetadata,
            }, {
                ipAddress: context.clientAddress || 'unknown',
            });
            if (options.onError) {
                const r = await options.onError(context, error);
                return applySecurityHeaders(r);
            }
            // Fallback JSON (wird meist durch redirect-spezifische onError ersetzt)
            return applySecurityHeaders(createApiError('server_error', errorMessage));
        }
    };
}
