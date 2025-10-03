import { withApiMiddleware, createApiSuccess } from '@/lib/api-middleware';
import { logAuthFailure } from '@/lib/security-logger';
import { listTools } from '@/lib/handlers'; // Angenommen, listTools ist in handlers.ts definiert

/**
 * GET /api/tools
 * Ruft eine Liste aller verfügbaren Tools ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
export const GET = withApiMiddleware(
  async (context) => {
    // Original-Funktionalität aufrufen (listTools)
    // Annahme: listTools gibt eine Response oder ein Objekt zurück, das angepasst werden kann
    const toolsResponse = await listTools(context); // Dies sollte eine Response oder ein Objekt sein

    // Sicherstellen, dass die Antwort ein Response-Objekt ist ODER etwas, das in ein Response-Objekt umgewandelt werden kann
    let finalResponse: Response;
    if (toolsResponse instanceof Response) {
      finalResponse = toolsResponse;
    } else {
      // Wenn listTools nur Daten zurückgibt, verpacken wir es in eine Standard-API-Erfolgsantwort
      finalResponse = createApiSuccess(toolsResponse);
    }

    // Security-Headers über die Middleware hinzufügen lassen
    return finalResponse;
  },
  {
    // Keine Authentifizierung erforderlich für öffentliche Tools-Liste
    requireAuth: false,

    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
      const { clientAddress } = context;

      // Fehler protokollieren als Auth-Failure (gemäß Test-Erwartung)
      logAuthFailure(clientAddress, {
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
  }
);
