"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
const quickActions = [
    {
        id: 'qa1',
        title: 'New Post',
        description: 'Write a new blog article.',
        icon: '✍️',
        variant: 'primary',
        action: 'createPost',
    },
];
/**
 * GET /api/dashboard/quick-actions
 * Ruft die verfügbaren Quick Actions ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe
 */
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { clientAddress } = context;
    // API-Zugriff protokollieren
    (0, security_logger_1.logApiAccess)('anonymous', clientAddress, {
        event: 'quick_actions_accessed',
        actionCount: quickActions.length,
    });
    return (0, api_middleware_1.createApiSuccess)(quickActions);
}, {
    // Keine Authentifizierung erforderlich für öffentliche Quick Actions
    requireAuth: false,
    // Zusätzliche Logging-Metadaten für den API-Zugriff
    logMetadata: { action: 'public_quick_actions_accessed' },
});
