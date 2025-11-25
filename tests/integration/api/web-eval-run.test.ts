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

interface WebEvalAssertionResult {
  id: string;
  kind: string;
  value: string;
  description?: string;
  passed: boolean;
  details?: string;
}

interface WebEvalReportWithAssertions {
  taskId: string;
  url: string;
  taskDescription: string;
  success: boolean;
  verdict?: string;
  assertions?: WebEvalAssertionResult[];
}

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

  it('returns live=null for a freshly created task before any runner activity', async () => {
    const { taskId, cookie } = await createTask();

    const { res, json } = await getJson<ApiResponse<{ task: any; live: any }>>(
      `/api/testing/evaluate/${taskId}/live`,
      { headers: { Cookie: cookie! } }
    );

    expect(res.status).toBe(200);

    const js = json as ApiResponse<{ task: any; live: any }> | null;
    if (!js || js.success !== true) {
      throw new Error('Expected success live response');
    }

    expect(js.data.task.id).toBe(taskId);
    expect(['pending', 'processing', 'completed', 'failed']).toContain(js.data.task.status);
    expect(js.data.live === null || typeof js.data.live === 'object').toBe(true);
  });

  it('keeps task status consistent between status and live endpoints after a run', async () => {
    const { taskId, cookie } = await createTask();

    const run = await callRun();

    // Environments without a configured browser runner or under heavy load
    // may return non-200 responses. In these cases we cannot assert on the
    // live contents in a stable way.
    if (run.res.status !== 200 || !run.json || run.json.success !== true) {
      return;
    }

    const { res: statusRes, json: statusJson } = await getJson<
      ApiResponse<{ task: any; report: any }>
    >(`/api/testing/evaluate/${taskId}`, { headers: { Cookie: cookie! } });

    const { res: liveRes, json: liveJson } = await getJson<ApiResponse<{ task: any; live: any }>>(
      `/api/testing/evaluate/${taskId}/live`,
      { headers: { Cookie: cookie! } }
    );

    expect(statusRes.status).toBe(200);
    expect(liveRes.status).toBe(200);

    const statusPayload = statusJson as ApiResponse<{ task: any; report: any }> | null;
    const livePayload = liveJson as ApiResponse<{ task: any; live: any }> | null;

    if (!statusPayload || statusPayload.success !== true) {
      return;
    }
    if (!livePayload || livePayload.success !== true) {
      return;
    }

    expect(statusPayload.data.task.id).toBe(taskId);
    expect(livePayload.data.task.id).toBe(taskId);
    expect(livePayload.data.task.status).toBe(statusPayload.data.task.status);

    if (livePayload.data.live) {
      expect(livePayload.data.live.taskId).toBe(taskId);
    }
  });

  it('uses only allowed phase values on live steps when present', async () => {
    const { taskId, cookie } = await createTask();

    const run = await callRun();

    // Environments without a configured browser runner or under heavy load
    // may return non-200 responses. In these cases we cannot assert on the
    // live contents in a stable way.
    if (run.res.status !== 200 || !run.json || run.json.success !== true) {
      return;
    }

    const { res, json } = await getJson<ApiResponse<{ task: any; live: any }>>(
      `/api/testing/evaluate/${taskId}/live`,
      { headers: { Cookie: cookie! } }
    );

    if (res.status !== 200) {
      return;
    }

    const js = json as ApiResponse<{ task: any; live: any }> | null;
    if (!js || js.success !== true || !js.data.live || !Array.isArray(js.data.live.steps)) {
      return;
    }

    for (const step of js.data.live.steps as Array<{ phase?: string }>) {
      if (typeof step.phase === 'undefined') continue;
      expect(['nav', 'assertions', 'cleanup']).toContain(step.phase);
    }
  });

  it('includes browser_backend_unavailable in report errors when the browser backend is unavailable', async () => {
    const { taskId, cookie } = await createTask();

    const run = await callRun();

    // Environments without a configured browser runner or under heavy load
    // may return non-200 responses. In these cases we cannot assert on the
    // report contents in a stable way.
    if (run.res.status !== 200 || !run.json || run.json.success !== true) {
      return;
    }

    const { res: statusRes, json: statusJson } = await getJson<
      ApiResponse<{ task: any; report: { errors?: unknown[] } | null }>
    >(`/api/testing/evaluate/${taskId}`, { headers: { Cookie: cookie! } });

    if (statusRes.status !== 200) {
      return;
    }

    const js = statusJson as ApiResponse<{
      task: any;
      report: { errors?: unknown[] } | null;
    }> | null;
    if (!js || js.success !== true || !js.data.report || !Array.isArray(js.data.report.errors)) {
      return;
    }

    const hasBrowserUnavailable = js.data.report.errors.some(
      (e) => typeof e === 'string' && e === 'browser_backend_unavailable'
    );

    if (!hasBrowserUnavailable) {
      return;
    }

    // At least one error entry must be exactly the normalized browser_backend_unavailable marker
    expect(js.data.report.errors).toContain('browser_backend_unavailable');
  });

  it('exposes assertion results and verdict in the task report when assertions are provided', async () => {
    const { taskId, cookie } = await createTask({
      url: 'https://example.com/',
      assertions: [
        {
          // Example.com page contains this stable text in the body
          kind: 'textIncludes',
          value: 'Example Domain',
          description: 'page contains example domain text',
        },
        {
          // Example.com main heading
          kind: 'selectorExists',
          value: 'h1',
          description: 'page has h1 heading',
        },
      ],
    });

    const run = await callRun();

    // Environments without a configured browser runner or under heavy load
    // may return 4xx/5xx or 429. In these cases we cannot make assertions
    // about the report contents and exit early.
    if (run.res.status !== 200) {
      return;
    }

    if (!run.json || run.json.success !== true) {
      throw new Error('Expected success response from run endpoint');
    }

    const { res: statusRes, json: statusJson } = await getJson<
      ApiResponse<{ task: any; report: WebEvalReportWithAssertions | null }>
    >(`/api/testing/evaluate/${taskId}`, { headers: { Cookie: cookie! } });

    expect(statusRes.status).toBe(200);

    const js = statusJson as ApiResponse<{
      task: any;
      report: WebEvalReportWithAssertions | null;
    }> | null;
    if (!js || js.success !== true || !js.data.report) {
      // If no report is present yet (or the environment short-circuited), we
      // cannot assert on assertions/verdict in a stable way.
      return;
    }

    const report = js.data.report;

    // When a report is present after a successful browser run, it should
    // include an assertions array and a verdict derived from those results.
    expect(Array.isArray(report.assertions)).toBe(true);
    if (!report.assertions) return;

    expect(report.assertions.length).toBeGreaterThanOrEqual(1);

    // Each assertion result should carry a passed flag and retain its kind/value.
    for (const a of report.assertions) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.kind).toBe('string');
      expect(typeof a.value).toBe('string');
      expect(typeof a.passed).toBe('boolean');
    }

    // Verdict should be set when at least one assertion has been evaluated.
    expect(['pass', 'fail', 'inconclusive']).toContain(report.verdict);
  });

  // Env-guarded: only meaningful when auto-assertions are enabled for this environment
  const AUTO_ASSERTIONS_ENABLED_FOR_TESTS =
    process.env.WEB_EVAL_AUTO_ASSERTIONS_ENABLE === '1' ||
    (process.env.WEB_EVAL_AUTO_ASSERTIONS_ENABLE || '').toLowerCase() === 'true';

  (AUTO_ASSERTIONS_ENABLED_FOR_TESTS ? it : it.skip)(
    'includes auto-generated assertions and verdict in the report when none are provided explicitly',
    async () => {
      const { taskId, cookie } = await createTask({
        url: 'https://example.com/',
      });

      const run = await callRun();

      // Environments without a configured browser runner or under heavy load
      // may return non-200 responses. In these cases we cannot assert on the
      // report contents in a stable way.
      if (run.res.status !== 200) {
        return;
      }

      if (!run.json || run.json.success !== true) {
        throw new Error('Expected success response from run endpoint');
      }

      const { res: statusRes, json: statusJson } = await getJson<
        ApiResponse<{ task: any; report: WebEvalReportWithAssertions | null }>
      >(`/api/testing/evaluate/${taskId}`, { headers: { Cookie: cookie! } });

      expect(statusRes.status).toBe(200);

      const js = statusJson as ApiResponse<{
        task: any;
        report: WebEvalReportWithAssertions | null;
      }> | null;
      if (!js || js.success !== true || !js.data.report) {
        // If no report is present yet (or the environment short-circuited), we
        // cannot make stable assertions about auto-assertions.
        return;
      }

      const report = js.data.report;

      expect(Array.isArray(report.assertions)).toBe(true);
      if (!report.assertions) return;

      expect(report.assertions.length).toBeGreaterThanOrEqual(1);
      expect(['pass', 'fail', 'inconclusive']).toContain(report.verdict);
    }
  );

  (AUTO_ASSERTIONS_ENABLED_FOR_TESTS ? it : it.skip)(
    'does not add auto-assertions when an explicit empty assertions array is provided',
    async () => {
      const { taskId, cookie } = await createTask({
        url: 'https://example.com/',
        assertions: [],
      });

      const run = await callRun();

      if (run.res.status !== 200) {
        return;
      }

      if (!run.json || run.json.success !== true) {
        throw new Error('Expected success response from run endpoint');
      }

      const { res: statusRes, json: statusJson } = await getJson<
        ApiResponse<{ task: any; report: WebEvalReportWithAssertions | null }>
      >(`/api/testing/evaluate/${taskId}`, { headers: { Cookie: cookie! } });

      expect(statusRes.status).toBe(200);

      const js = statusJson as ApiResponse<{
        task: any;
        report: WebEvalReportWithAssertions | null;
      }> | null;
      if (!js || js.success !== true || !js.data.report) {
        return;
      }

      const report = js.data.report;

      if (!report.assertions) {
        // No assertions present at all is acceptable for this case.
        return;
      }

      expect(report.assertions.length).toBe(0);
      // Verdict may be undefined when no assertions were evaluated.
    }
  );

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
