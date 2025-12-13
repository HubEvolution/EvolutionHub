import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execa } from 'execa';
import { runTask } from './runner';
import type { WebEvalTask } from './types';

function rlPrompt(query: string): Promise<string> {
  const rl = createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function getBaseUrl(): string {
  const fromEnv = process.env.BASE_URL || process.env.TEST_BASE_URL;
  return (fromEnv || 'http://127.0.0.1:8787').replace(/\/$/, '');
}

function printHeader(baseUrl: string) {
  console.log('Web‑Eval Executor — Interactive Menu');
  console.log(`Base URL: ${baseUrl}`);
  console.log('');
}

type CookieJar = Record<string, string>;
const jar: CookieJar = {};
const JAR_FILE = '/tmp/webeval.menu.jar.json';
let sessionToken: string | null = null;
const SETTINGS_FILE = '/tmp/webeval.menu.settings.json';
const POOL_FILE = '/tmp/webeval.pool.json';
let runnerDefaults: {
  idleWaitMs?: number;
  fatalSameOrigin?: boolean;
  screenshotOnFailure?: boolean;
  traceOnFailure?: boolean;
} = {};

function setCookieFromHeader(header: string) {
  // naive parser: first segment is name=value
  const first = header.split(';', 1)[0];
  const eq = first.indexOf('=');
  if (eq > 0) {
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) jar[name] = value;
  }
}

function readPool(): number[] {
  try {
    if (existsSync(POOL_FILE)) {
      const data = JSON.parse(readFileSync(POOL_FILE, 'utf8')) as { pids: number[] };
      return Array.isArray(data.pids) ? data.pids : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function writePool(pids: number[]) {
  try {
    writeFileSync(POOL_FILE, JSON.stringify({ pids }), 'utf8');
  } catch {
    // ignore
  }
}

async function startWorkers(count: number) {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  const t = getEffectiveToken();
  if (!t) {
    console.log('WEB_EVAL_EXECUTOR_TOKEN missing (session or env).');
    return;
  }
  env.WEB_EVAL_EXECUTOR_TOKEN = t;
  if (runnerDefaults.idleWaitMs != null)
    env.WEB_EVAL_IDLE_WAIT_MS = String(runnerDefaults.idleWaitMs);
  if (runnerDefaults.fatalSameOrigin != null)
    env.WEB_EVAL_FATAL_SAME_ORIGIN = runnerDefaults.fatalSameOrigin ? '1' : '0';
  if (runnerDefaults.screenshotOnFailure != null)
    env.WEB_EVAL_SCREENSHOT_ON_FAILURE = runnerDefaults.screenshotOnFailure ? '1' : '0';
  if (runnerDefaults.traceOnFailure != null)
    env.WEB_EVAL_TRACE_ON_FAILURE = runnerDefaults.traceOnFailure ? '1' : '0';
  const pids = readPool();
  for (let i = 0; i < count; i++) {
    const child = execa('npm', ['run', '-s', 'web-eval:executor'], {
      stdio: 'ignore',
      env,
      detached: true,
    });
    if (child.pid) {
      child.unref();
      pids.push(child.pid);
    }
  }
  writePool(pids);
  console.log(`Started ${count} worker(s). Pool size: ${pids.length}`);
}

async function startFgAuto() {
  await execa('npm', ['run', '-s', 'web-eval:exec:auto'], { stdio: 'inherit' });
}

function listWorkers() {
  const pids = readPool();
  if (pids.length === 0) {
    console.log('No pooled workers.');
    return;
  }
  const rows = pids.map((pid) => {
    try {
      process.kill(pid, 0);
      return { pid, alive: true };
    } catch {
      return { pid, alive: false };
    }
  });
  console.table(rows);
}

function stopWorkers() {
  const pids = readPool();
  if (pids.length === 0) {
    console.log('No pooled workers to stop.');
    return;
  }
  let stopped = 0;
  for (const pid of pids) {
    try {
      process.kill(pid);
      stopped++;
    } catch {
      // ignore
    }
  }
  try {
    unlinkSync(POOL_FILE);
  } catch {}
  console.log(`Stopped ${stopped} worker(s).`);
}

async function localRunFlow() {
  const url = await rlPrompt('Enter absolute URL (e.g., https://example.com): ');
  if (!url) return;
  const headlessAns = await rlPrompt('Headless? (y/n, default y): ');
  const headless = headlessAns.trim().toLowerCase() === 'n' ? false : true;
  const timeoutAns = await rlPrompt('Timeout ms (default 20000): ');
  const timeoutMs = Math.max(1000, Number(timeoutAns) || 20000);
  const idleAns = await rlPrompt(
    `Idle wait ms (enter to default ${runnerDefaults.idleWaitMs ?? 'auto'}): `
  );
  const idleWaitMs = idleAns ? Math.max(0, Number(idleAns) || 0) : runnerDefaults.idleWaitMs;
  const fatalAns = await rlPrompt(
    `Treat same-origin console errors as fatal? (y/n, default ${(runnerDefaults.fatalSameOrigin ?? true) ? 'y' : 'n'}): `
  );
  const fatalSameOrigin = fatalAns
    ? fatalAns.trim().toLowerCase() !== 'n'
    : (runnerDefaults.fatalSameOrigin ?? true);
  const shotAns = await rlPrompt(
    `Screenshot on failure? (y/n, default ${(runnerDefaults.screenshotOnFailure ?? true) ? 'y' : 'n'}): `
  );
  const screenshotOnFailure = shotAns
    ? shotAns.trim().toLowerCase() !== 'n'
    : (runnerDefaults.screenshotOnFailure ?? true);
  const traceAns = await rlPrompt(
    `Trace on failure? (y/n, default ${(runnerDefaults.traceOnFailure ?? false) ? 'y' : 'n'}): `
  );
  const traceOnFailure = traceAns
    ? traceAns.trim().toLowerCase() === 'y'
    : (runnerDefaults.traceOnFailure ?? false);
  const task: WebEvalTask = {
    id: `local-${Date.now()}`,
    url,
    task: 'Local evaluation (no server)',
    headless,
    timeoutMs,
    idleWaitMs,
    sameOriginConsoleFatal: fatalSameOrigin,
    screenshotOnFailure,
    traceOnFailure,
  };
  console.log('Running locally...');
  const completion = await runTask(task);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join('.logs', 'web-eval-local', ts);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'report.json'), JSON.stringify(completion, null, 2), 'utf8');
  } catch {}
  console.log(`Done. Status=${completion.status}. Report saved to ${join(dir, 'report.json')}`);
}

async function healthCheck(baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: baseUrl } });
    const json = await res.json();
    console.log('Health:', json);
  } catch (e) {
    console.log('Health check failed:', e instanceof Error ? e.message : String(e));
  }
}

function extractSetCookies(res: Response): string[] {
  const anyHeaders = res.headers as any;
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  if (typeof anyHeaders.raw === 'function') {
    const raw = anyHeaders.raw();
    return raw && Array.isArray(raw['set-cookie']) ? raw['set-cookie'] : [];
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function jarHeader(): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(jar)) parts.push(`${k}=${v}`);
  return parts.join('; ');
}

function saveJar() {
  try {
    writeFileSync(JAR_FILE, JSON.stringify(jar), 'utf8');
  } catch {
    // ignore
  }
}

function loadJar() {
  try {
    if (existsSync(JAR_FILE)) {
      const data = JSON.parse(readFileSync(JAR_FILE, 'utf8')) as CookieJar;
      Object.assign(jar, data);
    }
  } catch {
    // ignore
  }
}

function getEffectiveToken(): string | undefined {
  return sessionToken || process.env.WEB_EVAL_EXECUTOR_TOKEN || undefined;
}

function loadSettings(): { baseUrl?: string } {
  try {
    if (existsSync(SETTINGS_FILE)) {
      return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) as { baseUrl?: string };
    }
  } catch {
    // ignore
  }
  return {};
}

function saveSettings(settings: { baseUrl?: string }) {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings), 'utf8');
  } catch {
    // ignore
  }
}

async function startBg() {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  const t = getEffectiveToken();
  if (t) env.WEB_EVAL_EXECUTOR_TOKEN = t;
  if (runnerDefaults.idleWaitMs != null)
    env.WEB_EVAL_IDLE_WAIT_MS = String(runnerDefaults.idleWaitMs);
  if (runnerDefaults.fatalSameOrigin != null)
    env.WEB_EVAL_FATAL_SAME_ORIGIN = runnerDefaults.fatalSameOrigin ? '1' : '0';
  if (runnerDefaults.screenshotOnFailure != null)
    env.WEB_EVAL_SCREENSHOT_ON_FAILURE = runnerDefaults.screenshotOnFailure ? '1' : '0';
  if (runnerDefaults.traceOnFailure != null)
    env.WEB_EVAL_TRACE_ON_FAILURE = runnerDefaults.traceOnFailure ? '1' : '0';
  await execa('npm', ['run', '-s', 'web-eval:start'], { stdio: 'inherit', env });
}

async function stopBg() {
  await execa('npm', ['run', '-s', 'web-eval:stop'], { stdio: 'inherit' });
}

async function tailLogs() {
  console.log('Tailing logs (.logs/web-eval-executor.log). Press Ctrl-C to stop.');
  await execa('npm', ['run', '-s', 'web-eval:tail'], { stdio: 'inherit' });
}

function status() {
  if (!existsSync('.executor.pid')) {
    console.log('Status: not running (no .executor.pid)');
    return;
  }
  try {
    const pid = parseInt(readFileSync('.executor.pid', 'utf8').trim(), 10);
    if (!Number.isFinite(pid)) {
      console.log('Status: unknown (invalid PID file)');
      return;
    }
    try {
      process.kill(pid, 0);
      console.log(`Status: running (PID=${pid})`);
    } catch {
      console.log(`Status: not running (stale PID=${pid})`);
    }
  } catch (e) {
    console.log('Status: unknown (error reading PID)');
  }
}

async function createTask(baseUrl: string, path: string) {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const payload = {
    url,
    task: 'Open page and verify a non-empty title',
    headless: true,
    timeoutMs: 20000,
  };
  const res = await fetch(`${baseUrl}/api/testing/evaluate`, {
    method: 'POST',
    headers: {
      Origin: baseUrl,
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'dev',
      Cookie: jarHeader() || 'csrf_token=dev',
    },
    body: JSON.stringify(payload),
  });
  // capture cookies (guest_id, csrf_token, etc.) for subsequent GETs
  const cookies = extractSetCookies(res);
  for (const h of cookies) setCookieFromHeader(h);
  saveJar();
  const text = await res.text();
  try {
    const json = JSON.parse(text) as any;
    if (json?.success && json?.data?.taskId) {
      console.log(`Task created: ${json.data.taskId}`);
      return json.data.taskId as string;
    } else {
      console.log('Unexpected response:', json ?? text);
    }
  } catch {
    console.log('Non-JSON response:', text.slice(0, 300));
  }
  return null;
}

async function getTaskStatus(baseUrl: string, id: string) {
  const res = await fetch(`${baseUrl}/api/testing/evaluate/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      Origin: baseUrl,
      Cookie: jarHeader(),
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as any;
  } catch {
    return { success: false, error: { type: 'parse_error', message: text.slice(0, 200) } };
  }
}

async function watchTask(baseUrl: string, id: string) {
  console.log(`Watching task ${id} ... (Ctrl-C to stop)`);
  const deadline = Date.now() + 120_000; // 2 min
  let attempt = 0;
  let backoff = 1500;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const now = Date.now();
    if (now > deadline) {
      console.log('Timeout waiting for completion.');
      return;
    }
    const json = await getTaskStatus(baseUrl, id);
    if (!json?.success) {
      console.log('Status error:', json?.error ?? json);
    } else {
      const status = json?.data?.status ?? json?.data?.task?.status;
      const report = json?.data?.report ?? json?.data?.reportEnvelope?.report;
      console.log(`status=${status || 'unknown'} attempt=${attempt}`);
      if (status === 'completed') {
        if (report) {
          const summary = {
            title: report.title,
            mainStatusOk: report.mainResponseStatus && report.mainResponseStatus < 400,
            sameOriginConsoleErrors: Array.isArray(report.errors)
              ? report.errors.filter((e: string) => /same-origin|console_error/i.test(e)).length
              : 0,
            durationMs: report.durationMs,
          };
          console.log('Report summary:', summary);
        }
        return;
      }
    }
    await new Promise((r) => setTimeout(r, backoff));
    backoff = Math.min(8000, Math.round(backoff * 1.5));
    attempt++;
  }
}

async function main() {
  let baseUrl = getBaseUrl();
  const settings = loadSettings();
  if (settings.baseUrl) baseUrl = settings.baseUrl;
  loadJar();
  // Simple loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    printHeader(baseUrl);
    console.log('1) Start executor (background)');
    console.log('2) Stop executor');
    console.log('3) Tail executor logs');
    console.log('4) Status');
    console.log('5) Create test task for /');
    console.log('6) Create test task for /en');
    console.log('7) Create test task for custom path');
    console.log('8) Create & watch task for /');
    console.log('9) Watch task by ID');
    console.log('10) Change Base URL');
    console.log('11) Run executor (foreground, auto .env)');
    console.log('12) Set executor token (session only; not saved)');
    console.log('13) Clear session token');
    console.log('14) Start N workers (pool)');
    console.log('15) Stop all pooled workers');
    console.log('16) List pooled workers');
    console.log('17) Local run (no server)');
    console.log('18) Health check');
    console.log('19) Save current Base URL as default');
    console.log('20) Set runner defaults (session)');
    console.log('21) Clear runner defaults');
    console.log('22) Exit');
    const choice = await rlPrompt('Choose an option [1-22]: ');

    switch (choice) {
      case '1':
        await startBg();
        break;
      case '2':
        await stopBg();
        break;
      case '3':
        await tailLogs();
        break;
      case '4':
        status();
        break;
      case '5':
        await createTask(baseUrl, '/');
        break;
      case '6':
        await createTask(baseUrl, '/en');
        break;
      case '7': {
        const p = await rlPrompt('Enter path (e.g., /en/tools): ');
        if (p) await createTask(baseUrl, p);
        break;
      }
      case '8': {
        const id = await createTask(baseUrl, '/');
        if (id) await watchTask(baseUrl, id);
        break;
      }
      case '9': {
        const id = await rlPrompt('Enter task ID: ');
        if (id) await watchTask(baseUrl, id);
        break;
      }
      case '10': {
        const u = await rlPrompt('Enter Base URL (default http://127.0.0.1:8787): ');
        if (u) baseUrl = u.replace(/\/$/, '');
        break;
      }
      case '11':
        await startFgAuto();
        break;
      case '12': {
        const v = await rlPrompt('Paste executor token (will not be saved): ');
        if (v) sessionToken = v;
        break;
      }
      case '13':
        sessionToken = null;
        console.log('Session token cleared.');
        break;
      case '14': {
        const nStr = await rlPrompt('Workers to start: ');
        const n = Math.max(1, Number(nStr) || 1);
        await startWorkers(n);
        break;
      }
      case '15':
        stopWorkers();
        break;
      case '16':
        listWorkers();
        break;
      case '17':
        await localRunFlow();
        break;
      case '18':
        await healthCheck(baseUrl);
        break;
      case '19':
        saveSettings({ baseUrl });
        console.log('Saved.');
        break;
      case '20': {
        const idle = await rlPrompt('Default idleWaitMs (empty to unset): ');
        runnerDefaults.idleWaitMs = idle ? Math.max(0, Number(idle) || 0) : undefined;
        const fatal = await rlPrompt(
          'Default fatal same-origin console errors? (y/n/empty=unset): '
        );
        runnerDefaults.fatalSameOrigin = fatal ? fatal.trim().toLowerCase() === 'y' : undefined;
        const shot = await rlPrompt('Default screenshot on failure? (y/n/empty=unset): ');
        runnerDefaults.screenshotOnFailure = shot ? shot.trim().toLowerCase() === 'y' : undefined;
        const trace = await rlPrompt('Default trace on failure? (y/n/empty=unset): ');
        runnerDefaults.traceOnFailure = trace ? trace.trim().toLowerCase() === 'y' : undefined;
        console.log('Runner defaults updated for this session.');
        break;
      }
      case '21':
        runnerDefaults = {};
        console.log('Runner defaults cleared.');
        break;
      case '22':
        console.log('Bye.');
        return;
      default:
        console.log('Invalid choice');
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error('Menu error:', e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
