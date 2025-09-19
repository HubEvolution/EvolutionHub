import type { ProjectCard } from '@/types/dashboard';
import { withAuthApiMiddleware } from '@/lib/api-middleware';
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
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals, clientAddress } = context;
  const { env } = (locals as any).runtime || {};
  const user = (locals as any).user || (locals as any).runtime?.user;

  const userId: string = (user?.id as string) ?? (user?.sub as string);

  const { results } = await env.DB.prepare(
    `SELECT id, title, description, progress, status, updated_at as lastUpdated FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC`
  )
    .bind(userId)
    .all();

  const projects: ProjectCard[] = (results as any[]).map((p) => ({
    ...p,
    members: [], // members are not stored in the current schema
  }));

  // Expliziter API-Access-Log mit Projektanzahl (für Tests)
  logApiAccess(userId, clientAddress || 'unknown', {
    endpoint: '/api/dashboard/projects',
    method: 'GET',
    action: 'projects_accessed',
    projectCount: projects.length,
  });

  // Plain array JSON zurückgeben (Tests erwarten kein Wrapper-Objekt)
  return new Response(JSON.stringify(projects), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'projects_accessed' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = (locals as any).user || (locals as any).runtime?.user;
    const userId: string | undefined = (user?.id as string) ?? (user?.sub as string);

    if (userId) {
      logAuthFailure(userId, {
        reason: 'server_error',
        endpoint: '/api/dashboard/projects',
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress,
      });
    }

    return new Response(JSON.stringify({ type: 'server_error', message: 'Error fetching projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
