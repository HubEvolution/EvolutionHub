import { withAuthApiMiddleware, createApiError } from '@/lib/api-middleware';
import { logAuthFailure } from '@/lib/security-logger';
import { createSecureJsonResponse } from '@/lib/response-helpers';

interface CreateProjectRequestBody {
  title?: string;
  description?: string;
}

type RuntimeWithOptionalUser = App.Locals['runtime'] & {
  user?: { id?: string; sub?: string | null } | null;
};

function resolveUserIdFromLocals(locals: App.Locals): string | null {
  if (locals.user?.id) {
    return locals.user.id;
  }

  const runtime = locals.runtime as RuntimeWithOptionalUser | undefined;
  const runtimeUser = runtime?.user;
  if (runtimeUser) {
    if (typeof runtimeUser.id === 'string' && runtimeUser.id.length > 0) {
      return runtimeUser.id;
    }
    if (
      'sub' in runtimeUser &&
      typeof runtimeUser?.sub === 'string' &&
      runtimeUser.sub.length > 0
    ) {
      return runtimeUser.sub;
    }
  }

  return null;
}

/**
 * POST /api/projects
 * Erstellt ein neues Projekt für den authentifizierten Benutzer.
 *
 * Security-Features:
 * - Rate-Limiting (via Middleware)
 * - Security-Headers (via Middleware)
 * - Audit-Logging
 */
export const POST = withAuthApiMiddleware(
  async (context) => {
    const { request, locals } = context;
    const typedLocals = locals as App.Locals;
    const runtime = typedLocals.runtime as RuntimeWithOptionalUser | undefined;
    const env = runtime?.env;
    const userId = resolveUserIdFromLocals(typedLocals);
    if (!userId) {
      return createApiError('auth_error', 'Authentication required');
    }

    if (!env?.DB) {
      logAuthFailure(userId, {
        reason: 'server_error',
        endpoint: '/api/projects',
        error: 'Database binding missing',
      });
      return createApiError('server_error', 'Database binding missing');
    }

    let requestBody: CreateProjectRequestBody | null = null;
    try {
      const parsed = (await request.json()) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        requestBody = parsed as CreateProjectRequestBody;
      }
    } catch {
      requestBody = null;
    }

    const title = typeof requestBody?.title === 'string' ? requestBody.title : undefined;
    const description =
      typeof requestBody?.description === 'string' ? requestBody.description : undefined;

    // Eingabe validieren
    if (!title) {
      // Tests erwarten logAuthFailure mit userId als erstem Argument
      logAuthFailure(userId, {
        reason: 'validation_failed',
        endpoint: '/api/projects',
      });
      return createApiError('validation_error', 'Title is required');
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
        newProject.updated_at
      ),
      env.DB.prepare(
        'INSERT INTO activities (id, user_id, action, target_id, target_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
      ).bind(
        newActivity.id,
        newActivity.user_id,
        newActivity.action,
        newActivity.target_id,
        newActivity.target_type,
        newActivity.created_at
      ),
    ]);

    // Audit-Event Logging über logApiAccess erfolgt in der Middleware (siehe logMetadata)

    // Tests erwarten kein Wrapper-Objekt, sondern das Projekt direkt
    return createSecureJsonResponse(newProject);
  },
  {
    // Sicherstellen, dass das Access-Log die erwartete Aktion enthält
    logMetadata: { action: 'project_created' },
    onError: (context, _error) => {
      const { clientAddress: _clientAddress, locals } = context;
      const typedLocals = locals as App.Locals;
      const userId = resolveUserIdFromLocals(typedLocals) ?? undefined;

      if (userId) {
        // Tests erwarten logAuthFailure mit reason 'server_error'
        logAuthFailure(userId, {
          reason: 'server_error',
          endpoint: '/api/projects',
        });
      }

      // Tests erwarten Top-Level { type, message }
      return createApiError('server_error', 'Failed to create project');
    },
  }
);
