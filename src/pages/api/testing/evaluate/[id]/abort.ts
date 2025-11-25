import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { webEvalTaskIdParamSchema, formatZodError } from '@/lib/validation';
import { webEvalTaskLimiter } from '@/lib/rate-limiter';
import { getTask, updateTask } from '@/lib/testing/web-eval/storage';
import { resolveQueueConfig, type WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import type { WebEvalTaskRecord } from '@/lib/testing/web-eval';

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

  const config = resolveQueueConfig(env);

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

  if (!isAuthorizedOwner(context, task.ownerType, task.ownerId)) {
    return createApiError('forbidden', 'You are not allowed to access this task');
  }

  if (task.status === 'completed' || task.status === 'failed' || task.status === 'aborted') {
    return createApiSuccess({
      taskId: task.id,
      status: task.status,
    });
  }

  const nextTask: WebEvalTaskRecord = {
    ...task,
    status: 'aborted',
    lastError: task.lastError ?? 'aborted_by_owner',
  };

  try {
    await updateTask(kv, nextTask, config);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update task';
    return createApiError('server_error', message);
  }

  return createApiSuccess({
    taskId: nextTask.id,
    status: nextTask.status,
  });
}

export const POST = withApiMiddleware(handler, {
  rateLimiter: webEvalTaskLimiter,
  enforceCsrfToken: true,
});

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
