import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
// Hinweis: standardApiLimiter wird dynamisch in der rateLimiter-Option importiert,
// damit Vitest-Mocks zuverlässig greifen.

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
  const { locals } = context as any;
  const user = (locals.user as { id: string; email: string; name: string; username: string; created_at?: string });

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
  logMetadata: { action: 'user_info_request' },
  // Verwende in diesem Endpoint den Standard-API-Limiter; dynamischer Import für testbare Mocks
  rateLimiter: async (ctx) => {
    const { standardApiLimiter } = await import('@/lib/rate-limiter');
    return standardApiLimiter(ctx as any);
  },
  // Standardisierte Unauthorized-Antwort (Tests erwarten error.type = 'auth_error')
  onUnauthorized: (_context) => createApiError('auth_error', 'Unauthorized')
});
