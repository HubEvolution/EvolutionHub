import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  formatZodError,
  adminWebEvalTasksQuerySchema,
  type AdminWebEvalTasksQuery,
} from '@/lib/validation';
import { listTasksPage } from '@/lib/testing/web-eval/storage';
import type { WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import type { D1Database } from '@cloudflare/workers-types';

interface RuntimeEnv extends WebEvalEnvBindings {
  DB?: D1Database;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request, url } = context;
    const env = (locals.runtime?.env ?? {}) as RuntimeEnv;
    const kv = env.KV_WEB_EVAL;
    const db = env.DB;

    if (!kv || !db) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const parsedQuery = adminWebEvalTasksQuerySchema.safeParse(
      Object.fromEntries(url.searchParams)
    );
    if (!parsedQuery.success) {
      return createApiError('validation_error', 'Invalid query', {
        details: formatZodError(parsedQuery.error),
      });
    }

    const query = parsedQuery.data as AdminWebEvalTasksQuery;

    const page = await listTasksPage(kv, query.limit, query.cursor);

    let items = page.items;
    if (query.status) {
      items = items.filter((task) => task.status === query.status);
    }
    if (query.ownerType) {
      items = items.filter((task) => task.ownerType === query.ownerType);
    }
    if (query.ownerId) {
      items = items.filter((task) => task.ownerId === query.ownerId);
    }

    return createApiSuccess({
      items: items.map((task) => ({
        id: task.id,
        url: task.url,
        description: task.task,
        status: task.status,
        ownerType: task.ownerType,
        ownerId: task.ownerId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        attemptCount: task.attemptCount,
        lastError: task.lastError ?? null,
      })),
      nextCursor: page.nextCursor ?? null,
    });
  },
  {
    rateLimiter: apiRateLimiter,
    logMetadata: { action: 'admin_web_eval_tasks_list' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
