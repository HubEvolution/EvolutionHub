import { runTask } from './runner';
import type { WebEvalTask, ClaimNextResponse, CompletionPayload } from './types';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getBaseUrl(): string {
  const fromEnv = process.env.BASE_URL || process.env.TEST_BASE_URL;
  const base = (fromEnv || 'http://127.0.0.1:8787').replace(/\/$/, '');
  return base;
}

async function claimNext(baseUrl: string, token: string): Promise<ClaimNextResponse> {
  const res = await fetch(`${baseUrl}/api/testing/evaluate/next`, {
    method: 'POST',
    headers: {
      'x-executor-token': token,
      Origin: baseUrl,
    },
    redirect: 'manual',
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as ClaimNextResponse;
  } catch {
    return {
      success: false,
      error: { type: 'server_error', message: `invalid json: ${text.slice(0, 120)}` },
    } as any;
  }
}

async function postComplete(
  baseUrl: string,
  token: string,
  payload: CompletionPayload
): Promise<Response> {
  const url = `${baseUrl}/api/testing/evaluate/${encodeURIComponent(payload.report.taskId)}/complete`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-executor-token': token,
      Origin: baseUrl,
    },
    body: JSON.stringify(payload),
    redirect: 'manual',
  });
}

function parseBoolEnv(name: string): boolean | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const s = String(v).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return undefined;
}

function parseIntEnv(name: string): number | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

function applyRunnerDefaults(task: WebEvalTask): WebEvalTask {
  const t: WebEvalTask = { ...task };
  const idle = parseIntEnv('WEB_EVAL_IDLE_WAIT_MS');
  if (idle !== undefined && t.idleWaitMs == null) t.idleWaitMs = idle;
  const fatal = parseBoolEnv('WEB_EVAL_FATAL_SAME_ORIGIN');
  if (fatal !== undefined && t.sameOriginConsoleFatal == null) t.sameOriginConsoleFatal = fatal;
  const shot = parseBoolEnv('WEB_EVAL_SCREENSHOT_ON_FAILURE');
  if (shot !== undefined && t.screenshotOnFailure == null) t.screenshotOnFailure = shot;
  const trace = parseBoolEnv('WEB_EVAL_TRACE_ON_FAILURE');
  if (trace !== undefined && t.traceOnFailure == null) t.traceOnFailure = trace;
  return t;
}

async function main() {
  const token = process.env.WEB_EVAL_EXECUTOR_TOKEN;
  if (!token) {
    console.error('[executor] Missing WEB_EVAL_EXECUTOR_TOKEN');
    process.exitCode = 1;
    return;
  }
  const baseUrl = getBaseUrl();
  console.log(`[executor] Base URL: ${baseUrl}`);

  let backoff = 2000;
  const maxBackoff = 10000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const claim = await claimNext(baseUrl, token);
      if (!claim.success) {
        console.warn('[executor] claim error:', claim.error?.type, claim.error?.message);
        await sleep(backoff);
        backoff = Math.min(maxBackoff, backoff * 2);
        continue;
      }

      const task: WebEvalTask | null = claim.data.task as any;
      if (!task) {
        await sleep(backoff);
        backoff = Math.min(maxBackoff, backoff * 2);
        continue;
      }

      // Reset backoff on work
      backoff = 2000;

      console.log(`[executor] Running task ${task.id} → ${task.url}`);
      const enhancedTask = applyRunnerDefaults(task);
      const completion = await runTask(enhancedTask);

      // Retry completion honoring 429 Retry-After; max ~120s window
      const deadline = Date.now() + 120_000;
      let attempt = 0;
      let ok = false;
      let backoffMs = 1000;
      while (!ok && Date.now() < deadline) {
        const res = await postComplete(baseUrl, token, completion);
        if (res.status === 200) {
          ok = true;
          break;
        }

        // Respect rate limit backoff if provided
        if (res.status === 429) {
          try {
            // Prefer header; fallback to JSON body.retryAfter seconds
            const headerVal = res.headers.get('Retry-After');
            let delayMs = 0;
            if (headerVal) {
              const parsed = parseInt(headerVal, 10);
              if (Number.isFinite(parsed) && parsed >= 0) delayMs = parsed * 1000;
            }
            if (!delayMs) {
              const bodyTxt = await res.text();
              try {
                const body = JSON.parse(bodyTxt);
                const ra = body?.retryAfter;
                if (typeof ra === 'number' && ra >= 0) delayMs = ra * 1000;
              } catch {
                // ignore json parse errors; fall back to default
              }
            }
            if (!delayMs) delayMs = 3000; // sensible default
            console.warn(
              `[executor] complete hit 429, waiting ${Math.round(delayMs / 1000)}s before retry`
            );
            await sleep(delayMs);
          } catch (e) {
            console.warn(
              '[executor] complete 429 handling error:',
              e instanceof Error ? e.message : String(e)
            );
            await sleep(3000);
          }
          attempt++;
          continue;
        }

        // Other non-200 statuses: exponential backoff
        const bodyTxt = await res.text();
        console.warn(
          `[executor] complete failed (status=${res.status}) attempt=${attempt + 1} body=${bodyTxt.slice(0, 200)}`
        );
        await sleep(backoffMs);
        backoffMs = Math.min(8000, backoffMs * 2);
        attempt++;
      }

      console.log(`[executor] Completed task ${task.id} status=${completion.status}`);
    } catch (err) {
      console.error('[executor] loop error:', err instanceof Error ? err.message : String(err));
      await sleep(backoff);
      backoff = Math.min(maxBackoff, backoff * 2);
    }
  }
}

main().catch((e) => {
  console.error('[executor] fatal:', e);
  process.exitCode = 1;
});
