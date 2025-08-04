import type { APIContext } from 'astro';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';

/**
 * POST /api/dashboard/perform-action
 * Führt verschiedene Dashboard-Aktionen aus (Projekt erstellen, Task erstellen, etc.)
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const POST = withApiMiddleware(async (context) => {
  const { request, locals, clientAddress, url } = context;
  const { env } = locals.runtime;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/dashboard/perform-action';
  const userId = user.id;

  let requestData;
  try {
    requestData = await request.json();
  } catch (error) {
    // Fehlerhafte Anfrage protokollieren
    logAuthFailure(userId, {
      reason: 'invalid_request',
      endpoint,
      details: 'Invalid JSON in request body'
    });
    
    return createApiError('Invalid JSON in request body', 400);
  }

  const { action } = requestData;
  const db = env.DB;

  try {
    let result;
    
    switch (action) {
      case 'create_project': {
        const newProjectId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO projects (id, user_id, title, description, status, progress) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(newProjectId, userId, 'New Project', 'A placeholder project.', 'active', 0).run();
        
        result = { message: 'Project created successfully', projectId: newProjectId };
        
        // Erfolgreiche Aktion protokollieren
        logApiAccess(userId, clientAddress, {
          endpoint,
          method: 'POST',
          action: 'create_project',
          projectId: newProjectId
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
        logApiAccess(userId, clientAddress, {
          endpoint,
          method: 'POST',
          action: 'create_task',
          taskId: newTaskId
        });
        
        break;
      }

      case 'invite_member':
        // Placeholder for inviting a team member
        result = { message: 'Invite functionality not yet implemented' };
        
        // Erfolgreiche Aktion protokollieren
        logApiAccess(userId, clientAddress, {
          endpoint,
          method: 'POST',
          action: 'invite_member'
        });
        
        break;

      case 'view_docs':
        result = { redirect: '/docs' };
        
        // Erfolgreiche Aktion protokollieren
        logApiAccess(userId, clientAddress, {
          endpoint,
          method: 'POST',
          action: 'view_docs'
        });
        
        break;

      default:
        // Ungültige Aktion protokollieren
        logAuthFailure(userId, {
          reason: 'invalid_action',
          endpoint,
          details: `Invalid action: ${action}`
        });
        
        return createApiError('Invalid action', 400);
    }
    
    // Erfolgreiche Antwort erstellen
    return createApiSuccess(result);
  } catch (error) {
    throw error; // Fehler an die Middleware weiterleiten
  }
}, {
  // Erfordert Authentifizierung
  requireAuth: true,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, url, locals } = context;
    const user = locals.user;
    const endpoint = url ? url.pathname : '/api/dashboard/perform-action';
    
    console.error('Error performing dashboard action:', error);
    
    // Serverfehler protokollieren
    logAuthFailure(user ? user.id : clientAddress, {
      reason: 'server_error',
      endpoint,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return createApiError('Internal Server Error', 500);
  }
});
