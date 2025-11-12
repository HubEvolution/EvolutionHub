'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
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
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
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
    return (0, api_middleware_1.createApiSuccess)(safeUser);
  },
  {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'user_info_request' },
    // Verwende in diesem Endpoint den Standard-API-Limiter; dynamischer Import für testbare Mocks
    rateLimiter: async (ctx) => {
      const { standardApiLimiter } = await Promise.resolve().then(() =>
        require('@/lib/rate-limiter')
      );
      return standardApiLimiter(ctx);
    },
    // Standardisierte Unauthorized-Antwort (Tests erwarten error.type = 'auth_error')
    onUnauthorized: (_context) =>
      (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized'),
  }
);
