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
    return { success: false, error: { type: 'server_error', message: `invalid json: ${text.slice(0, 120)}` } } as any;
  }
}

async function postComplete(baseUrl: string, token: string, payload: CompletionPayload): Promise<Response> {
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
      const completion = await runTask(task);

      // Best-effort retry for completion
      let attempt = 0;
      let ok = false;
      while (attempt < 2 && !ok) {
        const res = await postComplete(baseUrl, token, completion);
        ok = res.status === 200;
        if (!ok) {
          const body = await res.text();
          console.warn(`[executor] complete failed (status=${res.status}) attempt=${attempt + 1} body=${body.slice(0, 200)}`);
          await sleep(1000);
        }
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
