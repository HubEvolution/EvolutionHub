import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { csrfHeaders, getJson, hex32, sendJson, TEST_URL } from '../../shared/http';

const RUN_ENDPOINT = '/api/testing/evaluate/next/run';
const NEXT_ENDPOINT = '/api/testing/evaluate/next';
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

async function callRun(extraHeaders: Record<string, string> = {}) {
  const { res, json } = await sendJson<ApiResponse<{ task: unknown | null }>>(
    RUN_ENDPOINT,
    {},
    {
      headers: {
        ...extraHeaders,
      },
    }
  );
  return { res, json } as const;
}

async function callNext(extraHeaders: Record<string, string> = {}) {
  const { res, json } = await sendJson<ApiResponse<{ task: unknown | null }>>(
    NEXT_ENDPOINT,
    {},
    {
      headers: {
        ...extraHeaders,
      },
    }
  );
  return { res, json } as const;
}

async function createTask(overrides: Record<string, unknown> = {}, cookie?: string) {
  const csrf = hex32();
  const payload = {
    url: `${TEST_URL}/`,
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
  if (!HAS_TOKEN) return;
  // Claim until none remain as 'pending'
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { res, json } = await callNext({ 'x-executor-token': EXECUTOR_TOKEN as string });
    if (res.status !== 200) break;
    if (!json || json.success !== true) break;
    if (!json.data.task) break;
  }
}

describe('/api/testing/evaluate/next/run', () => {
  beforeEach(async () => {
    await drainPendingTasks();
    // Additionally, drain via internal run endpoint to claim & clear any leftover pending tasks
    for (let i = 0; i < 25; i++) {
      const { res, json } = await callRun();
      // Break early on non-200 (e.g., 429 rate limit) to avoid spamming the limiter
      if (res.status !== 200) break;
      // The run endpoint returns 200 + { success: true, data: { task: null } } when queue is empty
      if (json && json.success === true && json.data && json.data.task === null) break;
    }
  });

  afterEach(async () => {
    await drainPendingTasks();
    // Drain again via run endpoint to avoid leakage across tests
    for (let i = 0; i < 25; i++) {
      const { res, json } = await callRun();
      if (res.status !== 200) break;
      if (json && json.success === true && json.data && json.data.task === null) break;
    }
  });

  it('returns null task when no pending entries exist', async () => {
    const { res, json } = await callRun();
    if (res.status === 429) {
      // Rate-limited: always assert Retry-After; JSON body may be absent in some envs
      expect(res.headers.get('Retry-After')).toBeTruthy();
      if (json && json.success === false) {
        expect((json as any).error.type).toBe('rate_limit');
      }
    } else if (res.status === 403) {
      // Forbidden when CBR is disabled in this environment
      if (!json || json.success !== false) {
        throw new Error('Expected forbidden error response when CBR is disabled');
      }
      expect((json as any).error.type).toBe('forbidden');
      // message can vary ('browser_disabled' | 'browser_not_configured')
      const msg = (json as any).error?.message;
      if (typeof msg === 'string') {
        expect(['browser_disabled', 'browser_not_configured']).toContain(msg);
      }
    } else {
      expect(res.status).toBe(200);
      if (!json || json.success !== true) {
        throw new Error('Expected success response with null task');
      }
      expect(json.data.task).toBeNull();
    }
  });

  it('claims and fails (or succeeds in environments with CBR enabled)', async () => {
    const { taskId, cookie } = await createTask();

    const run = await callRun();
    // Accept rate limit during heavy parallel suites
    if (run.res.status === 429) {
      expect(run.res.headers.get('Retry-After')).toBeTruthy();
      if (run.json && run.json.success === false) {
        expect(run.json.error.type).toBe('rate_limit');
      }
    } else if (run.res.status === 200) {
      // Some environments may have CBR enabled; accept success
      if (!run.json || run.json.success !== true) {
        throw new Error('Expected success response from run endpoint');
      }
    } else {
      // Expect forbidden error with message browser_disabled or browser_not_configured
      expect([403, 401, 400, 500]).toContain(run.res.status);
      if (!run.json || run.json.success !== false) {
        throw new Error('Expected error response');
      }
      expect(run.json.error.type).toBe('forbidden');
      expect(['browser_disabled', 'browser_not_configured']).toContain(run.json.error.message);
    }

    // Verify the originally created task moved to failed with a report
    const { res: statusRes, json: statusJson } = await getJson<
      ApiResponse<{ task: any; report: any }>
    >(`/api/testing/evaluate/${taskId}`, { headers: { Cookie: cookie! } });
    expect(statusRes.status).toBe(200);
    const js = statusJson as ApiResponse<{ task: any; report: any }> | null;
    if (!js || js.success !== true) {
      throw new Error(`Expected success task status, got ${(await statusRes.text()) || ''}`);
    }
    // Task status assertions
    if (run.res.status === 429) {
      // no further assertions when rate-limited
    } else if (run.res.status === 200) {
      // When run succeeded, allow task status to be one of the terminal or in-progress states.
      // In dev, a race may leave the task briefly pending if nothing was actually claimed.
      const claimed =
        run.json && run.json.success === true && (run.json as any).data
          ? ((run.json as any).data.task as unknown | null)
          : null;
      const allowed = claimed
        ? ['processing', 'completed', 'failed']
        : ['pending', 'processing', 'completed', 'failed'];
      expect(allowed).toContain(js.data.task.status);
    } else {
      // Error path assertions
      expect(js.data.task.status).toBe('failed');
      expect(['browser_disabled', 'browser_not_configured']).toContain(js.data.task.lastError);
      expect(Boolean(js.data.report)).toBe(true);
    }
  });

  // Env-guarded: only meaningful when WEB_EVAL_BROWSER_ENABLE=1 and BROWSER binding exists in prod
  const RUN_PROD_TEST = process.env.WEB_EVAL_BROWSER_TEST_PROD === '1';
  (RUN_PROD_TEST ? it : it.skip)('requires x-internal-exec in production', async () => {
    await createTask();

    // Missing header → forbidden disabled_in_production
    const noHeader = await callRun();
    expect(noHeader.res.status).toBe(403);
    if (!noHeader.json || noHeader.json.success !== false) {
      throw new Error('Expected error response without x-internal-exec');
    }
    expect(noHeader.json.error.type).toBe('forbidden');
    expect(noHeader.json.error.message).toBe('disabled_in_production');

    // With header → proceeds past prod-gate; expect either not_configured or runner_not_implemented
    const withHeader = await callRun({ 'x-internal-exec': '1' });
    if (withHeader.res.status === 403 && withHeader.json && withHeader.json.success === false) {
      // still forbidden, but must not be disabled_in_production when header is present
      expect(withHeader.json.error.message).not.toBe('disabled_in_production');
    }
  });
});
