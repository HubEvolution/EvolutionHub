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

async function probeForUrl(candidate: string): Promise<boolean> {
  // Prefer a dynamic API probe that only the worker serves
  try {
    const res = await fetch(`${candidate}/api/csp-report`, {
      method: 'GET',
      redirect: 'manual',
    });
    if (res.status === 405 && res.headers.get('allow') === 'POST') return true;
  } catch {}
  // Fallback API probe
  try {
    const res = await fetch(`${candidate}/api/auth/verify-email?token=abc`, {
      redirect: 'manual',
    });
    if (res.status === 302) return true;
  } catch {}
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
    };
  }

  // 1) Setup local dev resources (DB/KV/R2/test user)
  await new Promise<void>((resolve, reject) => {
    const p = spawn('npm', ['run', 'db:setup'], { cwd: rootDir, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`db:setup exited ${code}`))));
  });

  // 2) Build worker once (avoids bundling during dev) if not present
  const workerEntry = join(rootDir, 'dist/_worker.js/index.js');
  if (!existsSync(workerEntry)) {
    await new Promise<void>((resolve, reject) => {
      const p = spawn('npm', ['run', 'build:worker'], { cwd: rootDir, stdio: 'inherit' });
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build:worker exited ${code}`))));
    });
  }

  // 3) Start wrangler dev without rebuilding (serve prebuilt worker)
  serverProcess = spawn('npm', ['run', 'dev:worker:nobuild'], {
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: 'test' },
    detached: false,
  });

  let logs = '';
  const detectUrl = (chunk: Buffer | string) => {
    const s = chunk.toString();
    logs += s;
    // eslint-disable-next-line no-console
    console.log('[dev]', s.trim());
    const m = logs.match(/https?:\/\/(localhost|127\.0\.0\.1):\d+/);
    if (m) {
      TEST_URL = m[0];
    }
  };
  serverProcess.stdout?.on('data', detectUrl);
  serverProcess.stderr?.on('data', detectUrl);

  // 4) Readiness loop with port scan fallback
  const maxWaitTime = 180000;
  const start = Date.now();
  while (Date.now() - start < maxWaitTime) {
    if (!TEST_URL) {
      // After some delay, try common wrangler ports/schemes/hosts
      if (Date.now() - start > 20000) {
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

  if (!TEST_URL || !(await probeForUrl(TEST_URL))) {
    // eslint-disable-next-line no-console
    console.error('Dev server readiness failed. TEST_URL currently =', TEST_URL);
    throw new Error('Dev server did not start in time');
  }

  process.env.TEST_BASE_URL = TEST_URL;

  // Provide global teardown
  return async () => {
    if (serverProcess) {
      try {
        serverProcess.kill('SIGTERM');
      } catch {}
    }
  };
}
