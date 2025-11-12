import { chromium, ConsoleMessage, Browser, Page, Response, Request } from '@playwright/test';
import type { WebEvalTask, CompletionPayload } from './types';

function nowIso() {
  return new Date().toISOString();
}

export async function runTask(task: WebEvalTask): Promise<CompletionPayload> {
  const startedAt = new Date();
  const consoleLogs: CompletionPayload['report']['consoleLogs'] = [];
  const networkRequests: CompletionPayload['report']['networkRequests'] = [];
  const errors: string[] = [];
  const steps: CompletionPayload['report']['steps'] = [];

  let browser: Browser | null = null;
  let page: Page | null = null;
  const reqStart = new Map<string, number>();
  let sameOriginConsoleError = false;

  try {
    browser = await chromium.launch({ headless: task.headless !== false });
    const context = await browser.newContext();
    page = await context.newPage();

    const taskOrigin = (() => {
      try {
        return new URL(task.url).origin;
      } catch {
        return '';
      }
    })();

    page.on('console', (msg: ConsoleMessage) => {
      const level = msg.type() as CompletionPayload['report']['consoleLogs'][number]['level'];
      const entry = {
        level:
          level && ['log', 'error', 'warn', 'info', 'debug'].includes(level as string)
            ? level
            : 'log',
        message: msg.text(),
        timestamp: nowIso(),
      } as const;
      consoleLogs.push(entry);
      if (entry.level === 'error') {
        errors.push(`console_error: ${entry.message}`);
        try {
          const loc = msg.location?.();
          const src = loc && typeof loc.url === 'string' ? loc.url : '';
          if (src && taskOrigin && src.startsWith(taskOrigin)) {
            sameOriginConsoleError = true;
          }
        } catch {
          // ignore location parsing
        }
      }
    });

    page.on('request', (req: Request) => {
      reqStart.set(req.url(), Date.now());
    });

    page.on('requestfinished', async (req: Request) => {
      try {
        const res = await req.response();
        const started = reqStart.get(req.url()) ?? Date.now();
        const duration = Math.max(0, Date.now() - started);
        networkRequests.push({
          method: req.method() as any,
          url: req.url(),
          status: res ? res.status() : 0,
          durationMs: duration,
        });
      } catch {
        // ignore
      }
    });

    steps.push({ action: 'goto', timestamp: nowIso() });
    const timeout = task.timeoutMs ?? 30_000;
    // Navigate quickly to DOMContentLoaded; avoid stalls on long-tail requests
    const response: Response | null = await page.goto(task.url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });
    // Best-effort short idle wait (3-5s) without stalling the whole run
    const idleWait = Math.min(5000, Math.max(0, timeout - 5000));
    try {
      if (idleWait > 0) {
        await page.waitForLoadState('networkidle', { timeout: idleWait });
        steps.push({ action: 'idle', timestamp: nowIso() });
      }
    } catch {
      // ignore idle wait timeout
    }

    // Basic health criteria
    const statusOk = response ? response.status() < 400 : true;
    const title = (await page.title()).trim();
    const titleOk = title.length > 0;
    // Treat only same-origin console errors as fatal; keep all errors in report
    const success = statusOk && titleOk && !sameOriginConsoleError;

    const finishedAt = new Date();
    const payload: CompletionPayload = {
      status: success ? 'completed' : 'failed',
      error: success ? undefined : 'page_health_check_failed',
      report: {
        taskId: task.id,
        url: task.url,
        taskDescription: task.task,
        success,
        steps,
        consoleLogs,
        networkRequests,
        errors,
        durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      },
    };
    return payload;
  } catch (err) {
    const finishedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    return {
      status: 'failed',
      error: message,
      report: {
        taskId: task.id,
        url: task.url,
        taskDescription: task.task,
        success: false,
        steps,
        consoleLogs,
        networkRequests,
        errors,
        durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      },
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
    } catch {
      // ignore close errors
    }
  }
}
