"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
const response_helpers_1 = require("@/lib/response-helpers");
/**
 * GET /api/dashboard/projects
 * Ruft die Projekte des authentifizierten Benutzers ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, clientAddress } = context;
    const env = (locals.runtime?.env ?? {});
    const user = locals.user;
    const userId = user?.id;
    if (!userId) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const db = env.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const { results } = await db
        .prepare(`SELECT id, title, description, progress, status, updated_at as lastUpdated FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC`)
        .bind(userId)
        .all();
    const projects = (results ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        progress: Number(p.progress) || 0,
        status: p.status,
        lastUpdated: p.lastUpdated,
        members: [], // members are not stored in the current schema
    }));
    // Expliziter API-Access-Log mit Projektanzahl (für Tests)
    (0, security_logger_1.logApiAccess)(userId, clientAddress || 'unknown', {
        endpoint: '/api/dashboard/projects',
        method: 'GET',
        action: 'projects_accessed',
        projectCount: projects.length,
    });
    // Plain array JSON zurückgeben (Tests erwarten kein Wrapper-Objekt)
    return (0, response_helpers_1.createSecureJsonResponse)(projects);
}, {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'projects_accessed' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
        const { clientAddress, locals } = context;
        const u = locals?.user;
        const userId = u?.id ?? u?.sub;
        if (userId) {
            (0, security_logger_1.logAuthFailure)(userId, {
                reason: 'server_error',
                endpoint: '/api/dashboard/projects',
                error: error instanceof Error ? error.message : String(error),
                ipAddress: clientAddress,
            });
        }
        return (0, api_middleware_1.createApiError)('server_error', 'Error fetching projects');
    },
});
