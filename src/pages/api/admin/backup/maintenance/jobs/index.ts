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
import { formatZodError, maintenanceJobsQuerySchema } from '@/lib/validation';

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

    const searchParams = new URL(context.request.url).searchParams;
    const parsedQuery = maintenanceJobsQuerySchema.safeParse({ limit: searchParams.get('limit') });
    if (!parsedQuery.success) {
      return createApiError('validation_error', 'Invalid query parameters', {
        details: formatZodError(parsedQuery.error),
      });
    }
    const limit = parsedQuery.data.limit ?? 50;

    try {
      const service = new BackupService(drizzle(db));
      const jobs = await service.getMaintenanceJobs(limit);
      return createApiSuccess({ jobs });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch maintenance jobs';
      return createApiError('server_error', msg);
    }
  },
  { logMetadata: { action: 'admin_maintenance_jobs' } }
);

const methodNotAllowed = (allow: string) => () => createMethodNotAllowed(allow);
export const POST = methodNotAllowed('GET');
export const PUT = methodNotAllowed('GET');
export const PATCH = methodNotAllowed('GET');
export const DELETE = methodNotAllowed('GET');
export const OPTIONS = methodNotAllowed('GET');
export const HEAD = methodNotAllowed('GET');
