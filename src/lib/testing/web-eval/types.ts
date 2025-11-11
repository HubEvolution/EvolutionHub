import type { KVNamespace } from '@cloudflare/workers-types';

export type WebEvalStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type WebEvalOwnerType = 'user' | 'guest' | 'system';

export interface WebEvalTaskInput {
  url: string;
  task: string;
  headless: boolean;
  timeoutMs: number;
}

export interface WebEvalTaskRecord extends WebEvalTaskInput {
  id: string;
  ownerType: WebEvalOwnerType;
  ownerId: string;
  status: WebEvalStatus;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  lastError?: string;
  reportKey?: string;
}

export interface WebEvalStep {
  action: string;
  timestamp: string;
  selectorUsed?: string;
  screenshotKey?: string;
}

export type WebEvalConsoleLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

export interface WebEvalConsoleLog {
  level: WebEvalConsoleLevel;
  message: string;
  timestamp: string;
}

export type WebEvalHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export interface WebEvalNetworkRequest {
  method: WebEvalHttpMethod;
  url: string;
  status: number;
  durationMs?: number;
}

export interface WebEvalReport {
  taskId: string;
  url: string;
  taskDescription: string;
  success: boolean;
  steps: WebEvalStep[];
  consoleLogs: WebEvalConsoleLog[];
  networkRequests: WebEvalNetworkRequest[];
  errors: string[];
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

export interface WebEvalTaskCreatePayload extends WebEvalTaskInput {
  ownerType: WebEvalOwnerType;
  ownerId: string;
}

export interface WebEvalReportEnvelope {
  report: WebEvalReport;
  storedAt: string;
}

export type WebEvalKvNamespace = Pick<KVNamespace, 'get' | 'put' | 'delete' | 'list'>;

export interface WebEvalQueueConfig {
  taskTtlSeconds: number;
  reportTtlSeconds: number;
}
