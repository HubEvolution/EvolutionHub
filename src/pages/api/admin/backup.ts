/**
 * Admin-API-Endpunkte für Backup und System-Management
 * Nur für Administratoren zugänglich
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { rateLimiter } from 'hono-rate-limiter';
import { drizzle } from 'drizzle-orm/d1';
import { BackupService } from '../../../lib/services/backup-service';
import { log, generateRequestId } from '../../../server/utils/logger';
import { requireAdmin } from '../../../lib/auth-helpers';
import type { BackupOptions } from '../../../lib/types/data-management';

const app = new Hono<{
  Bindings: { DB: D1Database; JWT_SECRET: string };
  Variables: { userId: string; requestId: string };
}>();

// Middleware
// Attach a per-request id for structured logging
app.use('/*', async (c, next) => {
  const rid = generateRequestId();
  c.set('requestId', rid);
  await next();
});
app.use('/*', cors());
app.use('/*', jwt({ secret: process.env.JWT_SECRET! }));
app.use(
  '/*',
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 10,
    keyGenerator: (c) =>
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      c.req.header('x-real-ip') ||
      'anonymous',
  })
); // 10 pro Minute für Admins
app.use('/*', async (c, next) => {
  try {
    const user = await requireAdmin({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });
    c.set('userId', String(user.id));
    await next();
  } catch {
    return c.json(
      {
        success: false,
        error: { type: 'auth_error', message: 'Unauthorized' },
      },
      401
    );
  }
});

/**
 * GET /api/admin/backup/jobs
 * Holt alle Backup-Jobs mit optionaler Filterung
 */
app.get('/jobs', async (c) => {
  try {
    const query = c.req.query();
    const limit = parseInt(query.limit || '50');
    const status = query.status as any;
    const type = query.type as any;

    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    let jobs = await backupService.getBackupJobs(limit);

    // Filter anwenden wenn spezifiziert
    if (status) {
      jobs = jobs.filter((job) => job.status === status);
    }

    if (type) {
      jobs = jobs.filter((job) => job.type === type);
    }

    return c.json({
      success: true,
      data: jobs.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        filePath: job.filePath,
        fileSize: job.fileSize,
        checksum: job.checksum,
        recordCount: job.recordCount,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        triggeredBy: job.triggeredBy,
        isAutomated: job.isAutomated,
      })),
    });
  } catch (error) {
    log('error', 'Error fetching backup jobs', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/jobs',
      method: 'GET',
      userId: String(c.get('userId') ?? 'anonymous'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch backup jobs',
        },
      },
      500
    );
  }
});

/**
 * GET /api/admin/backup/jobs/:id
 * Holt Details eines spezifischen Backup-Jobs
 */
app.get('/jobs/:id', async (c) => {
  try {
    const jobId = c.req.param('id');
    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    const job = await backupService.getBackupJob(jobId);

    if (!job) {
      return c.json(
        {
          success: false,
          error: {
            type: 'not_found',
            message: 'Backup job not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        filePath: job.filePath,
        fileSize: job.fileSize,
        checksum: job.checksum,
        tablesIncluded: job.tablesIncluded,
        recordCount: job.recordCount,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        triggeredBy: job.triggeredBy,
        isAutomated: job.isAutomated,
      },
    });
  } catch (error) {
    log('error', 'Error fetching backup job', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/jobs/:id',
      method: 'GET',
      userId: String(c.get('userId') ?? 'anonymous'),
      jobId: c.req.param('id'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch backup job',
        },
      },
      500
    );
  }
});

/**
 * GET /api/admin/backup/jobs/:id/progress
 * Holt Fortschritt eines laufenden Backup-Jobs
 */
app.get('/jobs/:id/progress', async (c) => {
  try {
    const jobId = c.req.param('id');
    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    const progress = await backupService.getBackupProgress(jobId);

    if (!progress) {
      return c.json(
        {
          success: false,
          error: {
            type: 'not_found',
            message: 'Backup job not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    log('error', 'Error fetching backup progress', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/jobs/:id/progress',
      method: 'GET',
      userId: String(c.get('userId') ?? 'anonymous'),
      jobId: c.req.param('id'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch backup progress',
        },
      },
      500
    );
  }
});

/**
 * POST /api/admin/backup/create
 * Erstellt einen neuen Backup-Job
 */
app.post('/create', async (c) => {
  try {
    const adminId = c.get('userId') as string;
    const body = await c.req.json<BackupOptions & { description?: string }>();
    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    // Validierung
    if (!body.type) {
      return c.json(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Backup type is required',
          },
        },
        400
      );
    }

    const allowedTypes = ['full', 'comments', 'users', 'incremental'];
    if (!allowedTypes.includes(body.type)) {
      return c.json(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Invalid backup type',
          },
        },
        400
      );
    }

    const jobId = await backupService.createBackupJob(body, adminId);

    return c.json({
      success: true,
      data: {
        jobId,
        message: 'Backup job created successfully',
      },
    });
  } catch (error) {
    log('error', 'Error creating backup job', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/create',
      method: 'POST',
      userId: String(c.get('userId') ?? 'anonymous'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to create backup job',
        },
      },
      500
    );
  }
});

/**
 * POST /api/admin/backup/schedule
 * Plant einen automatischen Backup
 */
app.post('/schedule', async (c) => {
  try {
    const adminId = c.get('userId') as string;
    const body = await c.req.json<{
      type: string;
      cronExpression: string;
      description?: string;
    }>();

    if (!body.type || !body.cronExpression) {
      return c.json(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Backup type and cron expression are required',
          },
        },
        400
      );
    }

    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    await backupService.scheduleAutomatedBackup(body.type, body.cronExpression);

    return c.json({
      success: true,
      data: {
        message: 'Automated backup scheduled successfully',
      },
    });
  } catch (error) {
    log('error', 'Error scheduling backup', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/schedule',
      method: 'POST',
      userId: String(c.get('userId') ?? 'anonymous'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to schedule backup',
        },
      },
      500
    );
  }
});

/**
 * POST /api/admin/maintenance/perform
 * Führt System-Wartung durch
 */
app.post('/maintenance/perform', async (c) => {
  try {
    const adminId = c.get('userId') as string;
    const body = await c.req.json<{
      type: 'cleanup' | 'optimization' | 'migration' | 'repair';
      description: string;
    }>();

    if (!body.type || !body.description) {
      return c.json(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Maintenance type and description are required',
          },
        },
        400
      );
    }

    const allowedTypes = ['cleanup', 'optimization', 'migration', 'repair'];
    if (!allowedTypes.includes(body.type)) {
      return c.json(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Invalid maintenance type',
          },
        },
        400
      );
    }

    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    const maintenanceId = await backupService.performMaintenance(
      body.type,
      body.description,
      adminId
    );

    return c.json({
      success: true,
      data: {
        maintenanceId,
        message: 'Maintenance job started successfully',
      },
    });
  } catch (error) {
    log('error', 'Error starting maintenance', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/maintenance/perform',
      method: 'POST',
      userId: String(c.get('userId') ?? 'anonymous'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to start maintenance',
        },
      },
      500
    );
  }
});

/**
 * GET /api/admin/maintenance/jobs
 * Holt alle Wartungsjobs
 */
app.get('/maintenance/jobs', async (c) => {
  try {
    const query = c.req.query();
    const limit = parseInt(query.limit || '50');

    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    const jobs = await backupService.getMaintenanceJobs(limit);

    return c.json({
      success: true,
      data: jobs.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        description: job.description,
        affectedTables: job.affectedTables,
        parameters: job.parameters,
        logOutput: job.logOutput,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        triggeredBy: job.triggeredBy,
        isAutomated: job.isAutomated,
      })),
    });
  } catch (error) {
    log('error', 'Error fetching maintenance jobs', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/maintenance/jobs',
      method: 'GET',
      userId: String(c.get('userId') ?? 'anonymous'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch maintenance jobs',
        },
      },
      500
    );
  }
});

/**
 * GET /api/admin/maintenance/jobs/:id
 * Holt Details eines spezifischen Wartungsjobs
 */
app.get('/maintenance/jobs/:id', async (c) => {
  try {
    const jobId = c.req.param('id');
    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    const job = await backupService.getMaintenanceJob(jobId);

    if (!job) {
      return c.json(
        {
          success: false,
          error: {
            type: 'not_found',
            message: 'Maintenance job not found',
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        description: job.description,
        affectedTables: job.affectedTables,
        parameters: job.parameters,
        logOutput: job.logOutput,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        triggeredBy: job.triggeredBy,
        isAutomated: job.isAutomated,
      },
    });
  } catch (error) {
    log('error', 'Error fetching maintenance job', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/maintenance/jobs/:id',
      method: 'GET',
      userId: String(c.get('userId') ?? 'anonymous'),
      jobId: c.req.param('id'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch maintenance job',
        },
      },
      500
    );
  }
});

/**
 * POST /api/admin/backup/cleanup
 * Bereinigt alte Backups
 */
app.post('/cleanup', async (c) => {
  try {
    const _adminId = c.get('userId') as string;
    const body = await c.req.json<{ retentionDays?: number }>();
    const retentionDays = body.retentionDays || 30;

    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    const deletedCount = await backupService.cleanupOldBackups(retentionDays);

    return c.json({
      success: true,
      data: {
        deletedCount,
        message: `${deletedCount} old backups cleaned up`,
      },
    });
  } catch (error) {
    log('error', 'Error during backup cleanup', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/cleanup',
      method: 'POST',
      userId: String(c.get('userId') ?? 'anonymous'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to cleanup old backups',
        },
      },
      500
    );
  }
});

/**
 * POST /api/admin/backup/verify/:id
 * Verifiziert Integrität eines Backups
 */
app.post('/verify/:id', async (c) => {
  try {
    const jobId = c.req.param('id');
    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    const isValid = await backupService.verifyBackupIntegrity(jobId);

    return c.json({
      success: true,
      data: {
        isValid,
        message: isValid ? 'Backup integrity verified' : 'Backup integrity check failed',
      },
    });
  } catch (error) {
    log('error', 'Error verifying backup', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/verify/:id',
      method: 'POST',
      userId: String(c.get('userId') ?? 'anonymous'),
      jobId: c.req.param('id'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to verify backup integrity',
        },
      },
      500
    );
  }
});

/**
 * GET /api/admin/backup/stats
 * Holt Backup-Statistiken
 */
app.get('/stats', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const backupService = new BackupService(db);

    // Holt alle Backup-Jobs für Statistiken
    const jobs = await backupService.getBackupJobs(1000);

    const stats = {
      totalJobs: jobs.length,
      completedJobs: jobs.filter((job) => job.status === 'completed').length,
      failedJobs: jobs.filter((job) => job.status === 'failed').length,
      runningJobs: jobs.filter((job) => job.status === 'running').length,
      totalSize: jobs
        .filter((job) => job.fileSize)
        .reduce((sum, job) => sum + (job.fileSize || 0), 0),
      averageSize: 0,
      lastBackup: jobs
        .filter((job) => job.completedAt)
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0]?.completedAt,
      jobsByType: {} as Record<string, number>,
    };

    // Berechne Durchschnittsgröße
    const completedJobs = jobs.filter((job) => job.status === 'completed' && job.fileSize);
    if (completedJobs.length > 0) {
      stats.averageSize = Math.round(stats.totalSize / completedJobs.length);
    }

    // Gruppiere nach Typ
    jobs.forEach((job) => {
      stats.jobsByType[job.type] = (stats.jobsByType[job.type] || 0) + 1;
    });

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log('error', 'Error fetching backup statistics', {
      requestId: c.get('requestId'),
      endpoint: '/api/admin/backup/stats',
      method: 'GET',
      userId: String(c.get('userId') ?? 'anonymous'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch backup statistics',
        },
      },
      500
    );
  }
});

export default app;
