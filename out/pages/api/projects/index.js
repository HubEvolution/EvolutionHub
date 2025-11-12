'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const security_logger_1 = require('@/lib/security-logger');
const response_helpers_1 = require('@/lib/response-helpers');
function resolveUserIdFromLocals(locals) {
  if (locals.user?.id) {
    return locals.user.id;
  }
  const runtime = locals.runtime;
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
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const { request, locals } = context;
    const typedLocals = locals;
    const runtime = typedLocals.runtime;
    const env = runtime?.env;
    const userId = resolveUserIdFromLocals(typedLocals);
    if (!userId) {
      return (0, api_middleware_1.createApiError)('auth_error', 'Authentication required');
    }
    if (!env?.DB) {
      (0, security_logger_1.logAuthFailure)(userId, {
        reason: 'server_error',
        endpoint: '/api/projects',
        error: 'Database binding missing',
      });
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
    }
    let requestBody = null;
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        requestBody = parsed;
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
      (0, security_logger_1.logAuthFailure)(userId, {
        reason: 'validation_failed',
        endpoint: '/api/projects',
      });
      return (0, api_middleware_1.createApiError)('validation_error', 'Title is required');
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
    return (0, response_helpers_1.createSecureJsonResponse)(newProject);
  },
  {
    // Sicherstellen, dass das Access-Log die erwartete Aktion enthält
    logMetadata: { action: 'project_created' },
    onError: (context, _error) => {
      const { clientAddress: _clientAddress, locals } = context;
      const typedLocals = locals;
      const userId = resolveUserIdFromLocals(typedLocals) ?? undefined;
      if (userId) {
        // Tests erwarten logAuthFailure mit reason 'server_error'
        (0, security_logger_1.logAuthFailure)(userId, {
          reason: 'server_error',
          endpoint: '/api/projects',
        });
      }
      // Tests erwarten Top-Level { type, message }
      return (0, api_middleware_1.createApiError)('server_error', 'Failed to create project');
    },
  }
);
