import type { ProjectCard } from '@/types/dashboard';
import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { withAuthApiMiddleware, createApiError } from '@/lib/api-middleware';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';
import { createSecureJsonResponse } from '@/lib/response-helpers';

/**
 * GET /api/dashboard/projects
 * Ruft die Projekte des authentifizierten Benutzers ab.
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, clientAddress } = context;
    const env = (locals.runtime?.env ?? {}) as Partial<{ DB: D1Database }>;
    const user = locals.user;

    const userId: string | undefined = user?.id as string | undefined;
    if (!userId) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    type Row = {
      id: string;
      title: string;
      description: string;
      progress: number;
      status: ProjectCard['status'];
      lastUpdated: string;
    };

    const { results } = await db
      .prepare(
        `SELECT id, title, description, progress, status, updated_at as lastUpdated FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC`
      )
      .bind(userId)
      .all<Row>();

    const projects: ProjectCard[] = (results ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      progress: Number(p.progress) || 0,
      status: p.status,
      lastUpdated: p.lastUpdated,
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
    return createSecureJsonResponse(projects);
  },
  {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'projects_accessed' },

    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context: APIContext, error: unknown) => {
      const { clientAddress, locals } = context;
      const u = locals?.user as { id?: string; sub?: string } | undefined;
      const userId: string | undefined = u?.id ?? u?.sub;

      if (userId) {
        logAuthFailure(userId, {
          reason: 'server_error',
          endpoint: '/api/dashboard/projects',
          error: error instanceof Error ? error.message : String(error),
          ipAddress: clientAddress,
        });
      }

      return createApiError('server_error', 'Error fetching projects');
    },
  }
);
