"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
/**
 * GET /api/dashboard/stats
 * Ruft Dashboard-Statistiken für den authentifizierten Benutzer ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, clientAddress } = context;
    const env = (locals.runtime?.env ?? {});
    const user = locals.user;
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const userId = user.id;
    const db = env.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const projectsQuery = db
        .prepare('SELECT count(*) as count FROM projects WHERE user_id = ?')
        .bind(userId);
    const tasksQuery = db
        .prepare('SELECT count(*) as count FROM tasks WHERE user_id = ?')
        .bind(userId);
    // Assuming a simple count for team members for now
    const teamMembersQuery = db.prepare('SELECT count(*) as count FROM users').bind();
    const [projectsResult, tasksResult, teamMembersResult] = await Promise.all([
        projectsQuery.first(),
        tasksQuery.first(),
        teamMembersQuery.first(),
    ]);
    const stats = {
        projects: projectsResult?.count || 0,
        tasks: tasksResult?.count || 0,
        teamMembers: teamMembersResult?.count || 0,
    };
    // Benutzeraktion protokollieren
    (0, security_logger_1.logUserEvent)(userId, 'dashboard_stats_viewed', {
        statCounts: {
            projects: stats.projects,
            tasks: stats.tasks,
            teamMembers: stats.teamMembers,
        },
        ipAddress: clientAddress,
    });
    return (0, api_middleware_1.createApiSuccess)(stats);
}, {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'dashboard_stats_accessed' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
        const { clientAddress, locals } = context;
        const user = locals.user;
        if (user) {
            (0, security_logger_1.logUserEvent)(user.id, 'stats_fetch_error', {
                error: error instanceof Error ? error.message : String(error),
                ipAddress: clientAddress,
            });
        }
        return (0, api_middleware_1.createApiError)('server_error', 'Error fetching dashboard statistics');
    },
});
