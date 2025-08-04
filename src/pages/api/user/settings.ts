import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiSuccess } from '@/lib/api-middleware';
import { logApiAccess } from '@/lib/security-logger';

/**
 * PUT /api/user/settings
 * Aktualisiert die Benutzereinstellungen
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const PUT = withApiMiddleware(async (context) => {
  const { locals, clientAddress, url } = context;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/user/settings';
  
  // Hier würde die eigentliche Einstellungsaktualisierung implementiert werden
  // TODO: Implementiere die Einstellungsaktualisierung
  
  // API-Zugriff protokollieren
  logApiAccess(user.id, clientAddress, {
    endpoint,
    method: 'PUT',
    action: 'settings_update'
  });
  
  return createApiSuccess({ message: 'Settings updated successfully' });
}, {
  // Erfordert Authentifizierung
  requireAuth: true,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    console.error('Settings update error:', error);
    
    return new Response(JSON.stringify({ error: 'An unknown error occurred during settings update' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});