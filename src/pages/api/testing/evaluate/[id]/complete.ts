import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { formatZodError, webEvalCompletionSchema } from '@/lib/validation';
import { webEvalTaskLimiter } from '@/lib/rate-limiter';
import { getTask, updateTask, storeReport, buildReportKey } from '@/lib/testing/web-eval/storage';
import { resolveQueueConfig, type WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import { loggerFactory } from '@/server/utils/logger-factory';

const EXECUTOR_TOKEN_HEADER = 'x-executor-token';

function extractExecutorToken(request: Request): string | null {
  const header = request.headers.get(EXECUTOR_TOKEN_HEADER);
  if (!header) return null;
  const token = header.trim();
  return token.length > 0 ? token : null;
}

async function handler(context: APIContext): Promise<Response> {
  const { locals, params, request } = context;
  const env = (locals.runtime?.env ?? {}) as WebEvalEnvBindings;
  const kv = env.KV_WEB_EVAL;
  if (!kv) {
    return createApiError('server_error', 'Web evaluation storage is not configured');
  }

  // Production gating: executor completion only allowed if explicitly enabled and internal header present
  const isProd = (env.ENVIRONMENT || '').toLowerCase() === 'production';
  if (isProd) {
    const internalExecHeader = (request.headers.get('x-internal-exec') || '').trim();
    if (env.WEB_EVAL_EXEC_ALLOW_PROD !== '1' || internalExecHeader !== '1') {
      return createApiError('forbidden', 'disabled_in_production');
    }
  }

  const providedToken = extractExecutorToken(request);
  const expectedToken = env.WEB_EVAL_EXECUTOR_TOKEN;
  if (!providedToken || !expectedToken || providedToken !== expectedToken) {
    try {
      loggerFactory.createSecurityLogger().logAuthFailure(
        {
          reason: 'web_eval_executor_token_invalid',
          hasProvidedToken: Boolean(providedToken),
        },
        {
          endpoint: context.url?.pathname || new URL(context.request.url).pathname,
          clientAddress: context.clientAddress || 'unknown',
        }
      );
    } catch {
      // best-effort logging; ignore failures
    }
    return createApiError('auth_error', 'Executor authentication failed');
  }

  const taskId = params?.id ?? '';
  const task = taskId ? await getTask(kv, taskId) : null;
  if (!task) {
    return createApiError('not_found', 'Task not found');
  }

  if (task.status === 'completed' || task.status === 'failed' || task.status === 'aborted') {
    return createApiError('forbidden', 'Task already finalized');
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  if (!bodyUnknown || typeof bodyUnknown !== 'object') {
    return createApiError('validation_error', 'Invalid JSON body');
  }

  const parsed = webEvalCompletionSchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return createApiError('validation_error', 'Invalid completion payload', {
      details: formatZodError(parsed.error),
    });
  }

  const config = resolveQueueConfig(env);
  const nextStatus = parsed.data.status;

  try {
    const reportEnvelope = await storeReport(kv, task.id, parsed.data.report, config);
    const nextTask = {
      ...task,
      status: nextStatus,
      attemptCount: task.attemptCount + 1,
      lastError: parsed.data.error ?? undefined,
      reportKey: buildReportKey(task.id),
    };
    await updateTask(kv, nextTask, config);

    return createApiSuccess({
      taskId: task.id,
      status: nextStatus,
      storedAt: reportEnvelope.storedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to persist completion';
    return createApiError('server_error', message);
  }
}

export const POST = withApiMiddleware(handler, {
  rateLimiter: webEvalTaskLimiter,
});

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
