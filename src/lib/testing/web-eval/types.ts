import type { KVNamespace } from '@cloudflare/workers-types';

export type WebEvalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'aborted';

export type WebEvalOwnerType = 'user' | 'guest' | 'system';

export interface WebEvalTaskInput {
  url: string;
  task: string;
  headless: boolean;
  timeoutMs: number;
  assertions?: WebEvalAssertionDefinition[];
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
  phase?: 'nav' | 'assertions' | 'cleanup';
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

export type WebEvalAssertionKind = 'textIncludes' | 'selectorExists';

export interface WebEvalAssertionDefinition {
  id: string;
  kind: WebEvalAssertionKind;
  value: string;
  description?: string;
}

export interface WebEvalAssertionResult extends WebEvalAssertionDefinition {
  passed: boolean;
  details?: string;
}

export type WebEvalVerdict = 'pass' | 'fail' | 'inconclusive';

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
  verdict?: WebEvalVerdict;
  assertions?: WebEvalAssertionResult[];
  screenshotBase64?: string;
}

export interface WebEvalTaskCreatePayload extends WebEvalTaskInput {
  ownerType: WebEvalOwnerType;
  ownerId: string;
}

export interface WebEvalReportEnvelope {
  report: WebEvalReport;
  storedAt: string;
}

export interface WebEvalLiveEnvelope {
  taskId: string;
  status: WebEvalStatus;
  steps: WebEvalStep[];
  errors: string[];
  logs?: WebEvalConsoleLog[];
  updatedAt: string;
  screenshotBase64?: string;
}

export type WebEvalKvNamespace = Pick<KVNamespace, 'get' | 'put' | 'delete' | 'list'>;

export interface WebEvalQueueConfig {
  taskTtlSeconds: number;
  reportTtlSeconds: number;
}
