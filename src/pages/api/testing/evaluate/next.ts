import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { webEvalTaskLimiter } from '@/lib/rate-limiter';
import {
  listTasksByStatus,
  getTask,
  updateTask,
} from '@/lib/testing/web-eval/storage';
import {
  resolveQueueConfig,
  type WebEvalEnvBindings,
} from '@/lib/testing/web-eval/env';
import type {
  WebEvalKvNamespace,
  WebEvalQueueConfig,
  WebEvalTaskRecord,
} from '@/lib/testing/web-eval';
import { loggerFactory } from '@/server/utils/logger-factory';

const EXECUTOR_TOKEN_HEADER = 'x-executor-token';
const CANDIDATE_SCAN_LIMIT = 25;

function extractExecutorToken(request: Request): string | null {
  const header = request.headers.get(EXECUTOR_TOKEN_HEADER);
  if (!header) return null;
  const token = header.trim();
  return token.length > 0 ? token : null;
}

async function claimNextTask(
  kv: WebEvalKvNamespace,
  config: WebEvalQueueConfig,
  log = loggerFactory.createLogger('web-eval-executor')
): Promise<WebEvalTaskRecord | null> {
  const candidates = await listTasksByStatus(kv, 'pending', CANDIDATE_SCAN_LIMIT);
  if (!candidates.length) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    return aTime - bTime;
  });

  for (const candidate of sorted) {
    const latest = await getTask(kv, candidate.id);
    if (!latest || latest.status !== 'pending') {
      continue;
    }

    try {
      const claimed: WebEvalTaskRecord = {
        ...latest,
        status: 'processing',
      };

      await updateTask(kv, claimed, config);
      const refreshed = await getTask(kv, candidate.id);
      if (!refreshed) {
        continue;
      }

      if (refreshed.status === 'processing') {
        log.debug('web_eval_task_claimed', {
          taskId: refreshed.id,
          createdAt: refreshed.createdAt,
        });
        return refreshed;
      }
    } catch (error) {
      log.warn('web_eval_task_claim_failed', {
        taskId: candidate.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}

async function handler(context: APIContext): Promise<Response> {
  const { locals, request } = context;
  const env = (locals.runtime?.env ?? {}) as WebEvalEnvBindings;
  const kv = env.KV_WEB_EVAL;

  if (!kv) {
    return createApiError('server_error', 'Web evaluation storage is not configured');
  }

  // Production gating: executor only allowed if explicitly enabled and internal header present
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
      // ignore logging failures
    }

    return createApiError('auth_error', 'Executor authentication failed');
  }

  const config = resolveQueueConfig(env);
  const claimed = await claimNextTask(kv, config);

  if (!claimed) {
    return createApiSuccess({ task: null });
  }

  return createApiSuccess({
    task: {
      id: claimed.id,
      url: claimed.url,
      task: claimed.task,
      headless: claimed.headless,
      timeoutMs: claimed.timeoutMs,
      status: claimed.status,
      attemptCount: claimed.attemptCount,
      ownerType: claimed.ownerType,
      ownerId: claimed.ownerId,
      createdAt: claimed.createdAt,
      updatedAt: claimed.updatedAt,
      lastError: claimed.lastError ?? null,
    },
  });
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
