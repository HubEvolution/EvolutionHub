import { withAuthApiMiddleware, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';
import { createSecureJsonResponse } from '@/lib/response-helpers';

/**
 * GET /api/dashboard/activity
 * Ruft die Aktivitäten des authentifizierten Benutzers ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals } = context;
  const { env } = locals.runtime;
  const user = locals.user;

  if (!user) {
    return createApiError('auth_error', 'Unauthorized');
  }
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

  // Spezifisches Event-Logging wurde zur Middleware migriert

  return createSecureJsonResponse(activityFeed);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'activity_feed_accessed' },

  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;

    if (user) {
      logUserEvent(user.id, 'activity_feed_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }

    return createApiError('server_error', 'Error fetching activity feed');
  }
});