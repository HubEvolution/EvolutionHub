import type { APIContext } from 'astro';
import type { Notification } from '../../../types/dashboard';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';

/**
 * GET /api/dashboard/notifications
 * Ruft die Benachrichtigungen des authentifizierten Benutzers ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
export const GET = withApiMiddleware(async (context) => {
  const { locals, clientAddress, url } = context;
  const { env } = locals.runtime;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/dashboard/notifications';
  
  const stmt = env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').bind(user.id);
  const { results } = await stmt.all();
  
  // API-Zugriff protokollieren
  logApiAccess(user.id, clientAddress, {
    endpoint,
    method: 'GET',
    action: 'notifications_accessed',
    notificationCount: results.length
  });
  
  return createApiSuccess(results);
}, {
  // Erfordert Authentifizierung
  requireAuth: true,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, url, locals } = context;
    const user = locals.user;
    const endpoint = url ? url.pathname : '/api/dashboard/notifications';
    
    console.error('Error fetching notifications:', error);
    
    // Serverfehler protokollieren
    logAuthFailure(user ? user.id : clientAddress, {
      reason: 'server_error',
      endpoint,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return createApiError('Internal Server Error', 500);
  }
});