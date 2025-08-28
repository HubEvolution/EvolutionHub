import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logAuthSuccess, logAuthFailure, logSecurityEvent } from '@/lib/security-logger';
import { createSecureRedirect, createSecureJsonResponse } from '@/lib/response-helpers';

/**
 * Gemeinsamer Logout-Handler für GET und POST
 * Meldet den Benutzer ab und löscht das Authentifizierungs-Cookie.
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
const handleLogout = async (context: APIContext) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    // Bei Limit-Überschreitung auf die Login-Seite mit Fehler umleiten
    return createSecureRedirect('/login?error=TooManyRequests');
  }

  try {
    // Überprüfen, ob ein Benutzer angemeldet ist, bevor das Cookie gelöscht wird
    const userId = context.locals.user?.id; // Annahme: `locals.user` wird durch eine vorherige Middleware gesetzt

    // Das Authentifizierungs-Cookie löschen
    context.cookies.set('session_id', '', {
      path: '/',
      httpOnly: true,
      maxAge: 0, // Setzt das Cookie sofort auf ungültig (löscht es)
      secure: context.url.protocol === 'https:',
      sameSite: 'lax'
    });

    // Erfolgreiche Abmeldung protokollieren, falls ein Benutzer angemeldet war
    if (userId) {
      logAuthSuccess(userId, context.clientAddress, {
        action: 'logout',
        ipAddress: context.clientAddress
      });
    } else {
      // Protokollieren auch, wenn versucht wurde, sich abzumelden, ohne angemeldet zu sein
      logAuthFailure(context.clientAddress, {
        reason: 'logout_without_session',
        ipAddress: context.clientAddress
      });
    }

    // Nach der Abmeldung zurück zum Login oder zur Startseite leiten
    const redirectUrl = '/login?loggedOut=true';
    return createSecureRedirect(redirectUrl);

  } catch (error) {
    console.error('Logout error:', error);
    
    // Generischen Serverfehler behandeln
    
    // Fehler protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'server_error_during_logout',
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Auf die Login-Seite mit einer generischen Fehlermeldung umleiten
    return createSecureRedirect('/login?error=ServerError');
  }
};

export const POST = handleLogout;
export const GET = handleLogout;

// 405 Method Not Allowed für alle anderen Methoden
const methodNotAllowed = (context: APIContext): Response => {
  // Sicherheits-Logging für unzulässige Methoden
  logSecurityEvent(
    'API_ACCESS',
    {
      action: 'method_not_allowed',
      method: context.request.method,
      allowed: 'GET, POST',
      path: '/api/auth/logout'
    },
    {
      ipAddress: context.clientAddress,
      targetResource: '/api/auth/logout'
    }
  );

  return createSecureJsonResponse(
    { error: true, message: 'Method Not Allowed' },
    405,
    { Allow: 'GET, POST' }
  );
};

export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;