import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

// Allow self-signed localhost certs during local dev server probing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function killProcessOnPort(port: number): Promise<void> {
  // Best-effort: find PIDs listening on the port and terminate them
  await new Promise<void>((resolve) => {
    const p = spawn('lsof', ['-ti', `tcp:${port}`], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let out = '';
    p.stdout?.on('data', (d) => (out += String(d)));
    p.on('close', () => {
      const pids = out
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0);
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGKILL');
          console.log(`[setup] Killed PID ${pid} on port ${port}`);
        } catch {
          // ignore failures
        }
      }
      resolve();
    });
  });
}

async function probeForUrl(candidate: string): Promise<boolean> {
  // Prefer a dynamic API probe that only the worker serves
  try {
    const res = await fetch(`${candidate}/api/csp-report`, {
      method: 'GET',
      redirect: 'manual',
    });
    if (res.status === 405 && res.headers.get('allow') === 'POST') return true;
  } catch (_e) {
    /* no-op */ void 0;
  }
  // Fallback API probe
  try {
    const res = await fetch(`${candidate}/api/auth/verify-email?token=abc`, {
      redirect: 'manual',
    });
    if (res.status === 302) return true;
  } catch (_e) {
    /* no-op */ void 0;
  }
  return false;
}

export default async function () {
  const ENV_URL = process.env.TEST_BASE_URL || '';
  let TEST_URL = '';
  let serverProcess: ReturnType<typeof spawn> | null = null;
  if (ENV_URL) {
    TEST_URL = ENV_URL.replace(/\/$/, '');
    // Validate provided URL
    const ok = await probeForUrl(TEST_URL);
    if (!ok) throw new Error(`TEST_BASE_URL is not serving the worker: ${TEST_URL}`);
    process.env.TEST_BASE_URL = TEST_URL;
    return async () => {
      // external server, nothing to teardown
      void 0; // no-op to satisfy no-empty
    };
  }

  // 1) Setup local dev resources (DB/KV/R2/test user)
  await new Promise<void>((resolve, reject) => {
    const p = spawn('npm', ['run', 'db:setup'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, CI: '1' },
    });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`db:setup exited ${code}`))));
  });

  // 2) Always rebuild worker to ensure latest code is served
  await new Promise<void>((resolve, reject) => {
    const p = spawn('npm', ['run', 'build:worker:dev'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env },
    });
    p.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`build:worker exited ${code}`))
    );
  });

  // 3) Ensure 8787 is free, then start wrangler dev on 8787 (canonical test origin)
  await killProcessOnPort(8787);
  await wait(300);
  serverProcess = spawn(
    'wrangler',
    ['dev', 'dist/_worker.js/index.js', '--port', '8787', '--config', 'wrangler.ci.toml'],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: '1',
        npm_config_yes: 'true',
        WRANGLER_CONFIG: 'wrangler.ci.toml',
        OPENAI_API_KEY: '',
        VOICE_DEV_ECHO: '1',
      },
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let logs = '';
  const detectUrl = (chunk: Buffer | string) => {
    const s = chunk.toString();
    logs += s;
    console.log('[dev]', s.trim());
    // Prefer canonical host 'localhost'. If both schemes appear, prefer HTTPS.
    // Otherwise, choose whatever is available (including default http://localhost:8787).
    const httpsMatches = logs.match(/https:\/\/(localhost|127\.0\.0\.1):\d+/g) || [];
    const httpMatches = logs.match(/http:\/\/(localhost|127\.0\.0\.1):\d+/g) || [];
    // Prefer our target dev port 8787 when present
    const httpsLocalhost =
      [...httpsMatches].reverse().find((u) => u.includes('https://localhost:8787')) ||
      [...httpsMatches].reverse().find((u) => u.includes('https://localhost:'));
    const httpLocalhost =
      [...httpMatches].reverse().find((u) => u.includes('http://localhost:8787')) ||
      [...httpMatches].reverse().find((u) => u.includes('http://localhost:'));
    const httpsLoopback =
      [...httpsMatches].reverse().find((u) => u.includes('https://127.0.0.1:8787')) ||
      [...httpsMatches].reverse().find((u) => u.includes('https://127.0.0.1:'));
    const httpLoopback =
      [...httpMatches].reverse().find((u) => u.includes('http://127.0.0.1:8787')) ||
      [...httpMatches].reverse().find((u) => u.includes('http://127.0.0.1:'));
    if (httpsLocalhost) TEST_URL = httpsLocalhost;
    else if (httpLocalhost) TEST_URL = httpLocalhost;
    else if (httpsLoopback) TEST_URL = httpsLoopback;
    else if (httpLoopback) TEST_URL = httpLoopback;
  };
  serverProcess.stdout?.on('data', detectUrl);
  serverProcess.stderr?.on('data', detectUrl);

  // 4) Readiness loop with port scan fallback
  const maxWaitTime = 180000;
  const start = Date.now();
  while (Date.now() - start < maxWaitTime) {
    if (!TEST_URL) {
      // After some delay, try common wrangler ports/schemes/hosts
      if (Date.now() - start > 5000) {
        const ports = [8787, 8788, 8790, 8791];
        const schemes = ['http', 'https'] as const;
        const hosts = ['127.0.0.1', 'localhost'] as const;
        outer: for (const host of hosts) {
          for (const p of ports) {
            for (const s of schemes) {
              const candidate = `${s}://${host}:${p}`;
              if (await probeForUrl(candidate)) {
                TEST_URL = candidate;
                break outer;
              }
            }
          }
        }
      }
    } else {
      if (await probeForUrl(TEST_URL)) break;
    }
    await wait(300);
  }

  // Normalize to localhost (instead of 127.0.0.1) when possible to avoid potential redirects
  if (TEST_URL && /:\/\/(127\.0\.0\.1):\d+/.test(TEST_URL)) {
    try {
      const u = new URL(TEST_URL);
      const alt = `${u.protocol}//localhost:${u.port}`;
      if (await probeForUrl(alt)) {
        TEST_URL = alt;
      }
    } catch {
      /* no-op */ void 0;
    }
  }

  if (!TEST_URL || !(await probeForUrl(TEST_URL))) {
    console.error('Dev server readiness failed. TEST_URL currently =', TEST_URL);
    throw new Error('Dev server did not start in time');
  }

  process.env.TEST_BASE_URL = TEST_URL;
  console.log('[setup] TEST_BASE_URL =', TEST_URL);

  // Provide global teardown
  return async () => {
    if (serverProcess) {
      try {
        serverProcess.kill('SIGTERM');
      } catch {
        /* no-op */ void 0;
      }
    }
  };
}
