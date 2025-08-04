import type { APIRoute } from 'astro';
import type { ProjectCard } from '../../../src/types/dashboard';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';

/**
 * GET /api/dashboard/projects
 * Ruft die Projekte des authentifizierten Benutzers ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const GET = withApiMiddleware(async (context) => {
  const { locals, clientAddress, url } = context;
  const { env } = locals.runtime;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/dashboard/projects';

  const userId = user.id;

  const { results } = await env.DB.prepare(
    `SELECT id, title, description, progress, status, updated_at as lastUpdated FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC`
  )
    .bind(userId)
    .all();

  const projects: ProjectCard[] = (results as any[]).map(p => ({
      ...p,
      members: [], // members are not stored in the current schema
  }));
  
  // API-Zugriff protokollieren
  logApiAccess(userId, clientAddress, {
    endpoint,
    method: 'GET',
    action: 'projects_accessed',
    projectCount: projects.length
  });
  
  return createApiSuccess(projects);
}, {
  // Erfordert Authentifizierung
  requireAuth: true,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, url, locals } = context;
    const user = locals.user;
    const endpoint = url ? url.pathname : '/api/dashboard/projects';
    
    console.error('Error fetching projects:', error);
    
    // Serverfehler protokollieren
    logAuthFailure(user ? user.id : clientAddress, {
      reason: 'server_error',
      endpoint,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return createApiError('Internal Server Error', 500);
  }
});
