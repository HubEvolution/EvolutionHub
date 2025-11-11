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

  try {
    browser = await chromium.launch({ headless: task.headless !== false });
    const context = await browser.newContext();
    page = await context.newPage();

    page.on('console', (msg: ConsoleMessage) => {
      const level = msg.type() as CompletionPayload['report']['consoleLogs'][number]['level'];
      const entry = {
        level: level && ['log', 'error', 'warn', 'info', 'debug'].includes(level as string) ? level : 'log',
        message: msg.text(),
        timestamp: nowIso(),
      } as const;
      consoleLogs.push(entry);
      if (entry.level === 'error') {
        errors.push(`console_error: ${entry.message}`);
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
          method: (req.method() as any),
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
    const response: Response | null = await page.goto(task.url, { waitUntil: 'networkidle', timeout });

    // Basic health criteria
    const statusOk = response ? response.status() < 400 : true;
    const title = (await page.title()).trim();
    const titleOk = title.length > 0;
    const consoleOk = !consoleLogs.some((l) => l.level === 'error');

    const success = statusOk && titleOk && consoleOk;

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
