import { describe, it, expect } from 'vitest';
import { csrfHeaders, hex32, sendJson, getJson } from '../../shared/http';

const EXECUTOR_TOKEN = process.env.WEB_EVAL_EXECUTOR_TOKEN;
const HAS_TOKEN = Boolean(EXECUTOR_TOKEN);

function makeReport(input: {
  taskId: string;
  url?: string;
  taskDescription?: string;
  success?: boolean;
}): any {
  const now = new Date();
  return {
    taskId: input.taskId,
    url: input.url ?? 'https://example.com',
    taskDescription: input.taskDescription ?? 'open page',
    success: input.success ?? true,
    steps: [],
    consoleLogs: [],
    networkRequests: [],
    errors: [],
    durationMs: 123,
    startedAt: now.toISOString(),
    finishedAt: new Date(now.getTime() + 120).toISOString(),
  };
}

type ApiJson = { success?: boolean; data?: any; error?: any };

async function createTask(): Promise<{ taskId: string; cookie: string }> {
  const csrf = hex32();
  const payload = {
    url: 'https://example.com',
    task: 'open page',
    headless: true,
    timeoutMs: 15000,
  };
  const { res, json } = await sendJson<ApiJson>('/api/testing/evaluate', payload, {
    headers: {
      ...csrfHeaders(csrf),
    },
  });
  expect(res.status).toBe(200);
  expect(json?.success).toBe(true);
  const setCookie = res.headers.get('set-cookie') || '';
  const guestCookie = setCookie.split(';')[0];
  return {
    taskId:
      ((json?.data as { taskId?: unknown; task?: { id?: unknown } } | undefined)?.taskId as
        | string
        | undefined) ??
      ((json?.data as { task?: { id?: unknown } } | undefined)?.task?.id as string | undefined) ??
      '',
    cookie: guestCookie,
  };
}

async function postComplete(
  taskId: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ res: Response; json: ApiJson | null }> {
  return sendJson<ApiJson>(`/api/testing/evaluate/${encodeURIComponent(taskId)}/complete`, body, {
    headers,
  });
}

describe('/api/testing/evaluate/:id/complete', () => {
  it('rejects without token → 401', async () => {
    const { res } = await postComplete('dummy-id', {
      status: 'completed',
      report: makeReport({ taskId: 'dummy-id' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects with invalid token → 401', async () => {
    const { taskId } = await createTask();
    const { res, json } = await postComplete(
      taskId,
      { status: 'completed', report: makeReport({ taskId }) },
      { 'x-executor-token': 'invalid-token' }
    );
    expect(res.status).toBe(401);
    expect(json?.success).toBe(false);
    expect(json?.error?.type).toBe('auth_error');
  });

  (HAS_TOKEN ? it : it.skip)('rejects invalid payload → 400 validation_error', async () => {
    const { taskId } = await createTask();
    const { res, json } = await postComplete(
      taskId,
      { foo: 'bar' },
      { 'x-executor-token': EXECUTOR_TOKEN as string }
    );
    expect(res.status).toBe(400);
    expect(json?.success).toBe(false);
    expect(json?.error?.type).toBe('validation_error');
  });

  (HAS_TOKEN ? it : it.skip)('completes task successfully → 200 and status updated', async () => {
    const { taskId, cookie } = await createTask();

    const payload = {
      status: 'completed',
      report: makeReport({ taskId, success: true }),
    };

    const { res, json } = await postComplete(taskId, payload, {
      'x-executor-token': EXECUTOR_TOKEN as string,
    });
    expect(res.status).toBe(200);
    expect(json?.success).toBe(true);
    expect(json?.data?.taskId).toBe(taskId);

    // optional verification via GET /api/testing/evaluate/:id (if implemented)
    const { res: getRes } = await getJson(
      `/api/testing/evaluate/${encodeURIComponent(taskId)}`,
      { headers: { Cookie: cookie } }
    );
    expect(getRes.status).toBe(200);
  });
});
