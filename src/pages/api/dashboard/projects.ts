import type { APIRoute } from 'astro';
import type { ProjectCard } from '../../../src/types/dashboard';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
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
export const GET: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  const { locals } = context;
  const { env, user } = locals.runtime;
  const clientAddress = context.clientAddress || '0.0.0.0';
  const endpoint = context.url ? context.url.pathname : '/api/dashboard/projects';

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

  const userId = user.sub;

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, title, description, progress, status, updated_at as lastUpdated FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC`
    )
      .bind(userId)
      .all();

    const projects: ProjectCard[] = (results as any[]).map(p => ({
        ...p,
        members: [], // members are not stored in the current schema
    }));

    // Erfolgreiche Antwort erstellen
    const response = new Response(JSON.stringify(projects), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // API-Zugriff protokollieren
    logApiAccess(userId, clientAddress, {
      endpoint,
      method: 'GET',
      action: 'projects_accessed',
      projectCount: projects.length
    });
    
    return securedResponse;
  } catch (e) {
    console.error(e);
    
    // Fehlerantwort erstellen
    const response = new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Serverfehler protokollieren
    logAuthFailure(user.sub, {
      reason: 'server_error',
      endpoint,
      details: e instanceof Error ? e.message : String(e)
    });
    
    return securedResponse;
  }
};
