import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { webEvalTaskIdParamSchema } from '@/lib/validation';
import { webEvalTaskLimiter } from '@/lib/rate-limiter';
import { getTask, getReport } from '@/lib/testing/web-eval/storage';
import type { WebEvalEnvBindings } from '@/lib/testing/web-eval/env';

function getExistingGuestId(context: APIContext): string | null {
  try {
    return context.cookies.get('guest_id')?.value ?? null;
  } catch {
    return null;
  }
}

function isAuthorizedOwner(
  context: APIContext,
  taskOwnerType: string,
  taskOwnerId: string
): boolean {
  if (taskOwnerType === 'user') {
    const userId = context.locals.user?.id;
    return typeof userId === 'string' && userId === taskOwnerId;
  }
  if (taskOwnerType === 'guest') {
    const guestId = getExistingGuestId(context);
    return typeof guestId === 'string' && guestId === taskOwnerId;
  }
  return false;
}

async function handler(context: APIContext): Promise<Response> {
  const { locals, params } = context;
  const env = (locals.runtime?.env ?? {}) as WebEvalEnvBindings;
  const kv = env.KV_WEB_EVAL;
  if (!kv) {
    return createApiError('server_error', 'Web evaluation storage is not configured');
  }

  const parsedId = webEvalTaskIdParamSchema.safeParse({ id: params?.id ?? '' });
  if (!parsedId.success) {
    return createApiError('validation_error', 'Invalid task identifier');
  }

  const task = await getTask(kv, parsedId.data.id);
  if (!task) {
    return createApiError('not_found', 'Task not found');
  }

  if (!isAuthorizedOwner(context, task.ownerType, task.ownerId)) {
    return createApiError('forbidden', 'You are not allowed to access this task');
  }

  const reportEnvelope = await getReport(kv, task.id);

  const response = createApiSuccess({
    task: {
      id: task.id,
      url: task.url,
      description: task.task,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      attemptCount: task.attemptCount,
      lastError: task.lastError ?? null,
    },
    report: reportEnvelope?.report ?? null,
  });

  try {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  } catch {
    // ignore header mutation failures
  }

  return response;
}

export const GET = withApiMiddleware(handler, {
  rateLimiter: webEvalTaskLimiter,
});

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
