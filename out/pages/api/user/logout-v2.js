'use strict';
/**
 * Logout-Endpunkt (Service-Layer-Version)
 *
 * Diese Datei implementiert den Logout-Endpunkt unter Verwendung der neuen Service-Layer.
 * Im Vergleich zur ursprünglichen Version bietet diese Implementierung:
 * - Bessere Trennung von Concerns (Geschäftslogik in Services)
 * - Verbesserte Fehlerbehandlung
 * - Konsistentes Logging über den Service
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = exports.POST = void 0;
const rate_limiter_1 = require('@/lib/rate-limiter');
const response_helpers_1 = require('@/lib/response-helpers');
const auth_service_impl_1 = require('@/lib/services/auth-service-impl');
// Removed unused ServiceError imports
const security_logger_1 = require('@/lib/security-logger');
const error_handler_1 = require('@/lib/error-handler');
/**
 * Gemeinsame Logout-Funktion für GET und POST Requests
 * Beendet die aktuelle Benutzersitzung und löscht das Session-Cookie
 * Verwendet die AuthService-Implementierung für Geschäftslogik
 * Implementiert direktes Rate-Limiting, Security-Headers und Audit-Logging
 */
const handleLogoutV2 = async (context) => {
  try {
    // Rate-Limiting direkt anwenden
    const rateLimitResponse = await (0, rate_limiter_1.standardApiLimiter)(context);
    if (rateLimitResponse) {
      // Bei Rate-Limit werfen wir einen ServiceError mit Typ RATE_LIMIT
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
      // Session-Cookie löschen bevor wir weiterleiten
      context.cookies.delete('session_id', { path: '/' });
      return (0, response_helpers_1.createSecureRedirect)('/login?error=TooManyRequests');
    }
    const sessionId = context.cookies.get('session_id')?.value ?? null;
    // Wenn keine Runtime verfügbar ist, trotzdem Cookie löschen und weiterleiten
    if (!context.locals.runtime) {
      if (sessionId) {
        context.cookies.delete('session_id', { path: '/' });
      }
      (0, security_logger_1.logSecurityEvent)(
        'AUTH_FAILURE',
        {
          reason: 'missing_runtime',
          path: '/api/user/logout',
        },
        {
          ipAddress: context.clientAddress,
        }
      );
      // Bei fehlender Runtime leiten wir zur Startseite ohne Fehlermeldung weiter
      return (0, response_helpers_1.createSecureRedirect)('/');
    }
    // AuthService erstellen
    const authService = (0, auth_service_impl_1.createAuthService)({
      db: context.locals.runtime.env.DB,
      isDevelopment: import.meta.env.DEV,
    });
    if (sessionId) {
      try {
        // Service-Layer für Logout aufrufen
        await authService.logout(sessionId);
        // Cookie löschen
        context.cookies.delete('session_id', { path: '/' });
      } catch (serviceError) {
        // Bei Fehlern im Service trotzdem Cookie löschen und weiterleiten
        console.error('Logout service error:', serviceError);
        context.cookies.delete('session_id', { path: '/' });
        // Fehler für Logging extrahieren
        const errorCode = (0, error_handler_1.getErrorCode)(serviceError);
        (0, security_logger_1.logSecurityEvent)(
          'AUTH_FAILURE',
          {
            reason: 'logout_error',
            errorCode,
            sessionId: sessionId,
            path: '/api/user/logout-v2',
            error: serviceError instanceof Error ? serviceError.message : String(serviceError),
          },
          {
            ipAddress: context.clientAddress,
          }
        );
      }
    } else {
      // Logout ohne aktive Session über Service protokollieren
      // Service erwartet eine Session-ID: ohne aktive Session gibt es nichts zu invalidieren
      // Wir protokollieren lediglich und fahren fort
    }
    // Redirect zur Startseite unabhängig vom Ergebnis
    return (0, response_helpers_1.createSecureRedirect)('/');
  } catch (error) {
    const sessionId = context.cookies.get('session_id')?.value ?? null;
    // Fehler protokollieren mit standardisiertem Fehlercode
    const errorCode = (0, error_handler_1.getErrorCode)(error);
    (0, security_logger_1.logSecurityEvent)(
      'AUTH_FAILURE',
      {
        reason: 'logout_error',
        sessionId: sessionId,
        errorCode: errorCode,
        path: '/api/user/logout-v2',
        error: error instanceof Error ? error.message : String(error),
      },
      {
        ipAddress: context.clientAddress,
      }
    );
    // Bei Fehlern trotzdem Cookie löschen und weiterleiten
    context.cookies.delete('session_id', { path: '/' });
    // Bei Logout immer zur Startseite weiterleiten, unabhängig vom Fehler
    return (0, response_helpers_1.createSecureRedirect)('/');
  }
};
/**
 * POST /api/user/logout-v2
 * Beendet die aktuelle Benutzersitzung
 */
exports.POST = handleLogoutV2;
/**
 * GET /api/user/logout-v2
 * Beendet die aktuelle Benutzersitzung
 */
exports.GET = handleLogoutV2;
