import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { BackupService } from '@/lib/services/backup-service';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import type { BackupOptions } from '@/lib/types/data-management';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

function isBackupJobType(value: string): value is BackupOptions['type'] {
  return ['full', 'comments', 'users', 'incremental'].includes(value);
}

function isCronExpression(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0;
}

export const POST = withAuthApiMiddleware(
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

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createApiError('validation_error', 'Invalid JSON body');
    }

    if (!body || typeof body !== 'object') {
      return createApiError('validation_error', 'Backup type and cron expression are required');
    }

    const { type, cronExpression } = body as { type?: unknown; cronExpression?: unknown };
    if (typeof type !== 'string' || !isBackupJobType(type) || !isCronExpression(cronExpression)) {
      return createApiError('validation_error', 'Invalid backup type or cron expression');
    }

    const jobType: BackupOptions['type'] = type;
    const cron = cronExpression.trim();

    try {
      const service = new BackupService(drizzle(db));
      await service.scheduleAutomatedBackup(jobType, cron);
      return createApiSuccess({ message: 'Automated backup scheduled successfully' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to schedule backup';
      return createApiError('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_backup_schedule' },
  }
);

const methodNotAllowed = (allow: string) => () => createMethodNotAllowed(allow);
export const GET = methodNotAllowed('POST');
export const PUT = methodNotAllowed('POST');
export const PATCH = methodNotAllowed('POST');
export const DELETE = methodNotAllowed('POST');
export const OPTIONS = methodNotAllowed('POST');
export const HEAD = methodNotAllowed('POST');
