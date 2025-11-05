"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
const response_helpers_1 = require("@/lib/response-helpers");
/**
 * GET /api/dashboard/activity
 * Ruft die Aktivitäten des authentifizierten Benutzers ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals } = context;
    const runtimeEnv = locals.runtime?.env;
    const user = locals.user;
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const userId = user.id;
    const db = runtimeEnv?.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const { results = [] } = await db
        .prepare(`
      SELECT a.id, a.action, a.created_at, u.name as user, u.image as user_image
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?1
      ORDER BY a.created_at DESC
      LIMIT 10
  `)
        .bind(userId)
        .all();
    // Map to frontend expected format
    const activityFeed = results.map((item) => ({
        id: String(item.id),
        user: item.user,
        action: item.action,
        timestamp: item.created_at,
        icon: '✨', // Default icon, can be customized based on action
        color: 'text-purple-400',
    }));
    // Spezifisches Event-Logging wurde zur Middleware migriert
    return (0, response_helpers_1.createSecureJsonResponse)(activityFeed);
}, {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'activity_feed_accessed' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
        const { clientAddress, locals } = context;
        const user = locals.user;
        if (user) {
            (0, security_logger_1.logUserEvent)(user.id, 'activity_feed_error', {
                error: error instanceof Error ? error.message : String(error),
                ipAddress: clientAddress,
            });
        }
        return (0, api_middleware_1.createApiError)('server_error', 'Error fetching activity feed');
    },
});
