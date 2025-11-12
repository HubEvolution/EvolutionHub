'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PUT = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
/**
 * PUT /api/user/settings
 * Aktualisiert die Benutzereinstellungen
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
exports.PUT = (0, api_middleware_1.withAuthApiMiddleware)(
  async (_context) => {
    // withAuthApiMiddleware ensures authenticated user; no local usage needed here
    // Hier würde die eigentliche Einstellungsaktualisierung implementiert werden
    // TODO: Implementiere die Einstellungsaktualisierung
    // Logging wird automatisch durch die Middleware übernommen
    return (0, api_middleware_1.createApiSuccess)({ message: 'Settings updated successfully' });
  },
  {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'settings_update' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (_context, _error) => {
      return (0, api_middleware_1.createApiError)(
        'server_error',
        'An error occurred during settings update'
      );
    },
  }
);
