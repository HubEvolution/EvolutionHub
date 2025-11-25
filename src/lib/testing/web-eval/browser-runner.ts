import type {
  WebEvalAssertionDefinition,
  WebEvalAssertionResult,
  WebEvalTaskRecord,
  WebEvalReport,
  WebEvalVerdict,
  WebEvalConsoleLog,
  WebEvalNetworkRequest,
  WebEvalStep,
} from '@/lib/testing/web-eval';
import type { WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import puppeteer from '@cloudflare/puppeteer';

export type BrowserRunResultStatus = 'completed' | 'failed';

export interface BrowserRunResult {
  report: WebEvalReport;
  status: BrowserRunResultStatus;
  lastError?: string;
}

interface PuppeteerResponseLike {
  status(): number;
}

interface PuppeteerRequestLike {
  url(): string;
  method(): string;
  response(): Promise<PuppeteerResponseLike | null>;
}

interface PuppeteerConsoleMessageLike {
  type(): string;
  text(): string;
  location(): { url?: string } | null | undefined;
}

interface PuppeteerPageLike {
  on(event: 'console', handler: (msg: PuppeteerConsoleMessageLike) => void): void;
  on(event: 'request', handler: (req: PuppeteerRequestLike) => void): void;
  on(event: 'requestfinished', handler: (req: PuppeteerRequestLike) => void): void;
  goto(
    url: string,
    options: { waitUntil: 'domcontentloaded'; timeout: number }
  ): Promise<PuppeteerResponseLike | null>;
  title(): Promise<string>;
  setUserAgent(userAgent: string): Promise<void>;
  setViewport(options: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  }): Promise<void>;
  screenshot(options: { encoding: 'base64'; fullPage?: boolean }): Promise<string>;
  close(): Promise<void>;
  content(): Promise<string>;
  $(selector: string): Promise<unknown | null>;
}

interface PuppeteerBrowserLike {
  newPage(): Promise<PuppeteerPageLike>;
  close(): Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface BrowserRunLiveSnapshot {
  taskId: string;
  steps: WebEvalStep[];
  errors: string[];
  logs: WebEvalConsoleLog[];
}

export type BrowserRunLiveUpdateCallback = (
  snapshot: BrowserRunLiveSnapshot
) => Promise<void> | void;

export async function runTaskWithBrowserRendering(
  task: WebEvalTaskRecord,
  env: WebEvalEnvBindings,
  onLiveUpdate?: BrowserRunLiveUpdateCallback
): Promise<BrowserRunResult> {
  const startedAt = new Date();
  const consoleLogs: WebEvalConsoleLog[] = [];
  const networkRequests: WebEvalNetworkRequest[] = [];
  const errors: string[] = [];
  const steps: WebEvalStep[] = [];

  let browser: PuppeteerBrowserLike | null = null;
  let page: PuppeteerPageLike | null = null;
  const reqStart = new Map<string, number>();
  let sameOriginConsoleError = false;
  let verdict: WebEvalVerdict | undefined;
  let assertionResults: WebEvalAssertionResult[] | undefined;
  let screenshotBase64: string | undefined;

  const emitLiveUpdate =
    typeof onLiveUpdate === 'function'
      ? async () => {
          try {
            const liveLogs = consoleLogs.filter((e) => e.level === 'warn' || e.level === 'error');
            const MAX_LIVE_LOGS = 20;
            const slicedLogs = liveLogs.slice(-MAX_LIVE_LOGS);
            await onLiveUpdate({
              taskId: task.id,
              steps: [...steps],
              errors: [...errors],
              logs: slicedLogs,
            });
          } catch {
            // ignore live update failures
          }
        }
      : undefined;

  try {
    const taskOrigin = (() => {
      try {
        return new URL(task.url).origin;
      } catch {
        return '';
      }
    })();

    // Launch headless browser via Cloudflare Browser Rendering binding.
    // The BROWSER binding type is provided by Cloudflare at runtime; we cast
    // to an internal interface to avoid leaking any into the rest of the code.
    const launched = await puppeteer.launch(env.BROWSER as unknown as never);
    browser = launched as unknown as PuppeteerBrowserLike;

    page = await browser.newPage();

    if (task.headless === false) {
      try {
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({
          width: 1366,
          height: 768,
          deviceScaleFactor: 1,
        });
      } catch {
        // ignore profile configuration failures
      }
    }

    page.on('console', (msg: PuppeteerConsoleMessageLike) => {
      const levelRaw = msg.type();
      const allowedLevels: WebEvalConsoleLog['level'][] = ['log', 'error', 'warn', 'info', 'debug'];
      const level = allowedLevels.includes(levelRaw as WebEvalConsoleLog['level'])
        ? (levelRaw as WebEvalConsoleLog['level'])
        : 'log';

      const entry: WebEvalConsoleLog = {
        level,
        message: msg.text(),
        timestamp: nowIso(),
      };
      consoleLogs.push(entry);

      if (entry.level === 'error') {
        errors.push(`console_error: ${entry.message}`);
        try {
          const loc = msg.location();
          const src = loc && typeof loc.url === 'string' ? loc.url : '';
          if (src && taskOrigin && src.startsWith(taskOrigin)) {
            sameOriginConsoleError = true;
          }
        } catch {
          // ignore location parsing errors
        }
      }
    });

    page.on('request', (req: PuppeteerRequestLike) => {
      reqStart.set(req.url(), Date.now());
    });

    page.on('requestfinished', async (req: PuppeteerRequestLike) => {
      try {
        const res = await req.response();
        const started = reqStart.get(req.url()) ?? Date.now();
        const duration = Math.max(0, Date.now() - started);
        const status = res ? res.status() : 0;
        const method = req.method().toUpperCase();

        const request: WebEvalNetworkRequest = {
          method: method as WebEvalNetworkRequest['method'],
          url: req.url(),
          status,
          durationMs: duration,
        };
        networkRequests.push(request);
      } catch {
        // ignore request tracking errors
      }
    });

    steps.push({ action: 'goto', timestamp: nowIso(), phase: 'nav' });
    if (emitLiveUpdate) {
      await emitLiveUpdate();
    }
    const timeout = task.timeoutMs ?? 30_000;
    const response = await page.goto(task.url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    const statusOk = response ? response.status() < 400 : true;
    const title = (await page.title()).trim();
    const titleOk = title.length > 0;

    // Für den Worker-Runner betrachten wir same-origin Console-Errors als
    // potenziell fatal, übernehmen aber keine zusätzlichen Task-Flags aus
    // dem externen Executor-Schema.
    const fatalSameOrigin = true;
    const success = statusOk && titleOk && !(fatalSameOrigin && sameOriginConsoleError);

    const taskAssertions = (task as { assertions?: WebEvalAssertionDefinition[] }).assertions;
    if (Array.isArray(taskAssertions) && taskAssertions.length > 0 && success) {
      steps.push({ action: 'assertions', timestamp: nowIso(), phase: 'assertions' });
      if (emitLiveUpdate) {
        await emitLiveUpdate();
      }
      const results: WebEvalAssertionResult[] = [];
      const html = await page.content();

      for (const def of taskAssertions) {
        if (!def || !def.kind || !def.value) {
          continue;
        }

        if (def.kind === 'textIncludes') {
          const passed = html.includes(def.value);
          const details = passed ? undefined : 'Text not found in page content';
          results.push({ ...def, passed, details });
        } else if (def.kind === 'selectorExists') {
          let passed = false;
          let details: string | undefined;
          try {
            const el = await page.$(def.value);
            passed = Boolean(el);
            if (!passed) {
              details = 'No element found for selector';
            }
          } catch (err) {
            passed = false;
            const message = err instanceof Error ? err.message : String(err);
            details = `Selector evaluation error: ${message}`;
            errors.push(`assertion_error:${def.id}:${message}`);
          }
          results.push({ ...def, passed, details });
        }
      }

      if (results.length > 0) {
        assertionResults = results;
        const allPassed = results.every((r) => r.passed);
        verdict = allPassed ? 'pass' : 'fail';
      }
    }

    steps.push({ action: 'cleanup', timestamp: nowIso(), phase: 'cleanup' });
    const finishedAt = new Date();
    if (emitLiveUpdate) {
      await emitLiveUpdate();
    }

    // Best-effort screenshot capture for the final state of the page.
    // This is optional and should never break the run if it fails.
    if (!screenshotBase64 && page) {
      try {
        screenshotBase64 = await page.screenshot({ encoding: 'base64', fullPage: true });
      } catch {
        // ignore screenshot failures
      }
    }

    const report: WebEvalReport = {
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
      verdict,
      assertions: assertionResults,
      screenshotBase64,
    };

    return {
      report,
      status: success ? 'completed' : 'failed',
      lastError: success ? undefined : 'page_health_check_failed',
    };
  } catch (err) {
    const finishedAt = new Date();
    const rawMessage = err instanceof Error ? err.message : String(err);
    const normalizedMessage =
      typeof rawMessage === 'string' && rawMessage.includes('/v1/acquire')
        ? 'browser_backend_unavailable'
        : rawMessage;
    errors.push(normalizedMessage);

    // Attempt to capture a screenshot even on failure, if possible.
    if (!screenshotBase64 && page) {
      try {
        screenshotBase64 = await page.screenshot({ encoding: 'base64', fullPage: true });
      } catch {
        // ignore screenshot failures
      }
    }

    const report: WebEvalReport = {
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
      screenshotBase64,
    };

    return {
      report,
      status: 'failed',
      lastError: normalizedMessage,
    };
  } finally {
    try {
      if (page) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    } catch {
      // ignore close errors
    }
  }
}
