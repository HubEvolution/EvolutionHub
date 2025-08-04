import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
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
export const GET = withApiMiddleware(async (context) => {
  const { locals, clientAddress, url } = context;
  const { env } = locals.runtime;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/dashboard/activity';

  const userId = user.id;

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
  
  // API-Zugriff protokollieren
  logApiAccess(userId, clientAddress, {
    endpoint,
    method: 'GET',
    action: 'activity_feed_accessed'
  });
  
  return createApiSuccess(activityFeed);
}, {
  // Erfordert Authentifizierung
  requireAuth: true,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, url, locals } = context;
    const user = locals.user;
    const endpoint = url ? url.pathname : '/api/dashboard/activity';
    
    console.error('Error fetching activity feed:', error);
    
    // Serverfehler protokollieren
    logAuthFailure(user ? user.id : clientAddress, {
      reason: 'server_error',
      endpoint,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return createApiError('Internal Server Error', 500);
  }
});
