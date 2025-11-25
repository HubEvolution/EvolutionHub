import type { KVNamespace } from '@cloudflare/workers-types';
import type { WebEvalQueueConfig } from './types';

const DEFAULT_TASK_TTL_SECONDS = 60 * 60 * 24; // 24h
const DEFAULT_REPORT_TTL_SECONDS = 60 * 60 * 24 * 3; // 3d

export const DEFAULT_QUEUE_CONFIG: WebEvalQueueConfig = {
  taskTtlSeconds: DEFAULT_TASK_TTL_SECONDS,
  reportTtlSeconds: DEFAULT_REPORT_TTL_SECONDS,
};

export interface WebEvalEnvBindings {
  KV_WEB_EVAL?: KVNamespace;
  WEB_EVAL_TASK_TTL_SECONDS?: string;
  WEB_EVAL_REPORT_TTL_SECONDS?: string;
  WEB_EVAL_EXECUTOR_TOKEN?: string;
  WEB_EVAL_ENABLE_PROD?: string; // '1' to allow creating tasks in production (default off)
  WEB_EVAL_EXEC_ALLOW_PROD?: string; // '1' to allow executor routes in production (default off)
  WEB_EVAL_FORCE_SSRF_ENFORCE?: string; // '1' to enforce SSRF checks even outside production (testing aid)
  // Browser Rendering (Phase A scaffolding)
  WEB_EVAL_BROWSER_ENABLE?: string; // '1' to enable Cloudflare Browser Rendering runner (staging only by default)
  WEB_EVAL_BROWSER_ALLOW_PROD?: string; // '1' to allow CBR in production; requires x-internal-exec header
  WEB_EVAL_ALLOWED_ORIGINS?: string; // optional, comma-separated allowlist for SSRF target origins
  WEB_EVAL_AUTO_ASSERTIONS_ENABLE?: string; // '1' or 'true' to enable server-side auto-assertions for Web-Eval
  BROWSER?: unknown; // Cloudflare Browser Rendering binding (optional)
  ENVIRONMENT?: string; // 'development' | 'staging' | 'production' | 'testing'
}

export function resolveQueueConfig(env: Partial<WebEvalEnvBindings>): WebEvalQueueConfig {
  const taskTtl = Number(env.WEB_EVAL_TASK_TTL_SECONDS);
  const reportTtl = Number(env.WEB_EVAL_REPORT_TTL_SECONDS);
  return {
    taskTtlSeconds:
      Number.isFinite(taskTtl) && taskTtl > 0 ? taskTtl : DEFAULT_QUEUE_CONFIG.taskTtlSeconds,
    reportTtlSeconds:
      Number.isFinite(reportTtl) && reportTtl > 0
        ? reportTtl
        : DEFAULT_QUEUE_CONFIG.reportTtlSeconds,
  };
}
