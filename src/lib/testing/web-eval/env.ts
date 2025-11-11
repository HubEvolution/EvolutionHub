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
