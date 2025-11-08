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

    if (!body || typeof body !== 'object' || !('type' in body)) {
      return createApiError('validation_error', 'Backup type is required');
    }

    const { type, tables } = body as { type: unknown; tables?: unknown };
    if (typeof type !== 'string' || !isBackupJobType(type)) {
      return createApiError('validation_error', 'Invalid backup type');
    }

    const jobType: BackupOptions['type'] = type;
    const jobTables = Array.isArray(tables)
      ? tables.filter((t): t is string => typeof t === 'string') || undefined
      : undefined;

    try {
      const service = new BackupService(drizzle(db));
      const jobId = await service.createBackupJob({ type: jobType, tables: jobTables }, undefined);
      return createApiSuccess({ jobId, message: 'Backup job created successfully' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create backup job';
      return createApiError('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_backup_create' },
  }
);

const methodNotAllowed = (allow: string) => () => createMethodNotAllowed(allow);
export const GET = methodNotAllowed('POST');
export const PUT = methodNotAllowed('POST');
export const PATCH = methodNotAllowed('POST');
export const DELETE = methodNotAllowed('POST');
export const OPTIONS = methodNotAllowed('POST');
export const HEAD = methodNotAllowed('POST');
