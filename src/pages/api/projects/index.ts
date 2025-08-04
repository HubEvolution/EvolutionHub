import type { APIRoute } from 'astro';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';

/**
 * POST /api/projects
 * Erstellt ein neues Projekt für den authentifizierten Benutzer.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const POST: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  const { request, locals } = context;
  const { env, user } = locals.runtime;
  const clientAddress = context.clientAddress || '0.0.0.0';
  const endpoint = context.url ? context.url.pathname : '/api/projects';

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

  try {
    const userId = user.sub;
    const { title, description } = await request.json<{ title: string, description?: string }>();

    // Validierung der Eingabedaten
    if (!title) {
      const response = new Response(JSON.stringify({ error: 'Title is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Security-Headers anwenden
      const securedResponse = applySecurityHeaders(response);
      
      // Fehlgeschlagene Validierung protokollieren
      logAuthFailure(userId, {
        reason: 'validation_failed',
        endpoint,
        details: 'Missing title'
      });
      
      return securedResponse;
    }

    const projectId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    const newProject = {
      id: projectId,
      user_id: userId,
      title,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newActivity = {
      id: activityId,
      user_id: userId,
      action: `created project "${title}"`,
      target_id: projectId,
      target_type: 'project',
      created_at: new Date().toISOString(),
    };

    await env.DB.batch([
      env.DB.prepare('INSERT INTO projects (id, user_id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(newProject.id, newProject.user_id, newProject.title, newProject.description, newProject.created_at, newProject.updated_at),
      env.DB.prepare('INSERT INTO activities (id, user_id, action, target_id, target_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(newActivity.id, newActivity.user_id, newActivity.action, newActivity.target_id, newActivity.target_type, newActivity.created_at)
    ]);

    // Erfolgreiche Antwort erstellen
    const response = new Response(JSON.stringify(newProject), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // API-Zugriff protokollieren
    logApiAccess(userId, clientAddress, {
      endpoint,
      method: 'POST',
      action: 'project_created',
      projectId: newProject.id
    });
    
    return securedResponse;
  } catch (e) {
    console.error(e);
    
    // Fehlerantwort erstellen
    const response = new Response(JSON.stringify({ error: 'Failed to create project' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Serverfehler protokollieren
    logAuthFailure(user?.sub || 'unknown', {
      reason: 'server_error',
      endpoint,
      details: e instanceof Error ? e.message : String(e)
    });
    
    return securedResponse;
  }
};
