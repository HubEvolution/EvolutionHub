"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
// Removed unused type imports
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
/**
 * GET /api/dashboard/notifications
 * Ruft die Benachrichtigungen des authentifizierten Benutzers ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals } = context;
    const { env } = locals.runtime;
    const user = locals.user;
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const stmt = env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').bind(user.id);
    const { results } = await stmt.all();
    // Zusätzliche Benutzeraktion protokollieren
    (0, security_logger_1.logUserEvent)(user.id, 'notifications_viewed', {
        notificationCount: results.length,
    });
    return (0, api_middleware_1.createApiSuccess)(results);
}, {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'notifications_accessed' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
        const { clientAddress, locals } = context;
        const user = locals.user;
        if (user) {
            (0, security_logger_1.logUserEvent)(user.id, 'notifications_fetch_error', {
                error: error instanceof Error ? error.message : String(error),
                ipAddress: clientAddress,
            });
        }
        return (0, api_middleware_1.createApiError)('server_error', 'Error fetching notifications');
    },
});
