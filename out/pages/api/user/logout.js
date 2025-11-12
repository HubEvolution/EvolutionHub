'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = exports.POST = void 0;
const auth_v2_1 = require('@/lib/auth-v2');
const rate_limiter_1 = require('@/lib/rate-limiter');
const security_logger_1 = require('@/lib/security-logger');
const response_helpers_1 = require('@/lib/response-helpers');
/**
 * Gemeinsame Logout-Funktion für GET und POST Requests
 * Beendet die aktuelle Benutzersitzung und löscht das Session-Cookie
 * Implementiert direktes Rate-Limiting, Security-Headers und Audit-Logging
 *
 * WICHTIG: Verwendet KEINE API-Middleware, da diese JSON-Responses erwartet,
 * aber Logout muss Redirects zurückgeben!
 */
const handleLogout = async (context) => {
  try {
    // Rate-Limiting direkt anwenden
    const rateLimitResponse = await (0, rate_limiter_1.standardApiLimiter)(context);
    if (rateLimitResponse) {
      // Bei Rate-Limit trotzdem weiterleiten, aber loggen
      (0, security_logger_1.logSecurityEvent)(
        'RATE_LIMIT_EXCEEDED',
        {
          reason: 'rate_limit',
          path: '/api/user/logout',
        },
        {
          ipAddress: context.clientAddress,
          targetResource: '/api/user/logout',
        }
      );
      return (0, response_helpers_1.createSecureRedirect)('/login?error=rate_limit');
    }
    const sessionId = context.cookies.get('session_id')?.value ?? null;
    if (sessionId) {
      // Benutzer-ID für Logging abrufen
      const db = context.locals.runtime.env.DB;
      const sessionResult = await db
        .prepare('SELECT user_id FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first();
      const userId = sessionResult?.user_id || 'unknown';
      await (0, auth_v2_1.invalidateSession)(db, sessionId);
      // Erfolgreichen Logout protokollieren
      (0, security_logger_1.logUserEvent)(userId, 'logout_success', {
        ipAddress: context.clientAddress,
        sessionId: sessionId,
      });
      context.cookies.delete('session_id', { path: '/' });
    } else {
      // Logout ohne aktive Session protokollieren
      (0, security_logger_1.logSecurityEvent)(
        'API_ACCESS',
        {
          action: 'logout',
          reason: 'no_active_session',
        },
        {
          ipAddress: context.clientAddress,
          targetResource: '/api/user/logout',
        }
      );
      // Erfolgreichen Logout ohne User-ID protokollieren
      (0, security_logger_1.logSecurityEvent)(
        'AUTH_SUCCESS',
        {
          action: 'logout_success',
          sessionId: null,
        },
        {
          ipAddress: context.clientAddress,
        }
      );
    }
    // Redirect to the homepage regardless of whether a session existed
    return (0, response_helpers_1.createSecureRedirect)('/');
  } catch (error) {
    const sessionId = context.cookies.get('session_id')?.value ?? null;
    // Fehler protokollieren
    (0, security_logger_1.logSecurityEvent)(
      'AUTH_FAILURE',
      {
        reason: 'logout_error',
        sessionId: sessionId,
        path: '/api/user/logout',
        error: error,
      },
      {
        ipAddress: context.clientAddress,
      }
    );
    // Bei Fehlern trotzdem zum Logout weiterleiten
    context.cookies.delete('session_id', { path: '/' });
    return (0, response_helpers_1.createSecureRedirect)('/');
  }
};
exports.POST = handleLogout;
exports.GET = handleLogout;
