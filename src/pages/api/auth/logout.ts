import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';
import { createSecureRedirect, createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import { withRedirectMiddleware } from '@/lib/api-middleware';

/**
 * Gemeinsamer Logout-Handler für GET und POST
 * Meldet den Benutzer ab und löscht das Authentifizierungs-Cookie.
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
const handleLogout = async (context: APIContext) => {
  // Deprecated legacy endpoint: return 410 Gone early with security logging
  return createDeprecatedGoneHtml(context);
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

// Enforce CSRF/Origin checks for POST via redirect middleware (HTML 410 on same-origin)
export const POST = withRedirectMiddleware(handleLogout);
export const GET = handleLogout;

// 410 Method Gone für alle anderen Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext): Response =>
  createDeprecatedGoneJson(
    context,
    'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    { Allow: 'GET, POST' }
  );

// Unsafe methods: enforce CSRF/Origin checks, return 410 JSON on same-origin
export const PUT = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const PATCH = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const DELETE = withRedirectMiddleware(async (context) => methodNotAllowed(context));
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;