import type { APIRoute } from 'astro';
import type { ProjectCard } from '../../../src/types/dashboard';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * GET /api/dashboard/projects
 * Ruft die Projekte des authentifizierten Benutzers ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals, clientAddress } = context;
  const { env } = locals.runtime;
  const user = locals.user;

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
  
  // Zusätzliches Benutzerverhalten protokollieren
  logUserEvent(userId, 'projects_viewed', {
    projectCount: projects.length,
    ipAddress: clientAddress
  });
  
  return createApiSuccess(projects);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'projects_accessed' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    
    if (user) {
      logUserEvent(user.id, 'projects_fetch_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    return createApiError('server_error', 'Error fetching projects');
  }
});
