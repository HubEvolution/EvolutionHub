import type { APIContext } from 'astro';
import { invalidateSession } from '@/lib/auth-v2';
import { withApiMiddleware } from '@/lib/api-middleware';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';

/**
 * Gemeinsame Logout-Funktion für GET und POST Requests
 * Beendet die aktuelle Benutzersitzung und löscht das Session-Cookie
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
const handleLogout = withApiMiddleware(async (context: APIContext) => {
  const sessionId = context.cookies.get('session_id')?.value ?? null;
  
  if (sessionId) {
    // Benutzer-ID für Logging abrufen
    const db = context.locals.runtime.env.DB;
    const sessionResult = await db.prepare('SELECT user_id FROM sessions WHERE id = ?').bind(sessionId).first<{user_id: string}>();
    const userId = sessionResult?.user_id || 'unknown';
    
    await invalidateSession(db, sessionId);
    
    // Erfolgreichen Logout protokollieren
    logAuthSuccess(userId, context.clientAddress, {
      action: 'logout',
      sessionId: sessionId
    });
    
    context.cookies.delete('session_id', { path: '/' });
  } else {
    // Logout ohne aktive Session protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'logout_without_session'
    });
  }

  // Redirect to the homepage regardless of whether a session existed
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/'
    }
  });
}, {
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const sessionId = context.cookies.get('session_id')?.value ?? null;
    
    // Fehler protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'logout_error',
      sessionId: sessionId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Bei Fehlern trotzdem zum Logout weiterleiten
    context.cookies.delete('session_id', { path: '/' });
    
    return new Response(null, {
      status: 302,
      headers: { Location: '/' }
    });
  }
});

export const POST = handleLogout;
export const GET = handleLogout;