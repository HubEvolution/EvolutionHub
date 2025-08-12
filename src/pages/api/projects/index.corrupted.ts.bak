import type { APIRoute } from 'astro';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * POST /api/projects
 * Erstellt ein neues Projekt für den authentifizierten Benutzer.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const POST = withAuthApiMiddleware(async (context) => {
  const { request, locals, clientAddress } = context;
  const { env } = locals.runtime;
  const user = locals.user;

  const userId = user.id;
  const { title, description } = await request.json<{ title: string, description?: string }>();

  // Validierung der Eingabedaten
  if (!title) {
    // Fehlgeschlagene Validierung protokollieren
    logUserEvent(userId, 'project_validation_failed', {
      reason: 'missing_title',
      ipAddress: clientAddress
    });
    
    return createApiError('validation_error', 'Title is required');
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
  
  // Projekterstellung protokollieren
  logUserEvent(userId, 'project_created', {
    projectId: newProject.id,
    projectTitle: title,
    ipAddress: clientAddress
  });
  
  return createApiSuccess(newProject, 201);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'project_create' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    
    if (user) {
      logUserEvent(user.id, 'project_creation_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    return createApiError('server_error', 'Failed to create project');
  }
});
