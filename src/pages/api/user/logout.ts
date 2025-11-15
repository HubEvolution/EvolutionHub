import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { invalidateSession } from '@/lib/auth-v2';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logSecurityEvent, logUserEvent } from '@/lib/security-logger';
import { createSecureRedirect } from '@/lib/response-helpers';
import { getErrorCode } from '@/lib/error-handler';

/**
 * Gemeinsame Logout-Funktion für GET und POST Requests
 * Beendet die aktuelle Benutzersitzung und löscht das Session-Cookie
 * Implementiert direktes Rate-Limiting, Security-Headers und Audit-Logging
 *
 * WICHTIG: Verwendet KEINE API-Middleware, da diese JSON-Responses erwartet,
 * aber Logout muss Redirects zurückgeben!
 */
const handleLogout = async (context: APIContext) => {
  try {
    // Rate-Limiting direkt anwenden
    const rateLimitResponse = await standardApiLimiter(context);
    if (rateLimitResponse) {
      // Bei Rate-Limit trotzdem weiterleiten, aber loggen
      logSecurityEvent(
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

      return createSecureRedirect('/login?error=rate_limit');
    }

    const sessionId = context.cookies.get('session_id')?.value ?? null;

    if (sessionId) {
      // Benutzer-ID für Logging abrufen
      const db = context.locals.runtime.env.DB as unknown as D1Database;
      const sessionResult = await db
        .prepare('SELECT user_id FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first<{ user_id: string }>();
      const userId = sessionResult?.user_id || 'unknown';

      await invalidateSession(db, sessionId);

      // Erfolgreichen Logout protokollieren
      logUserEvent(userId, 'logout_success', {
        ipAddress: context.clientAddress,
        sessionId: sessionId,
      });

      context.cookies.delete('session_id', { path: '/' });
    } else {
      // Logout ohne aktive Session protokollieren
      logSecurityEvent(
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
      logSecurityEvent(
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
        errorCode,
        path: '/api/user/logout',
        error: error instanceof Error ? error.message : String(error),
      },
      {
        ipAddress: context.clientAddress,
      }
    );

    // Bei Fehlern trotzdem zum Logout weiterleiten
    context.cookies.delete('session_id', { path: '/' });

    return createSecureRedirect('/');
  }
};

export const POST = handleLogout;
export const GET = handleLogout;
