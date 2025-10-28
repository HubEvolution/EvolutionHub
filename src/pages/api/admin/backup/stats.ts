import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { requireAdmin } from '@/lib/auth-helpers';
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { BackupService } from '@/lib/services/backup-service';
import type { AdminBindings } from '@/lib/types/admin';

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = (context.locals?.runtime?.env || {}) as AdminBindings;
    const db = env.DB as D1Database | undefined;
    if (!db) return createApiError('server_error', 'Database unavailable');

    try {
      await requireAdmin({
        req: { header: (n: string) => context.request.headers.get(n) || undefined },
        request: context.request,
        env: { DB: db },
      });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    try {
      const service = new BackupService(drizzle(db));
      const jobs = await service.getBackupJobs(1000);

      const stats = {
        totalJobs: jobs.length,
        completedJobs: jobs.filter((j) => j.status === 'completed').length,
        failedJobs: jobs.filter((j) => j.status === 'failed').length,
        runningJobs: jobs.filter((j) => j.status === 'running').length,
        totalSize: jobs.filter((j) => j.fileSize).reduce((s, j) => s + (j.fileSize || 0), 0),
        averageSize: 0,
        lastBackup: jobs
          .filter((j) => j.completedAt)
          .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0]?.completedAt,
        jobsByType: {} as Record<string, number>,
      };

      const completed = jobs.filter((j) => j.status === 'completed' && j.fileSize);
      if (completed.length > 0) {
        stats.averageSize = Math.round(stats.totalSize / completed.length);
      }

      for (const j of jobs) {
        const t = String(j.type);
        stats.jobsByType[t] = (stats.jobsByType[t] || 0) + 1;
      }

      return createApiSuccess({ stats });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch backup stats';
      return createApiError('server_error', msg);
    }
  },
  { logMetadata: { action: 'admin_backup_stats' } }
);

const methodNotAllowed = (allow: string) => () => createMethodNotAllowed(allow);
export const POST = methodNotAllowed('GET');
export const PUT = methodNotAllowed('GET');
export const PATCH = methodNotAllowed('GET');
export const DELETE = methodNotAllowed('GET');
export const OPTIONS = methodNotAllowed('GET');
export const HEAD = methodNotAllowed('GET');
