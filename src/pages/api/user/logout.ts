import type { APIContext } from 'astro';
import { invalidateSession } from '@/lib/auth-v2';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';

async function handleLogout(context: APIContext): Promise<Response> {
  // Rate-Limiting anwenden (standardmäßig, da Logout weniger kritisch als Login/Register)
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  const sessionId = context.cookies.get('session_id')?.value ?? null;
  
  if (sessionId) {
    try {
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
      
    } catch (error) {
      // Fehler protokollieren, aber weitermachen
      console.error('Fehler beim Invalidieren der Session:', error);
      logAuthFailure(context.clientAddress, {
        reason: 'logout_error',
        sessionId: sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    context.cookies.delete('session_id', { path: '/' });
  } else {
    // Logout ohne aktive Session protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'logout_without_session'
    });
  }

  // Redirect to the homepage regardless of whether a session existed
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: '/'
    }
  });
  
  // Sicherheitsheader anwenden
  return applySecurityHeaders(response);
}

export const POST = handleLogout;
export const GET = handleLogout;