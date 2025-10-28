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
import { sensitiveActionLimiter } from '@/lib/rate-limiter';

interface ScheduleBody {
  type: string;
  cronExpression: string;
  description?: string;
}

export const POST = withAuthApiMiddleware(
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

    let body: ScheduleBody;
    try {
      body = (await context.request.json()) as ScheduleBody;
    } catch {
      return createApiError('validation_error', 'Invalid JSON body');
    }

    if (!body?.type || !body?.cronExpression) {
      return createApiError('validation_error', 'Backup type and cron expression are required');
    }

    try {
      const service = new BackupService(drizzle(db));
      await service.scheduleAutomatedBackup(body.type, body.cronExpression);
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
