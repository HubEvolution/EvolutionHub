import { withAuthApiMiddleware } from '@/lib/api-middleware';
import { logAuthFailure } from '@/lib/security-logger';

/**
 * POST /api/projects
 * Erstellt ein neues Projekt für den authentifizierten Benutzer.
 *
 * Security-Features:
 * - Rate-Limiting (via Middleware)
 * - Security-Headers (via Middleware)
 * - Audit-Logging
 */
export const POST = withAuthApiMiddleware(async (context) => {
  const { request, locals } = context;
  const { env } = (locals as any).runtime;
  const user = (locals as any).user || (locals as any).runtime?.user;

  const userId: string = (user?.id as string) ?? (user?.sub as string);
  let title: string | undefined;
  let description: string | undefined;
  try {
    const bodyUnknown: unknown = await request.json();
    if (bodyUnknown && typeof bodyUnknown === 'object') {
      const anyBody = bodyUnknown as Record<string, unknown>;
      if (typeof anyBody.title === 'string') title = anyBody.title;
      if (typeof anyBody.description === 'string') description = anyBody.description;
    }
  } catch {
    // ignore parse errors, will be handled by validation below
  }

  // Eingabe validieren
  if (!title) {
    // Tests erwarten logAuthFailure mit userId als erstem Argument
    logAuthFailure(userId, {
      reason: 'validation_failed',
      endpoint: '/api/projects'
    });
    return new Response(JSON.stringify({ error: 'Title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const activityId = crypto.randomUUID();

  const newProject = {
    id: projectId,
    user_id: userId,
    title,
    description: description || '',
    created_at: now,
    updated_at: now,
  };

  const newActivity = {
    id: activityId,
    user_id: userId,
    action: `created project "${title}"`,
    target_id: projectId,
    target_type: 'project',
    created_at: now,
  };

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO projects (id, user_id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(
      newProject.id,
      newProject.user_id,
      newProject.title,
      newProject.description,
      newProject.created_at,
      newProject.updated_at,
    ),
    env.DB.prepare(
      'INSERT INTO activities (id, user_id, action, target_id, target_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(
      newActivity.id,
      newActivity.user_id,
      newActivity.action,
      newActivity.target_id,
      newActivity.target_type,
      newActivity.created_at,
    ),
  ]);

  // Audit-Event Logging über logApiAccess erfolgt in der Middleware (siehe logMetadata)

  // Tests erwarten kein Wrapper-Objekt, sondern das Projekt direkt
  return new Response(JSON.stringify(newProject), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}, {
  // Sicherstellen, dass das Access-Log die erwartete Aktion enthält
  logMetadata: { action: 'project_created' },
  onError: (context, _error) => {
    const { clientAddress: _clientAddress, locals } = context;
    const user = (locals as any).user || (locals as any).runtime?.user;
    const userId: string | undefined = (user?.id as string) ?? (user?.sub as string);

    if (userId) {
      // Tests erwarten logAuthFailure mit reason 'server_error'
      logAuthFailure(userId, {
        reason: 'server_error',
        endpoint: '/api/projects'
      });
    }

    // Tests erwarten Top-Level { type, message }
    return new Response(JSON.stringify({ type: 'server_error', message: 'Failed to create project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  },
});
