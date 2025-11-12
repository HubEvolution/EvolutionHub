import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { webEvalBrowserLimiter } from '@/lib/rate-limiter';
import {
  listTasksByStatus,
  getTask,
  updateTask,
  storeReport,
} from '@/lib/testing/web-eval/storage';
import { resolveQueueConfig, type WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import type {
  WebEvalKvNamespace,
  WebEvalQueueConfig,
  WebEvalTaskRecord,
  WebEvalReport,
} from '@/lib/testing/web-eval';
import { loggerFactory } from '@/server/utils/logger-factory';
import { validateTargetUrl } from '@/lib/testing/web-eval/ssrf';
import { isBrowserAllowedInProd } from '@/lib/testing/web-eval/provider';

const CANDIDATE_SCAN_LIMIT = 25;

function nowIso() {
  return new Date().toISOString();
}

async function claimNextTask(
  kv: WebEvalKvNamespace,
  config: WebEvalQueueConfig,
  log = loggerFactory.createLogger('web-eval-browser')
): Promise<WebEvalTaskRecord | null> {
  const candidates = await listTasksByStatus(kv, 'pending', CANDIDATE_SCAN_LIMIT);
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const candidate of sorted) {
    const latest = await getTask(kv, candidate.id);
    if (!latest || latest.status !== 'pending') continue;
    try {
      const claimed: WebEvalTaskRecord = { ...latest, status: 'processing' };
      await updateTask(kv, claimed, config);
      const refreshed = await getTask(kv, candidate.id);
      if (refreshed && refreshed.status === 'processing') {
        log.debug('web_eval_task_claimed_browser', {
          taskId: refreshed.id,
          createdAt: refreshed.createdAt,
        });
        return refreshed;
      }
    } catch (error) {
      log.warn('web_eval_task_claim_failed_browser', {
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

  if (!kv) return createApiError('server_error', 'Web evaluation storage is not configured');

  const config = resolveQueueConfig(env);
  const log = loggerFactory.createLogger('web-eval-browser');

  // Claim a task first so we can verify claim flow even when the browser runner is disabled
  const claimed = await claimNextTask(kv, config, log);
  if (!claimed) {
    return createApiSuccess({ task: null });
  }

  // Feature gating (post-claim): refine semantics
  const isProd = (env.ENVIRONMENT || '').toLowerCase() === 'production';
  const flagOn = env.WEB_EVAL_BROWSER_ENABLE === '1';
  const hasBrowserBinding = !!env.BROWSER;
  if (!flagOn) {
    const startedAt = new Date();
    const finishedAt = new Date();
    const report: WebEvalReport = {
      taskId: claimed.id,
      url: claimed.url,
      taskDescription: claimed.task,
      success: false,
      steps: [{ action: 'browserDisabled', timestamp: nowIso() }],
      consoleLogs: [],
      networkRequests: [],
      errors: ['browser_disabled'],
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
    await storeReport(kv, claimed.id, report, config);
    const failed: WebEvalTaskRecord = {
      ...claimed,
      status: 'failed',
      attemptCount: (claimed.attemptCount || 0) + 1,
      lastError: 'browser_disabled',
    };
    await updateTask(kv, failed, config);
    return createApiError('forbidden', 'browser_disabled');
  }
  if (flagOn && !hasBrowserBinding) {
    const startedAt = new Date();
    const finishedAt = new Date();
    const report: WebEvalReport = {
      taskId: claimed.id,
      url: claimed.url,
      taskDescription: claimed.task,
      success: false,
      steps: [{ action: 'browserNotConfigured', timestamp: nowIso() }],
      consoleLogs: [],
      networkRequests: [],
      errors: ['browser_not_configured'],
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
    await storeReport(kv, claimed.id, report, config);
    const failed: WebEvalTaskRecord = {
      ...claimed,
      status: 'failed',
      attemptCount: (claimed.attemptCount || 0) + 1,
      lastError: 'browser_not_configured',
    };
    await updateTask(kv, failed, config);
    return createApiError('forbidden', 'browser_not_configured');
  }
  if (isProd) {
    const internalExecHeader = (request.headers.get('x-internal-exec') || '').trim();
    if (!isBrowserAllowedInProd(env) || internalExecHeader !== '1') {
      const startedAt = new Date();
      const finishedAt = new Date();
      const report: WebEvalReport = {
        taskId: claimed.id,
        url: claimed.url,
        taskDescription: claimed.task,
        success: false,
        steps: [{ action: 'prodGate', timestamp: nowIso() }],
        consoleLogs: [],
        networkRequests: [],
        errors: ['disabled_in_production'],
        durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      };
      await storeReport(kv, claimed.id, report, config);
      const failed: WebEvalTaskRecord = {
        ...claimed,
        status: 'failed',
        attemptCount: (claimed.attemptCount || 0) + 1,
        lastError: 'disabled_in_production',
      };
      await updateTask(kv, failed, config);
      return createApiError('forbidden', 'disabled_in_production');
    }
  }

  // SSRF/target validation
  const allowCsv =
    typeof env.WEB_EVAL_ALLOWED_ORIGINS === 'string' ? env.WEB_EVAL_ALLOWED_ORIGINS : undefined;
  const targetCheck = validateTargetUrl(claimed.url, allowCsv);
  if (!targetCheck.ok) {
    // Mark failed and store minimal report
    const startedAt = new Date();
    const finishedAt = new Date();
    const report: WebEvalReport = {
      taskId: claimed.id,
      url: claimed.url,
      taskDescription: claimed.task,
      success: false,
      steps: [{ action: 'validateTarget', timestamp: nowIso() }],
      consoleLogs: [],
      networkRequests: [],
      errors: [`ssrf_blocked:${targetCheck.reason}`],
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
    await storeReport(kv, claimed.id, report, config);
    const failed: WebEvalTaskRecord = {
      ...claimed,
      status: 'failed',
      attemptCount: (claimed.attemptCount || 0) + 1,
      lastError: `ssrf_blocked:${targetCheck.reason}`,
    };
    await updateTask(kv, failed, config);
    return createApiError('forbidden', 'ssrf_blocked', { reason: targetCheck.reason });
  }

  // For Phase B MVP: if BROWSER binding exists but runner not yet implemented, mark as not_configured
  if (!env.BROWSER) {
    const startedAt = new Date();
    const finishedAt = new Date();
    const report: WebEvalReport = {
      taskId: claimed.id,
      url: claimed.url,
      taskDescription: claimed.task,
      success: false,
      steps: [{ action: 'browserNotConfigured', timestamp: nowIso() }],
      consoleLogs: [],
      networkRequests: [],
      errors: ['browser_not_configured'],
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
    await storeReport(kv, claimed.id, report, config);
    const failed: WebEvalTaskRecord = {
      ...claimed,
      status: 'failed',
      attemptCount: (claimed.attemptCount || 0) + 1,
      lastError: 'browser_not_configured',
    };
    await updateTask(kv, failed, config);
    return createApiError('forbidden', 'browser_not_configured');
  }

  // Placeholder: runner implementation will navigate and generate report in Phase B finalization
  const startedAt = new Date();
  const finishedAt = new Date();
  const report: WebEvalReport = {
    taskId: claimed.id,
    url: claimed.url,
    taskDescription: claimed.task,
    success: false,
    steps: [{ action: 'runBrowser', timestamp: nowIso() }],
    consoleLogs: [],
    networkRequests: [],
    errors: ['browser_runner_not_implemented'],
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  };
  await storeReport(kv, claimed.id, report, config);
  const failed: WebEvalTaskRecord = {
    ...claimed,
    status: 'failed',
    attemptCount: (claimed.attemptCount || 0) + 1,
    lastError: 'browser_runner_not_implemented',
  };
  await updateTask(kv, failed, config);
  return createApiError('server_error', 'browser_runner_not_implemented');
}

export const POST = withApiMiddleware(handler, {
  rateLimiter: webEvalBrowserLimiter,
});

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
