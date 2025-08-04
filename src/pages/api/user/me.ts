import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiSuccess } from '@/lib/api-middleware';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';

/**
 * GET /api/user/me
 * Gibt die Daten des aktuell eingeloggten Benutzers zurück.
 * Sensible Daten werden durch einen Whitelist-Ansatz gefiltert.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const GET = withApiMiddleware(async (context) => {
  const { locals, clientAddress, url } = context;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/user/me';

  // Wenn kein Benutzer authentifiziert ist, 401 zurückgeben und Fehler protokollieren
  if (!user) {
    // Fehlgeschlagene Authentifizierung protokollieren
    logAuthFailure(clientAddress, {
      reason: 'unauthenticated_access',
      endpoint
    });
    
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Whitelist-Ansatz: Nur explizit erlaubte Felder zurückgeben
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    created_at: user.created_at,
    // Weitere sichere Felder hier bei Bedarf hinzufügen
  };

  // API-Zugriff protokollieren
  logApiAccess(user.id, clientAddress, {
    endpoint,
    method: 'GET'
  });
  
  // Erfolgreiche Antwort mit standardisiertem Format erstellen
  return createApiSuccess(safeUser);
}, {
  // Erfordert Authentifizierung
  requireAuth: true
});
