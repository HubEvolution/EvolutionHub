"use strict";
/**
 * API-Endpunkte für Daten-Export und GDPR-konforme Datenportabilität
 * Unterstützt verschiedene Export-Formate und Datenlöschung
 */
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const jwt_1 = require("hono/jwt");
const hono_rate_limiter_1 = require("hono-rate-limiter");
const d1_1 = require("drizzle-orm/d1");
const drizzle_orm_1 = require("drizzle-orm");
const data_export_service_1 = require("../../../lib/services/data-export-service");
const auth_helpers_1 = require("../../../lib/auth-helpers");
const schema_1 = require("../../../lib/db/schema");
const logger_1 = require("../../../server/utils/logger");
const app = new hono_1.Hono();
// Middleware
// Attach requestId for structured logging
app.use('/*', async (c, next) => {
    c.set('requestId', (0, logger_1.generateRequestId)());
    await next();
});
app.use('/*', (0, cors_1.cors)());
app.use('/create', (0, jwt_1.jwt)({ secret: process.env.JWT_SECRET }));
app.use('/create', (0, hono_rate_limiter_1.rateLimiter)({
    windowMs: 60 * 1000,
    limit: 5,
    keyGenerator: (c) => c.req.header('CF-Connecting-IP') ||
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-forwarded-for') ||
        c.req.header('x-real-ip') ||
        'anonymous',
})); // 5 pro Minute
app.use('/delete', (0, jwt_1.jwt)({ secret: process.env.JWT_SECRET }));
app.use('/delete', (0, hono_rate_limiter_1.rateLimiter)({
    windowMs: 60 * 1000,
    limit: 3,
    keyGenerator: (c) => c.req.header('CF-Connecting-IP') ||
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-forwarded-for') ||
        c.req.header('x-real-ip') ||
        'anonymous',
})); // 3 pro Minute
/**
 * GET /api/data-export/jobs
 * Holt alle Export-Jobs für den aktuellen Benutzer
 */
app.get('/jobs', async (c) => {
    try {
        const user = await (0, auth_helpers_1.requireAuth)(c);
        const userId = String(user.id);
        const db = (0, d1_1.drizzle)(c.env.DB);
        const exportService = new data_export_service_1.DataExportService(db);
        const jobs = await exportService.getUserExportJobs(userId);
        return c.json({
            success: true,
            data: jobs.map((job) => ({
                id: job.id,
                type: job.type,
                status: job.status,
                format: job.format,
                fileSize: job.fileSize,
                downloadUrl: job.downloadUrl,
                expiresAt: job.expiresAt,
                requestedAt: job.requestedAt,
                completedAt: job.completedAt,
                downloadCount: job.downloadCount,
            })),
        });
    }
    catch (error) {
        (0, logger_1.log)('error', 'Error fetching export jobs', {
            requestId: c.get('requestId'),
            endpoint: '/api/data-export/jobs',
            method: 'GET',
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return c.json({
            success: false,
            error: {
                type: 'server_error',
                message: 'Failed to fetch export jobs',
            },
        }, 500);
    }
});
/**
 * GET /api/data-export/jobs/:id
 * Holt Details eines spezifischen Export-Jobs
 */
app.get('/jobs/:id', async (c) => {
    try {
        const user = await (0, auth_helpers_1.requireAuth)(c);
        const userId = String(user.id);
        const jobId = c.req.param('id');
        const db = (0, d1_1.drizzle)(c.env.DB);
        const exportService = new data_export_service_1.DataExportService(db);
        const job = await exportService.getExportJob(jobId);
        // Sicherheitscheck: Job gehört zum Benutzer
        if (!job || job.userId !== userId) {
            return c.json({
                success: false,
                error: {
                    type: 'not_found',
                    message: 'Export job not found',
                },
            }, 404);
        }
        return c.json({
            success: true,
            data: {
                id: job.id,
                type: job.type,
                status: job.status,
                format: job.format,
                fileSize: job.fileSize,
                downloadUrl: job.downloadUrl,
                expiresAt: job.expiresAt,
                requestedAt: job.requestedAt,
                completedAt: job.completedAt,
                downloadCount: job.downloadCount,
                errorMessage: job.errorMessage,
            },
        });
    }
    catch (error) {
        (0, logger_1.log)('error', 'Error fetching export job', {
            requestId: c.get('requestId'),
            endpoint: '/api/data-export/jobs/:id',
            method: 'GET',
            jobId: c.req.param('id'),
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return c.json({
            success: false,
            error: {
                type: 'server_error',
                message: 'Failed to fetch export job',
            },
        }, 500);
    }
});
/**
 * GET /api/data-export/jobs/:id/progress
 * Holt Fortschritt eines laufenden Export-Jobs
 */
app.get('/jobs/:id/progress', async (c) => {
    try {
        const user = await (0, auth_helpers_1.requireAuth)(c);
        const userId = String(user.id);
        const jobId = c.req.param('id');
        const db = (0, d1_1.drizzle)(c.env.DB);
        const exportService = new data_export_service_1.DataExportService(db);
        const job = await exportService.getExportJob(jobId);
        // Sicherheitscheck: Job gehört zum Benutzer
        if (!job || job.userId !== userId) {
            return c.json({
                success: false,
                error: {
                    type: 'not_found',
                    message: 'Export job not found',
                },
            }, 404);
        }
        const progress = await exportService.getExportProgress(jobId);
        return c.json({
            success: true,
            data: progress,
        });
    }
    catch (error) {
        (0, logger_1.log)('error', 'Error fetching export progress', {
            requestId: c.get('requestId'),
            endpoint: '/api/data-export/jobs/:id/progress',
            method: 'GET',
            jobId: c.req.param('id'),
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return c.json({
            success: false,
            error: {
                type: 'server_error',
                message: 'Failed to fetch export progress',
            },
        }, 500);
    }
});
/**
 * POST /api/data-export/create
 * Erstellt einen neuen Daten-Export-Job
 */
app.post('/create', async (c) => {
    try {
        const user = await (0, auth_helpers_1.requireAuth)(c);
        const userId = String(user.id);
        const body = await c.req.json();
        const db = (0, d1_1.drizzle)(c.env.DB);
        const exportService = new data_export_service_1.DataExportService(db);
        // Validierung
        if (!body.type || !body.format) {
            return c.json({
                success: false,
                error: {
                    type: 'validation_error',
                    message: 'Export type and format are required',
                },
            }, 400);
        }
        const allowedTypes = ['user_data', 'comments', 'notifications', 'full_export'];
        const allowedFormats = ['json', 'csv', 'xml'];
        if (!allowedTypes.includes(body.type)) {
            return c.json({
                success: false,
                error: {
                    type: 'validation_error',
                    message: 'Invalid export type',
                },
            }, 400);
        }
        if (!allowedFormats.includes(body.format)) {
            return c.json({
                success: false,
                error: {
                    type: 'validation_error',
                    message: 'Invalid export format',
                },
            }, 400);
        }
        const jobId = await exportService.createExportJob(userId, body);
        return c.json({
            success: true,
            data: {
                jobId,
                message: 'Export job created successfully',
            },
        });
    }
    catch (error) {
        (0, logger_1.log)('error', 'Error creating export job', {
            requestId: c.get('requestId'),
            endpoint: '/api/data-export/create',
            method: 'POST',
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return c.json({
            success: false,
            error: {
                type: 'server_error',
                message: 'Failed to create export job',
            },
        }, 500);
    }
});
/**
 * GET /api/data-export/download/:id
 * Lädt eine Export-Datei herunter
 */
app.get('/download/:id', async (c) => {
    try {
        const user = await (0, auth_helpers_1.requireAuth)(c);
        const userId = String(user.id);
        const jobId = c.req.param('id');
        const db = (0, d1_1.drizzle)(c.env.DB);
        const exportService = new data_export_service_1.DataExportService(db);
        const job = await exportService.getExportJob(jobId);
        // Sicherheitschecks
        if (!job || job.userId !== userId) {
            return c.json({
                success: false,
                error: {
                    type: 'not_found',
                    message: 'Export job not found',
                },
            }, 404);
        }
        if (job.status !== 'completed') {
            return c.json({
                success: false,
                error: {
                    type: 'validation_error',
                    message: 'Export job is not completed yet',
                },
            }, 400);
        }
        if (!job.downloadUrl || !job.expiresAt || job.expiresAt < Date.now()) {
            return c.json({
                success: false,
                error: {
                    type: 'validation_error',
                    message: 'Download URL has expired',
                },
            }, 400);
        }
        // In einer echten Implementierung würde hier die Datei aus R2 geladen
        // und als Response zurückgegeben werden
        // Simuliere Download
        const mockContent = JSON.stringify({
            message: 'This would be your exported data',
            jobId: job.id,
            type: job.type,
            format: job.format,
        });
        // Update download count
        await db
            .update(schema_1.dataExportJobs)
            .set({
            downloadCount: (job.downloadCount || 0) + 1,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.dataExportJobs.id, jobId));
        return c.body(mockContent, 200, {
            'Content-Type': getContentType(job.format),
            'Content-Disposition': `attachment; filename="export-${jobId}.${getFileExtension(job.format)}"`,
        });
    }
    catch (error) {
        (0, logger_1.log)('error', 'Error downloading export', {
            requestId: c.get('requestId'),
            endpoint: '/api/data-export/download/:id',
            method: 'GET',
            jobId: c.req.param('id'),
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return c.json({
            success: false,
            error: {
                type: 'server_error',
                message: 'Failed to download export',
            },
        }, 500);
    }
});
/**
 * POST /api/data-export/delete-request
 * Erstellt eine Datenlösch-Anfrage (GDPR Right to Erasure)
 */
app.post('/delete-request', async (c) => {
    try {
        const user = await (0, auth_helpers_1.requireAuth)(c);
        const userId = String(user.id);
        const body = await c.req.json();
        const db = (0, d1_1.drizzle)(c.env.DB);
        const exportService = new data_export_service_1.DataExportService(db);
        const requestId = await exportService.createDeletionRequest(userId, body.reason);
        return c.json({
            success: true,
            data: {
                requestId,
                message: 'Deletion request created. Please check your email for verification instructions.',
            },
        });
    }
    catch (error) {
        (0, logger_1.log)('error', 'Error creating deletion request', {
            requestId: c.get('requestId'),
            endpoint: '/api/data-export/delete-request',
            method: 'POST',
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return c.json({
            success: false,
            error: {
                type: 'server_error',
                message: 'Failed to create deletion request',
            },
        }, 500);
    }
});
/**
 * POST /api/data-export/verify-deletion
 * Verifiziert und verarbeitet eine Datenlösch-Anfrage
 */
app.post('/verify-deletion', async (c) => {
    try {
        const body = await c.req.json();
        if (!body.requestId || !body.verificationToken) {
            return c.json({
                success: false,
                error: {
                    type: 'validation_error',
                    message: 'Request ID and verification token are required',
                },
            }, 400);
        }
        const db = (0, d1_1.drizzle)(c.env.DB);
        const exportService = new data_export_service_1.DataExportService(db);
        const success = await exportService.processDeletionRequest(body.requestId, body.verificationToken);
        if (!success) {
            return c.json({
                success: false,
                error: {
                    type: 'validation_error',
                    message: 'Invalid or expired deletion request',
                },
            }, 400);
        }
        return c.json({
            success: true,
            data: {
                message: 'Deletion request verified and processed successfully',
            },
        });
    }
    catch (error) {
        (0, logger_1.log)('error', 'Error processing deletion request', {
            requestId: c.get('requestId'),
            endpoint: '/api/data-export/verify-deletion',
            method: 'POST',
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return c.json({
            success: false,
            error: {
                type: 'server_error',
                message: 'Failed to process deletion request',
            },
        }, 500);
    }
});
/**
 * GET /api/data-export/gdpr-info
 * Holt GDPR-konforme Informationen über Datenverarbeitung
 */
app.get('/gdpr-info', (c) => {
    const gdprInfo = {
        dataCategories: [
            'Account information (email, name)',
            'Comments and posts',
            'Notifications and preferences',
            'Usage statistics and analytics',
        ],
        retentionPeriods: {
            'Account data': 'Until account deletion or 3 years after last activity',
            Comments: 'Until account deletion or manual removal',
            Notifications: '90 days after being read',
            Analytics: '2 years for aggregated data',
        },
        thirdPartyTransfers: [
            'Cloudflare (hosting and CDN)',
            'Email service provider (notifications)',
            'Analytics service (usage statistics)',
        ],
        securityMeasures: [
            'End-to-end encryption for sensitive data',
            'Regular security audits',
            'Access controls and authentication',
            'Data backup and disaster recovery',
        ],
        dataProcessingPurposes: [
            'Providing commenting functionality',
            'Sending notifications',
            'Improving user experience',
            'Complying with legal obligations',
        ],
        userRights: [
            'Right to access your data',
            'Right to data portability',
            'Right to rectification',
            'Right to erasure',
            'Right to restrict processing',
            'Right to object to processing',
        ],
    };
    return c.json({
        success: true,
        data: gdprInfo,
    });
});
/**
 * Hilfsfunktionen
 */
function getContentType(format) {
    switch (format) {
        case 'json':
            return 'application/json';
        case 'csv':
            return 'text/csv';
        case 'xml':
            return 'application/xml';
        default:
            return 'application/octet-stream';
    }
}
function getFileExtension(format) {
    switch (format) {
        case 'json':
            return 'json';
        case 'csv':
            return 'csv';
        case 'xml':
            return 'xml';
        default:
            return 'dat';
    }
}
exports.default = app;
