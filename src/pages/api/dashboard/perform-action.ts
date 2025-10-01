import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * POST /api/dashboard/perform-action
 * Führt verschiedene Dashboard-Aktionen aus (Projekt erstellen, Task erstellen, etc.)
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const POST = withAuthApiMiddleware(async (context) => {
  const { request, locals, clientAddress } = context;
  const { env } = locals.runtime;
  const user = locals.user as { id: string };
  const userId = user.id;

  let requestData: unknown;
  try {
    requestData = await request.json();
  } catch (_error) {
    // Fehlerhafte Anfrage protokollieren
    logUserEvent(userId, 'invalid_dashboard_request', {
      error: 'Invalid JSON in request body',
      ipAddress: clientAddress
    });
    
    return createApiError('validation_error', 'Invalid JSON in request body');
  }

  if (!requestData || typeof requestData !== 'object' || !('action' in requestData) || typeof (requestData as any).action !== 'string') {
    return createApiError('validation_error', 'Missing or invalid action');
  }
  const { action } = requestData as { action: string };
  const db = env.DB;
  
  let result;
  
  switch (action) {
      case 'create_project': {
        const newProjectId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO projects (id, user_id, title, description, status, progress) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(newProjectId, userId, 'New Project', 'A placeholder project.', 'active', 0).run();
        
        result = { message: 'Project created successfully', projectId: newProjectId };
        
        // Erfolgreiche Aktion protokollieren
        logUserEvent(userId, 'project_created', {
          projectId: newProjectId,
          ipAddress: clientAddress
        });
        
        break;
      }

      case 'create_task': {
        const newTaskId = crypto.randomUUID();
        // Assuming a 'tasks' table exists
        await db.prepare(
          'INSERT INTO tasks (id, user_id, title, status) VALUES (?, ?, ?, ?)'
        ).bind(newTaskId, userId, 'New Task', 'pending').run();
        
        result = { message: 'Task created successfully', taskId: newTaskId };
        
        // Erfolgreiche Aktion protokollieren
        logUserEvent(userId, 'task_created', {
          taskId: newTaskId,
          ipAddress: clientAddress
        });
        
        break;
      }

      case 'invite_member':
        // Placeholder for inviting a team member
        result = { message: 'Invite functionality not yet implemented' };
        
        // Erfolgreiche Aktion protokollieren
        logUserEvent(userId, 'member_invited', {
          ipAddress: clientAddress
        });
        
        break;

      case 'view_docs':
        result = { redirect: '/docs' };
        
        // Erfolgreiche Aktion protokollieren
        logUserEvent(userId, 'docs_viewed', {
          ipAddress: clientAddress
        });
        
        break;

      default:
        // Ungültige Aktion protokollieren
        logUserEvent(userId, 'invalid_dashboard_action', {
          action,
          ipAddress: clientAddress
        });
        
        return createApiError('validation_error', `Invalid action: ${action}`);
  }
  
  // Erfolgreiche Antwort erstellen
  return createApiSuccess(result);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'perform_dashboard_action', method: 'POST' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    
    if (user) {
      logUserEvent(user.id, 'dashboard_action_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    return createApiError('server_error', 'Error performing dashboard action');
  }
});
