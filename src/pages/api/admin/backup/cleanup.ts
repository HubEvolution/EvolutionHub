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

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
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

    let retentionDays = 30;
    try {
      const body = (await context.request.json()) as unknown;
      if (body && typeof body === 'object' && 'retentionDays' in body) {
        const { retentionDays: raw } = body as { retentionDays?: unknown };
        if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
          retentionDays = Math.min(365, Math.floor(raw));
        }
      }
    } catch {
      // ignore JSON parse errors, fallback to default retention
    }

    try {
      const service = new BackupService(drizzle(db));
      const deletedCount = await service.cleanupOldBackups(retentionDays);
      return createApiSuccess({ deletedCount, message: `${deletedCount} old backups cleaned up` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to cleanup old backups';
      return createApiError('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_backup_cleanup' },
  }
);

const methodNotAllowed = (allow: string) => () => createMethodNotAllowed(allow);
export const GET = methodNotAllowed('POST');
export const PUT = methodNotAllowed('POST');
export const PATCH = methodNotAllowed('POST');
export const DELETE = methodNotAllowed('POST');
export const OPTIONS = methodNotAllowed('POST');
export const HEAD = methodNotAllowed('POST');
