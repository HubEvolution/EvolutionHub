import type { APIRoute } from 'astro';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';

/**
 * GET /api/dashboard/activity
 * Ruft die Aktivitäten des authentifizierten Benutzers ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const GET: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  const { locals } = context;
  const { env, user } = locals.runtime;
  const clientAddress = context.clientAddress || '0.0.0.0';
  const endpoint = context.url ? context.url.pathname : '/api/dashboard/activity';

  // Wenn kein Benutzer authentifiziert ist, 401 zurückgeben und Fehler protokollieren
  if (!user) {
    const response = new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Fehlgeschlagene Authentifizierung protokollieren
    logAuthFailure(clientAddress, {
      reason: 'unauthenticated_access',
      endpoint
    });
    
    return securedResponse;
  }

  const userId = user.sub;

  try {
    const { results } = await env.DB.prepare(`
        SELECT a.id, a.action, a.created_at, u.name as user, u.image as user_image
        FROM activities a
        JOIN users u ON a.user_id = u.id
        WHERE a.user_id = ?1
        ORDER BY a.created_at DESC
        LIMIT 10
    `).bind(userId).all();

    // Map to frontend expected format
    const activityFeed = results.map((item: any) => ({
        id: item.id,
        user: item.user,
        action: item.action,
        timestamp: item.created_at,
        icon: "✨", // Default icon, can be customized based on action
        color: "text-purple-400"
    }));

    // Erfolgreiche Antwort erstellen
    const response = new Response(JSON.stringify(activityFeed), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // API-Zugriff protokollieren
    logApiAccess(userId, clientAddress, {
      endpoint,
      method: 'GET',
      action: 'activity_feed_accessed'
    });
    
    return securedResponse;
  } catch (e) {
    console.error(e);
    
    // Fehlerantwort erstellen
    const response = new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Serverfehler protokollieren
    logAuthFailure(user.sub, {
      reason: 'server_error',
      endpoint,
      details: e instanceof Error ? e.message : String(e)
    });
    
    return securedResponse;
  }
};
