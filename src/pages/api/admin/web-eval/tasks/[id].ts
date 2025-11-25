import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import { webEvalTaskIdParamSchema, formatZodError } from '@/lib/validation';
import { getTask, getReport, getLiveEnvelope } from '@/lib/testing/web-eval/storage';
import type { WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import type { D1Database } from '@cloudflare/workers-types';

interface RuntimeEnv extends WebEvalEnvBindings {
  DB?: D1Database;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, params, request } = context;
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

    const parsedId = webEvalTaskIdParamSchema.safeParse({ id: params?.id ?? '' });
    if (!parsedId.success) {
      return createApiError('validation_error', 'Invalid task identifier', {
        details: formatZodError(parsedId.error),
      });
    }

    const task = await getTask(kv, parsedId.data.id);
    if (!task) {
      return createApiError('not_found', 'Task not found');
    }

    const reportEnvelope = await getReport(kv, task.id);
    const liveEnvelope = await getLiveEnvelope(kv, task.id);

    const response = createApiSuccess({
      task: {
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
      },
      report: reportEnvelope?.report ?? null,
      live: liveEnvelope ?? null,
    });

    try {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    } catch {
      // ignore header mutation failures
    }

    return response;
  },
  {
    rateLimiter: apiRateLimiter,
    logMetadata: { action: 'admin_web_eval_task_detail' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
