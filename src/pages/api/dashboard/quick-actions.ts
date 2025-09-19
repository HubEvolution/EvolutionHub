import type { QuickAction } from '@/types/dashboard';
import { withApiMiddleware, createApiSuccess } from '@/lib/api-middleware';
import { logApiAccess } from '@/lib/security-logger';

const quickActions: QuickAction[] = [
  { "id": "qa1", "title": "New Post", "description": "Write a new blog article.", "icon": "✍️", "variant": "primary", "action": "createPost" }
];

/**
 * GET /api/dashboard/quick-actions
 * Ruft die verfügbaren Quick Actions ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe
 */
export const GET = withApiMiddleware(async (context) => {
  const { clientAddress } = context;
  
  // API-Zugriff protokollieren
  logApiAccess('anonymous', clientAddress, {
    event: 'quick_actions_accessed',
    actionCount: quickActions.length
  });
  
  return createApiSuccess(quickActions);
}, {
  // Keine Authentifizierung erforderlich für öffentliche Quick Actions
  requireAuth: false,
  
  // Zusätzliche Logging-Metadaten für den API-Zugriff
  logMetadata: { action: 'public_quick_actions_accessed' }
});