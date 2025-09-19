import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * GET /api/dashboard/stats
 * Ruft Dashboard-Statistiken für den authentifizierten Benutzer ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
export const GET = withAuthApiMiddleware(async (context) => {
  const { locals, clientAddress } = context;
  const { env } = locals.runtime;
  const user = locals.user;
  
  if (!user) {
    return createApiError('auth_error', 'Unauthorized');
  }
  const userId = user.id;
  const db = env.DB;

  const projectsQuery = db.prepare('SELECT count(*) as count FROM projects WHERE user_id = ?').bind(userId);
  const tasksQuery = db.prepare('SELECT count(*) as count FROM tasks WHERE user_id = ?').bind(userId);
  // Assuming a simple count for team members for now
  const teamMembersQuery = db.prepare('SELECT count(*) as count FROM users').bind();

  const [projectsResult, tasksResult, teamMembersResult] = await Promise.all([
    projectsQuery.first(),
    tasksQuery.first(),
    teamMembersQuery.first()
  ]);

  const stats = {
    projects: projectsResult?.count || 0,
    tasks: tasksResult?.count || 0,
    teamMembers: teamMembersResult?.count || 0,
  };
  
  // Benutzeraktion protokollieren
  logUserEvent(userId, 'dashboard_stats_viewed', {
    statCounts: {
      projects: stats.projects,
      tasks: stats.tasks,
      teamMembers: stats.teamMembers
    },
    ipAddress: clientAddress
  });
  
  return createApiSuccess(stats);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'dashboard_stats_accessed' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    
    if (user) {
      logUserEvent(user.id, 'stats_fetch_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    return createApiError('server_error', 'Error fetching dashboard statistics');
  }
});