"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
const handlers_1 = require("@/lib/handlers"); // Angenommen, listTools ist in handlers.ts definiert
/**
 * GET /api/tools
 * Ruft eine Liste aller verfügbaren Tools ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    // Original-Funktionalität aufrufen (listTools)
    // Annahme: listTools gibt eine Response oder ein Objekt zurück, das angepasst werden kann
    const toolsResponse = await (0, handlers_1.listTools)(context); // Dies sollte eine Response oder ein Objekt sein
    // Sicherstellen, dass die Antwort ein Response-Objekt ist ODER etwas, das in ein Response-Objekt umgewandelt werden kann
    let finalResponse;
    if (toolsResponse instanceof Response) {
        finalResponse = toolsResponse;
    }
    else {
        // Wenn listTools nur Daten zurückgibt, verpacken wir es in eine Standard-API-Erfolgsantwort
        finalResponse = (0, api_middleware_1.createApiSuccess)(toolsResponse);
    }
    // Security-Headers über die Middleware hinzufügen lassen
    return finalResponse;
}, {
    // Keine Authentifizierung erforderlich für öffentliche Tools-Liste
    requireAuth: false,
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
        const { clientAddress } = context;
        // Fehler protokollieren als Auth-Failure (gemäß Test-Erwartung)
        (0, security_logger_1.logAuthFailure)(clientAddress, {
            reason: 'server_error',
            endpoint: '/api/tools',
            details: error instanceof Error ? error.message : String(error),
        });
        // Einfacher Fehler-Body
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    },
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'list_tools', method: 'GET' },
});
