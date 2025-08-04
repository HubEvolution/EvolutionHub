import type { APIRoute } from 'astro';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';
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
export const GET: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  const clientAddress = context.clientAddress || '0.0.0.0';
  const endpoint = context.url ? context.url.pathname : '/api/tools';
  
  try {
    // Original-Funktionalität aufrufen
    const response = await listTools(context);
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // API-Zugriff protokollieren
    logApiAccess(clientAddress, clientAddress, {
      endpoint,
      method: 'GET',
      action: 'list_tools'
    });
    
    return securedResponse;
  } catch (error) {
    console.error('Error listing tools:', error);
    
    // Fehlerantwort erstellen
    const errorResponse = new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(errorResponse);
    
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'server_error',
      endpoint,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return securedResponse;
  }
};
