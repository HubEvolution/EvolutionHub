import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiError } from '@/lib/api-middleware';
import { logApiAccess } from '@/lib/security-logger';
import { listTools } from '../../lib/handlers.ts';

/**
 * GET /api/tools
 * Ruft eine Liste aller verfügbaren Tools ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
export const GET = withApiMiddleware(async (context) => {
  const { clientAddress } = context;
  
  // Original-Funktionalität aufrufen
  const response = await listTools(context);
  
  // API-Zugriff protokollieren
  logApiAccess('anonymous', clientAddress, {
    endpoint: '/api/tools',
    action: 'tools_list_accessed'
  });
  
  return response;
}, {
  // Keine Authentifizierung erforderlich für öffentliche Tools-Liste
  requireAuth: false,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress } = context;
    
    // Fehler protokollieren
    logApiAccess('anonymous', clientAddress, {
      endpoint: '/api/tools',
      action: 'tools_list_error',
      error: error instanceof Error ? error.message : String(error)
    });
    
    return createApiError('server_error', 'Error listing tools');
  },
  
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'list_tools' }
});
