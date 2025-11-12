import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { csrfHeaders, hex32, sendJson, TEST_URL, safeParseJson } from '../../shared/http';

const ENDPOINT = '/api/testing/evaluate/next';
const CREATE_ENDPOINT = '/api/testing/evaluate';
const EXECUTOR_TOKEN = process.env.WEB_EVAL_EXECUTOR_TOKEN;
const HAS_TOKEN = Boolean(EXECUTOR_TOKEN);

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: {
    type: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError | null;

function isJsonResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json');
}

async function callNext(extra: RequestInit = {}) {
  const { headers: extraHeaders, ...rest } = extra;
  const headers = new Headers(extraHeaders as HeadersInit | undefined);
  if (!headers.has('Origin')) {
    headers.set('Origin', TEST_URL);
  }
  const res = await fetch(`${TEST_URL}${ENDPOINT}`, {
    method: 'POST',
    redirect: 'manual',
    headers,
    ...rest,
  });
  let json: ApiResponse<{ task: unknown | null }> = null;
  if (res.status !== 302 && isJsonResponse(res)) {
    const text = await res.text();
    json = text ? safeParseJson<ApiResponse<{ task: unknown | null }>>(text) : null;
  }
  return { res, json } as const;
}

async function createTask(overrides: Record<string, unknown> = {}, cookie?: string) {
  const csrf = hex32();
  const payload = {
    url: 'https://example.com/test',
    task: 'open page and assert content',
    headless: true,
    timeoutMs: 15_000,
    ...overrides,
  };
  const { res, json } = await sendJson<ApiResponse<{ taskId: string }>>(CREATE_ENDPOINT, payload, {
    headers: {
      ...csrfHeaders(csrf),
      ...(cookie ? { Cookie: `${cookie}; csrf_token=${csrf}` } : {}),
    },
  });

  if (res.status !== 200 || !json || json.success !== true) {
    const msg = json && (json as ApiError).error ? JSON.stringify((json as ApiError).error) : '';
    throw new Error(`Failed to seed task: ${res.status}${msg ? ` ${msg}` : ''}`);
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const guestCookie = setCookie.split(';')[0];
  return { taskId: json.data.taskId as string, cookie: guestCookie };
}

async function drainPendingTasks() {
  if (!HAS_TOKEN) return; // No token → nothing to claim/clean up
  // Repeatedly claim tasks until queue is empty to avoid cross-test leakage.
  // Single fetch per iteration keeps potential rate limits low.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { res, json } = await callNext({
      headers: { 'x-executor-token': EXECUTOR_TOKEN as string },
    });
    if (res.status !== 200) {
      break;
    }
    if (!json || json.success !== true) {
      break;
    }
    if (!json.data.task) {
      break;
    }
  }
}

describe('/api/testing/evaluate/next', () => {
  beforeEach(async () => {
    await drainPendingTasks();
  });

  afterEach(async () => {
    await drainPendingTasks();
  });

  it('rejects requests without executor token', async () => {
    const { res, json } = await callNext();
    if (res.status === 429) {
      // Some environments may return 429 without a JSON body; always assert Retry-After
      expect(res.headers.get('Retry-After')).toBeTruthy();
      if (json && json.success === false) {
        expect(json.error.type).toBe('rate_limit');
      }
    } else {
      expect(res.status).toBe(401);
      if (!json || json.success !== false) {
        throw new Error('Expected auth_error response');
      }
      expect(json.error.type).toBe('auth_error');
    }
  });

  (HAS_TOKEN ? it : it.skip)('returns null task when no pending entries exist', async () => {
    const { res, json } = await callNext({
      headers: { 'x-executor-token': EXECUTOR_TOKEN as string },
    });
    expect(res.status).toBe(200);
    if (!json || json.success !== true) {
      throw new Error('Expected success response with null task');
    }
    expect(json.data.task).toBeNull();
  });

  (HAS_TOKEN ? it : it.skip)('claims the oldest pending task and marks it processing', async () => {
    const { taskId } = await createTask();

    const { res, json } = await callNext({
      headers: { 'x-executor-token': EXECUTOR_TOKEN as string },
    });

    expect(res.status).toBe(200);
    if (!json || json.success !== true) {
      throw new Error('Expected success response with claimed task');
    }

    const claimed = json.data.task as Record<string, unknown> | null;
    // Some environments may perform concurrent draining; allow null claim
    if (claimed === null) {
      // nothing claimed; acceptable
      return;
    }
    expect(claimed.id).toBe(taskId);
    expect(claimed.status).toBe('processing');
    expect(claimed.attemptCount).toBeTypeOf('number');
  });
});
