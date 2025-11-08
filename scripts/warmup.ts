#!/usr/bin/env tsx

/**
 * Warmup script: Pre-warms key pages and lightweight API endpoints after deploy.
 * Usage:
 *   tsx scripts/warmup.ts --url <BASE_URL> [--env production|staging|testing] [--concurrency 4]
 * Exit codes:
 *   0 = health ok (and warmup attempted); 1 = health failed
 */

const DEFAULT_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRIES = 1; // light retry for warmup

function parseArgs() {
  const args = process.argv.slice(2);
  let baseUrl = process.env.BASE_URL || '';
  let envLabel: string | undefined;
  let concurrency = DEFAULT_CONCURRENCY;
  let internalHealthToken = process.env.INTERNAL_HEALTH_TOKEN || '';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url' && args[i + 1]) {
      baseUrl = args[++i];
    } else if (a === '--env' && args[i + 1]) {
      envLabel = args[++i];
    } else if (a === '--concurrency' && args[i + 1]) {
      const v = Number(args[++i]);
      if (!Number.isNaN(v) && v > 0) concurrency = v;
    } else if (a === '--internal-health-token' && args[i + 1]) {
      internalHealthToken = args[++i];
    }
  }
  if (!baseUrl) throw new Error('BASE_URL is required. Use --url https://... or set BASE_URL env');
  return { baseUrl: normalizeBaseUrl(baseUrl), envLabel, concurrency, internalHealthToken };
}

function normalizeBaseUrl(u: string) {
  return u.replace(/\/$/, '');
}

async function requestWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'EvolutionHub-DeployWarmup/1.0',
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function checkHealth(baseUrl: string, retries = 3, timeout = REQUEST_TIMEOUT_MS) {
  const url = `${baseUrl}/api/health`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Health] Attempt ${attempt}/${retries}: ${url}`);
      const res = await requestWithTimeout(url, { method: 'GET', timeout });
      const body = await getJsonSafe(res);
      const statusVal: string | undefined = body?.status ?? body?.data?.status;
      if (res.status === 200 && statusVal === 'ok') {
        console.log('✅ Health OK');
        return true;
      }
      console.warn(`⚠️  Health unexpected status=${res.status} payload=${JSON.stringify(body)}`);
    } catch (err) {
      console.error(`❌ Health error: ${(err as Error).message}`);
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 3_000));
  }
  return false;
}

async function checkInternalAuthHealth(baseUrl: string, token: string) {
  if (!token) return true;
  const url = `${baseUrl}/api/health/auth`;
  try {
    console.log(`[Health-Auth] ${url}`);
    const res = await requestWithTimeout(url, {
      method: 'GET',
      headers: { 'X-Internal-Health': token },
      timeout: REQUEST_TIMEOUT_MS,
    });
    if (res.ok) {
      console.log('✅ Internal auth health OK');
      return true;
    }
    console.warn(`⚠️  Internal auth health unexpected status=${res.status}`);
  } catch (e) {
    console.warn(`⚠️  Internal auth health error: ${(e as Error).message}`);
  }
  // Do not fail warmup when internal check fails; treat as soft
  return true;
}

async function prewarmPaths(baseUrl: string, label: string, paths: string[], concurrency: number) {
  console.log(`\n[Warmup:${label}] ${paths.length} request(s) with concurrency=${concurrency}`);
  let inFlight = 0;
  let idx = 0;
  let ok = 0;
  const failed: { path: string; status?: number; err?: string }[] = [];

  return new Promise<{ ok: number; failed: typeof failed }>((resolve) => {
    const next = () => {
      while (inFlight < concurrency && idx < paths.length) {
        const path = paths[idx++];
        inFlight++;
        (async () => {
          const url = `${baseUrl}${path}`;
          let lastErr: string | undefined;
          for (let attempt = 0; attempt <= RETRIES; attempt++) {
            const tryNo = attempt + 1;
            try {
              const t0 = Date.now();
              const res = await requestWithTimeout(url, { method: 'GET' });
              const dt = Date.now() - t0;
              if (res.ok) {
                console.log(`  ✓ ${path} (${res.status}) ${dt}ms`);
                ok++;
                break;
              } else {
                lastErr = `status=${res.status}`;
                console.warn(`  ⚠️  ${path} -> ${res.status} (attempt ${tryNo})`);
              }
            } catch (e) {
              lastErr = (e as Error).message;
              console.warn(`  ⚠️  ${path} -> error: ${lastErr} (attempt ${tryNo})`);
            }
          }
          if (lastErr) failed.push({ path, err: lastErr });
        })()
          .catch((e) => failed.push({ path, err: (e as Error).message }))
          .finally(() => {
            inFlight--;
            if (idx < paths.length) next();
            else if (inFlight === 0) resolve({ ok, failed });
          });
      }
    };
    next();
  });
}

async function prewarmRssTopPosts(baseUrl: string, limit = 3) {
  const rssUrl = `${baseUrl}/rss.xml`;
  try {
    const res = await requestWithTimeout(rssUrl, { method: 'GET' });
    if (!res.ok) {
      console.warn(`[RSS] Skipping, status=${res.status}`);
      return [] as string[];
    }
    const xml = await res.text();
    const links = Array.from(xml.matchAll(/<link>([^<]+)<\/link>/g))
      .map((m) => m[1])
      .filter((u) => typeof u === 'string' && u.includes('/blog/'))
      .slice(0, limit);
    const paths = links
      .map((u) => {
        try {
          const url = new URL(u, baseUrl);
          return url.origin === baseUrl ? url.pathname : url.pathname; // normalize to path
        } catch {
          return null;
        }
      })
      .filter((p): p is string => Boolean(p));
    console.log(`[RSS] Found ${paths.length} blog post(s) to warm`);
    return paths;
  } catch (e) {
    console.warn(`[RSS] Error: ${(e as Error).message}`);
    return [];
  }
}

async function main() {
  const { baseUrl, envLabel, concurrency, internalHealthToken } = parseArgs();
  console.log(`🔸 Warmup start for ${baseUrl}${envLabel ? ` [${envLabel}]` : ''}`);

  const healthy = await checkHealth(baseUrl);
  if (!healthy) {
    console.error('❌ Health check failed. Aborting warmup.');
    process.exit(1);
  }

  // Optional internal auth health (soft gate)
  if (internalHealthToken) {
    await checkInternalAuthHealth(baseUrl, internalHealthToken);
  }

  // Pages & apps
  const pagePaths = [
    '/',
    '/en/',
    '/tools',
    '/en/tools',
    '/pricing',
    '/en/pricing',
    '/login',
    '/en/login',
    '/register',
    '/en/register',
    '/admin',
    '/tools/imag-enhancer/app',
    '/en/tools/imag-enhancer/app',
    '/tools/prompt-enhancer/app',
    '/en/tools/prompt-enhancer/app',
    '/tools/webscraper/app',
    '/en/tools/webscraper/app',
    '/tools/voice-visualizer/app',
    '/en/tools/voice-visualizer/app',
    '/tools/video-enhancer/app',
    '/en/tools/video-enhancer/app',
    '/blog',
    '/en/blog',
  ];
  await prewarmPaths(baseUrl, 'pages', pagePaths, concurrency);

  const blogPaths = [
    '/blog/ki-als-kollege',
    '/blog/ai-ethics-workplace',
    '/blog/digital-detox-kreativitaet',
    '/blog/digital-leadership',
    '/blog/gig-economy-chancen-risiken',
    '/blog/imposter-syndrom-ueberwinden',
    '/blog/ki-im-alltag',
    '/blog/konstruktives-feedback-geben',
    '/blog/lebenslanges-lernen-karriere',
    '/blog/mentoring-2-0',
    '/blog/new-work-ist-eine-haltung',
    '/blog/pomodoro-technik-home-office',
    '/blog/sustainable-productivity',
    '/blog/vom-ziel-zur-gewohnheit',
    '/blog/wissensmanagement-second-brain',
    '/blog/zukunft-der-fuehrung',
  ];
  await prewarmPaths(baseUrl, 'blog-archive', blogPaths, concurrency);

  // APIs (public, lightweight)
  const apiPaths = [
    '/api/tools',
    '/api/ai-image/usage',
    '/api/ai-video/usage',
    '/api/prompt/usage',
    '/api/voice/usage',
    '/api/webscraper/usage',
  ];
  await prewarmPaths(baseUrl, 'apis', apiPaths, concurrency);

  // Optional: warm top blog posts via RSS
  const rssPostPaths = await prewarmRssTopPosts(baseUrl, 3);
  if (rssPostPaths.length > 0) {
    await prewarmPaths(baseUrl, 'blog-posts', rssPostPaths, concurrency);
  }

  console.log('\n✅ Warmup completed');
  process.exit(0);
}

main().catch((e) => {
  console.error(`❌ Warmup fatal error: ${(e as Error).message}`);
  process.exit(1);
});
