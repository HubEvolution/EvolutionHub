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

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = getAdminEnv(context);
    const db = env.DB as D1Database | undefined;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

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

      let totalSize = 0;
      let completedWithSize = 0;
      let lastBackup: number | null = null;
      const jobsByType: Record<string, number> = {};

      for (const job of jobs) {
        const type = typeof job.type === 'string' ? job.type : String(job.type);
        jobsByType[type] = (jobsByType[type] || 0) + 1;

        if (job.fileSize) {
          totalSize += job.fileSize;
        }
        if (job.status === 'completed' && job.fileSize) {
          completedWithSize += 1;
        }
        if (job.completedAt) {
          const completedAt = Number(job.completedAt);
          if (Number.isFinite(completedAt)) {
            lastBackup = lastBackup === null ? completedAt : Math.max(lastBackup, completedAt);
          }
        }
      }

      const stats = {
        totalJobs: jobs.length,
        completedJobs: jobs.filter((j) => j.status === 'completed').length,
        failedJobs: jobs.filter((j) => j.status === 'failed').length,
        runningJobs: jobs.filter((j) => j.status === 'running').length,
        totalSize,
        averageSize: completedWithSize > 0 ? Math.round(totalSize / completedWithSize) : 0,
        lastBackup,
        jobsByType,
      };

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
