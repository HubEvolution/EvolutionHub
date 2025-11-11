import type {
  WebEvalKvNamespace,
  WebEvalQueueConfig,
  WebEvalReport,
  WebEvalReportEnvelope,
  WebEvalStatus,
  WebEvalTaskCreatePayload,
  WebEvalTaskRecord,
} from './types';

const TASK_KEY_PREFIX = 'web-eval:task:';
const REPORT_KEY_PREFIX = 'web-eval:report:';

function nowIso(): string {
  return new Date().toISOString();
}

function generateTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `task-${now}-${rand}`;
}

export function buildTaskKey(id: string): string {
  return `${TASK_KEY_PREFIX}${id}`;
}

export function buildReportKey(id: string): string {
  return `${REPORT_KEY_PREFIX}${id}`;
}

function serialize<T>(value: T): string {
  return JSON.stringify(value);
}

function deserializeTask(raw: string | null): WebEvalTaskRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WebEvalTaskRecord;
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function deserializeReport(raw: string | null): WebEvalReportEnvelope | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WebEvalReportEnvelope;
    return parsed && parsed.report ? parsed : null;
  } catch {
    return null;
  }
}

export async function createTaskRecord(
  kv: WebEvalKvNamespace,
  payload: WebEvalTaskCreatePayload,
  config: WebEvalQueueConfig
): Promise<WebEvalTaskRecord> {
  const id = generateTaskId();
  const timestamp = nowIso();
  const record: WebEvalTaskRecord = {
    id,
    ownerType: payload.ownerType,
    ownerId: payload.ownerId,
    url: payload.url,
    task: payload.task,
    headless: payload.headless,
    timeoutMs: payload.timeoutMs,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    attemptCount: 0,
  };

  await kv.put(buildTaskKey(id), serialize(record), {
    expirationTtl: config.taskTtlSeconds,
  });

  return record;
}

export async function getTask(
  kv: WebEvalKvNamespace,
  id: string
): Promise<WebEvalTaskRecord | null> {
  const raw = await kv.get(buildTaskKey(id));
  return deserializeTask(raw);
}

export async function updateTask(
  kv: WebEvalKvNamespace,
  record: WebEvalTaskRecord,
  config: WebEvalQueueConfig
): Promise<void> {
  const next: WebEvalTaskRecord = {
    ...record,
    updatedAt: nowIso(),
  };
  await kv.put(buildTaskKey(record.id), serialize(next), {
    expirationTtl: config.taskTtlSeconds,
  });
}

export async function deleteTask(kv: WebEvalKvNamespace, id: string): Promise<void> {
  await kv.delete(buildTaskKey(id));
}

export async function listTasksByStatus(
  kv: WebEvalKvNamespace,
  status: WebEvalStatus,
  limit = 50
): Promise<WebEvalTaskRecord[]> {
  const keys = await kv.list({ prefix: TASK_KEY_PREFIX, limit });
  const matches: WebEvalTaskRecord[] = [];
  for (const entry of keys.keys) {
    const raw = await kv.get(entry.name);
    const task = deserializeTask(raw);
    if (task && task.status === status) {
      matches.push(task);
    }
  }
  return matches;
}

export async function storeReport(
  kv: WebEvalKvNamespace,
  taskId: string,
  report: WebEvalReport,
  config: WebEvalQueueConfig
): Promise<WebEvalReportEnvelope> {
  const envelope: WebEvalReportEnvelope = {
    report,
    storedAt: nowIso(),
  };
  await kv.put(buildReportKey(taskId), serialize(envelope), {
    expirationTtl: config.reportTtlSeconds,
  });
  return envelope;
}

export async function getReport(
  kv: WebEvalKvNamespace,
  taskId: string
): Promise<WebEvalReportEnvelope | null> {
  const raw = await kv.get(buildReportKey(taskId));
  return deserializeReport(raw);
}
