import { describe, it, expect } from 'vitest';

import { csrfHeaders, hex32, sendJson, getJson, TEST_URL } from '../../shared/http';

interface ApiError {
  type?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

async function createGuestTask(overrides: Record<string, unknown> = {}) {
  const csrf = hex32();
  const payload = {
    url: `${TEST_URL}/`,
    task: 'abort test',
    headless: true,
    timeoutMs: 10_000,
    ...overrides,
  };
  const { res, json } = await sendJson<ApiResponse<{ taskId: string }>>(
    '/api/testing/evaluate',
    payload,
    {
      headers: {
        ...csrfHeaders(csrf),
      },
    }
  );

  expect(res.status).toBe(200);
  if (!json || json.success !== true || !json.data) {
    throw new Error('Failed to create task for abort tests');
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];

  return { taskId: json.data.taskId, cookie };
}

async function abortTask(taskId: string, cookie: string) {
  const csrf = hex32();
  return sendJson<ApiResponse<{ taskId: string; status: string }>>(
    `/api/testing/evaluate/${taskId}/abort`,
    {},
    {
      headers: {
        ...csrfHeaders(csrf),
        Cookie: `${cookie}; csrf_token=${csrf}`,
      },
    }
  );
}

async function getTaskStatus(taskId: string, cookie: string) {
  const { res, json } = await getJson<ApiResponse<{ task: { status: string } | null }>>(
    `/api/testing/evaluate/${taskId}`,
    {
      headers: {
        Cookie: cookie,
      },
    }
  );

  expect(res.status).toBe(200);
  if (!json || json.success !== true || !json.data || !json.data.task) {
    throw new Error('Expected task status response');
  }

  return json.data.task.status;
}

describe('Web Eval Task Abort', () => {
  it('aborts a pending task for the owning guest', async () => {
    const { taskId, cookie } = await createGuestTask();

    const { res, json } = await abortTask(taskId, cookie);

    if (res.status === 429) {
      expect(res.headers.get('Retry-After')).toBeTruthy();
      if (json && json.success === false) {
        expect(json.error?.type).toBe('rate_limit');
      }
      return;
    }

    expect(res.status).toBe(200);
    if (!json || json.success !== true || !json.data) {
      throw new Error('Expected success abort response');
    }

    expect(json.data.taskId).toBe(taskId);
    expect(json.data.status).toBe('aborted');

    const status = await getTaskStatus(taskId, cookie);
    expect(status).toBe('aborted');
  });

  it('is idempotent when aborting an already aborted task', async () => {
    const { taskId, cookie } = await createGuestTask();

    const first = await abortTask(taskId, cookie);
    if (first.res.status === 429) {
      expect(first.res.headers.get('Retry-After')).toBeTruthy();
      if (first.json && first.json.success === false) {
        expect(first.json.error?.type).toBe('rate_limit');
      }
      return;
    }

    const second = await abortTask(taskId, cookie);
    if (second.res.status === 429) {
      expect(second.res.headers.get('Retry-After')).toBeTruthy();
      if (second.json && second.json.success === false) {
        expect(second.json.error?.type).toBe('rate_limit');
      }
      return;
    }

    expect(second.res.status).toBe(200);
    if (!second.json || second.json.success !== true || !second.json.data) {
      throw new Error('Expected success abort response on second call');
    }

    expect(second.json.data.taskId).toBe(taskId);
    expect(second.json.data.status).toBe('aborted');
  });

  it('returns forbidden when a different guest tries to abort the task', async () => {
    const { taskId } = await createGuestTask();
    const attacker = await createGuestTask();

    const { res, json } = await abortTask(taskId, attacker.cookie);

    if (res.status === 429) {
      expect(res.headers.get('Retry-After')).toBeTruthy();
      if (json && json.success === false) {
        expect(json.error?.type).toBe('rate_limit');
      }
      return;
    }

    expect(res.status).toBe(403);
    if (!json || json.success !== false || !json.error) {
      throw new Error('Expected forbidden error response for non-owner abort');
    }

    expect(json.error.type).toBe('forbidden');
  });
});
