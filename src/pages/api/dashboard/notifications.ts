import type { APIContext } from 'astro';
import type { Notification } from '../../../types/dashboard';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * GET /api/dashboard/notifications
 * Ruft die Benachrichtigungen des authentifizierten Benutzers ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals } = context;
  const { env } = locals.runtime;
  const user = locals.user;
  
  const stmt = env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').bind(user.id);
  const { results } = await stmt.all();
  
  // Zusätzliche Benutzeraktion protokollieren
  logUserEvent(user.id, 'notifications_viewed', {
    notificationCount: results.length
  });
  
  return createApiSuccess(results);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'notifications_accessed' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    
    if (user) {
      logUserEvent(user.id, 'notifications_fetch_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    return createApiError('server_error', 'Error fetching notifications');
  }
});