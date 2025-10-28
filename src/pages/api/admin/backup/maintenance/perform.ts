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

interface PerformBody {
  type: 'cleanup' | 'optimization' | 'migration' | 'repair';
  description: string;
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

    let body: PerformBody;
    try {
      body = (await context.request.json()) as PerformBody;
    } catch {
      return createApiError('validation_error', 'Invalid JSON body');
    }

    if (!body?.type || !body?.description) {
      return createApiError('validation_error', 'Maintenance type and description are required');
    }

    try {
      const service = new BackupService(drizzle(db));
      const maintenanceId = await service.performMaintenance(body.type, body.description);
      return createApiSuccess({ maintenanceId, message: 'Maintenance job started successfully' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start maintenance';
      return createApiError('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_maintenance_perform' },
  }
);

const methodNotAllowed = (allow: string) => () => createMethodNotAllowed(allow);
export const GET = methodNotAllowed('POST');
export const PUT = methodNotAllowed('POST');
export const PATCH = methodNotAllowed('POST');
export const DELETE = methodNotAllowed('POST');
export const OPTIONS = methodNotAllowed('POST');
export const HEAD = methodNotAllowed('POST');
