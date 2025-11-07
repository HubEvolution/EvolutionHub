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

const MAINTENANCE_TYPES = ['cleanup', 'optimization', 'migration', 'repair'] as const;
type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

function isMaintenanceType(value: unknown): value is MaintenanceType {
  return typeof value === 'string' && (MAINTENANCE_TYPES as readonly string[]).includes(value);
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
      return createApiError('validation_error', 'Maintenance type and description are required');
    }

    const { type, description } = body as { type?: unknown; description?: unknown };
    if (!isMaintenanceType(type) || typeof description !== 'string' || description.trim().length === 0) {
      return createApiError('validation_error', 'Maintenance type and description are required');
    }

    try {
      const service = new BackupService(drizzle(db));
      const maintenanceId = await service.performMaintenance(type, description.trim());
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
