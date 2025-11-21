/**
 * Logout-Endpunkt (Service-Layer-Version)
 *
 * Diese Datei implementiert den Logout-Endpunkt unter Verwendung der neuen Service-Layer.
 * Im Vergleich zur ursprünglichen Version bietet diese Implementierung:
 * - Bessere Trennung von Concerns (Geschäftslogik in Services)
 * - Verbesserte Fehlerbehandlung
 * - Konsistentes Logging über den Service
 */

import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect } from '@/lib/response-helpers';
import { createAuthService } from '@/lib/services/auth-service-impl';
// Removed unused ServiceError imports
import { logApiError, logSecurityEvent } from '@/lib/security-logger';
import { getErrorCode } from '@/lib/error-handler';

/**
 * Gemeinsame Logout-Funktion für GET und POST Requests
 * Beendet die aktuelle Benutzersitzung und löscht das Session-Cookie
 * Verwendet die AuthService-Implementierung für Geschäftslogik
 * Implementiert direktes Rate-Limiting, Security-Headers und Audit-Logging
 */
const handleLogoutV2 = async (context: APIContext) => {
  try {
    // Rate-Limiting direkt anwenden
    const rateLimitResponse = await standardApiLimiter(context);
    if (rateLimitResponse) {
      // Bei Rate-Limit werfen wir einen ServiceError mit Typ RATE_LIMIT
      logSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        {
          reason: 'rate_limit',
          path: '/api/user/logout-v2',
        },
        {
          ipAddress: context.clientAddress,
          targetResource: '/api/user/logout-v2',
        }
      );

      // Session-Cookie löschen bevor wir weiterleiten
      context.cookies.delete('session_id', { path: '/' });
      return createSecureRedirect('/login?error=TooManyRequests');
    }

    const sessionId = context.cookies.get('session_id')?.value ?? null;

    // Wenn keine Runtime verfügbar ist, trotzdem Cookie löschen und weiterleiten
    if (!context.locals.runtime) {
      if (sessionId) {
        context.cookies.delete('session_id', { path: '/' });
      }

      logSecurityEvent(
        'AUTH_FAILURE',
        {
          reason: 'missing_runtime',
          path: '/api/user/logout-v2',
        },
        {
          ipAddress: context.clientAddress,
        }
      );

      // Bei fehlender Runtime leiten wir zur Startseite ohne Fehlermeldung weiter
      return createSecureRedirect('/');
    }

    // AuthService erstellen
    const authService = createAuthService({
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
        context.cookies.delete('session_id', { path: '/' });

        // Fehler für Logging extrahieren
        const errorCode = getErrorCode(serviceError);
        const message = serviceError instanceof Error ? serviceError.message : String(serviceError);
        logApiError(
          '/api/user/logout-v2',
          {
            reason: 'logout_service_error',
            errorCode,
            sessionId,
            error: message,
          },
          {
            ipAddress: context.clientAddress,
          }
        );
        logSecurityEvent(
          'AUTH_FAILURE',
          {
            reason: 'logout_error',
            errorCode,
            sessionId,
            path: '/api/user/logout-v2',
            error: message,
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
    return createSecureRedirect('/');
  } catch (error) {
    const sessionId = context.cookies.get('session_id')?.value ?? null;

    // Fehler protokollieren mit standardisiertem Fehlercode
    const errorCode = getErrorCode(error);
    logSecurityEvent(
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
    return createSecureRedirect('/');
  }
};

/**
 * POST /api/user/logout-v2
 * Beendet die aktuelle Benutzersitzung
 */
export const POST = handleLogoutV2;

/**
 * GET /api/user/logout-v2
 * Beendet die aktuelle Benutzersitzung
 */
export const GET = handleLogoutV2;
