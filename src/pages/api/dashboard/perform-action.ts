import type { APIContext } from 'astro';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
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
export async function POST(context: APIContext): Promise<Response> {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  const locals = context.locals as any;
  const clientAddress = context.clientAddress || '0.0.0.0';
  const endpoint = context.url ? context.url.pathname : '/api/dashboard/perform-action';
  
  // Wenn kein Benutzer authentifiziert ist, 401 zurückgeben und Fehler protokollieren
  if (!locals.user) {
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

  let requestData;
  try {
    requestData = await context.request.json();
  } catch (error) {
    const response = new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Fehlerhafte Anfrage protokollieren
    logAuthFailure(locals.user.id, {
      reason: 'invalid_request',
      endpoint,
      details: 'Invalid JSON in request body'
    });
    
    return securedResponse;
  }

  const { action } = requestData;
  const userId = locals.user.id;
  const db = locals.runtime.env.DB;

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
        
        const invalidResponse = new Response(JSON.stringify({ error: 'Invalid action' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Security-Headers anwenden
        return applySecurityHeaders(invalidResponse);
    }
    
    // Erfolgreiche Antwort erstellen
    const response = new Response(JSON.stringify(result), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    return applySecurityHeaders(response);
    
  } catch (error) {
    console.error(`Error performing action '${action}':`, error);
    
    // Fehlerantwort erstellen
    const response = new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Serverfehler protokollieren
    logAuthFailure(userId, {
      reason: 'server_error',
      endpoint,
      action,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return securedResponse;
  }
}
