import type { APIRoute } from 'astro';
import { withAuthApiMiddleware, createApiSuccess } from '@/lib/api-middleware';

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
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals } = context;
  const user = locals.user;

  // Whitelist-Ansatz: Nur explizit erlaubte Felder zurückgeben
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    created_at: user.created_at,
    // Weitere sichere Felder hier bei Bedarf hinzufügen
  };

  // Erfolgreiche Antwort mit standardisiertem Format erstellen
  return createApiSuccess(safeUser);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'user_info_request' }
});
