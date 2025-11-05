"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const validation_1 = require("@/lib/validation");
const dashboard_1 = require("@/lib/validation/schemas/dashboard");
const security_logger_1 = require("@/lib/security-logger");
/**
 * POST /api/dashboard/perform-action
 * Führt verschiedene Dashboard-Aktionen aus (Projekt erstellen, Task erstellen, etc.)
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Authentifizierungsfehler
 */
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { request, locals, clientAddress } = context;
    const env = (locals.runtime?.env ?? {});
    const user = locals.user;
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const userId = user.id;
    const db = env.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const unknownBody = await request.json().catch(() => null);
    const parsed = dashboard_1.dashboardActionSchema.safeParse(unknownBody);
    if (!parsed.success) {
        // Fehlerhafte Anfrage protokollieren
        (0, security_logger_1.logUserEvent)(userId, 'invalid_dashboard_request', {
            error: 'Invalid JSON in request body',
            ipAddress: clientAddress,
        });
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body', {
            details: (0, validation_1.formatZodError)(parsed.error),
        });
    }
    const { action } = parsed.data;
    let result;
    switch (action) {
        case 'create_project': {
            const newProjectId = crypto.randomUUID();
            await db
                .prepare('INSERT INTO projects (id, user_id, title, description, status, progress) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(newProjectId, userId, 'New Project', 'A placeholder project.', 'active', 0)
                .run();
            result = { message: 'Project created successfully', projectId: newProjectId };
            // Erfolgreiche Aktion protokollieren
            (0, security_logger_1.logUserEvent)(userId, 'project_created', {
                projectId: newProjectId,
                ipAddress: clientAddress,
            });
            break;
        }
        case 'create_task': {
            const newTaskId = crypto.randomUUID();
            // Assuming a 'tasks' table exists
            await db
                .prepare('INSERT INTO tasks (id, user_id, title, status) VALUES (?, ?, ?, ?)')
                .bind(newTaskId, userId, 'New Task', 'pending')
                .run();
            result = { message: 'Task created successfully', taskId: newTaskId };
            // Erfolgreiche Aktion protokollieren
            (0, security_logger_1.logUserEvent)(userId, 'task_created', {
                taskId: newTaskId,
                ipAddress: clientAddress,
            });
            break;
        }
        case 'invite_member':
            // Placeholder for inviting a team member
            result = { message: 'Invite functionality not yet implemented' };
            // Erfolgreiche Aktion protokollieren
            (0, security_logger_1.logUserEvent)(userId, 'member_invited', {
                ipAddress: clientAddress,
            });
            break;
        case 'view_docs':
            result = { redirect: '/docs' };
            // Erfolgreiche Aktion protokollieren
            (0, security_logger_1.logUserEvent)(userId, 'docs_viewed', {
                ipAddress: clientAddress,
            });
            break;
        default:
            // Ungültige Aktion protokollieren
            (0, security_logger_1.logUserEvent)(userId, 'invalid_dashboard_action', {
                action,
                ipAddress: clientAddress,
            });
            return (0, api_middleware_1.createApiError)('validation_error', `Invalid action: ${action}`);
    }
    // Erfolgreiche Antwort erstellen
    return (0, api_middleware_1.createApiSuccess)(result);
}, {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'perform_dashboard_action', method: 'POST' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
        const { clientAddress, locals } = context;
        const user = locals.user;
        if (user) {
            (0, security_logger_1.logUserEvent)(user.id, 'dashboard_action_error', {
                error: error instanceof Error ? error.message : String(error),
                ipAddress: clientAddress,
            });
        }
        return (0, api_middleware_1.createApiError)('server_error', 'Error performing dashboard action');
    },
});
