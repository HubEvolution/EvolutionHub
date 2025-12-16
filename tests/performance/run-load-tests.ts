#!/usr/bin/env tsx
import { loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';
import { safeParseJson } from '../shared/http';

// Lade Umgebungsvariablen
Object.assign(process.env, loadEnv(process.env.NODE_ENV || 'test', process.cwd(), ''));

// Pfade für Testumgebung
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lade Load-Test-Konfiguration
const configPath = join(__dirname, 'load-test-config.json');

type LoadTestConfig = {
  testEnvironments: Record<string, { baseUrl: string }>;
  rateLimitTests: Record<
    string,
    {
      endpoint: string;
      method: 'GET' | 'POST';
      requiresAuth?: boolean;
      requiresCsrf?: boolean;
      contentType?: string;
      body?: Record<string, unknown>;
      testScenarios: Array<{
        name: string;
        requestsPerSecond: number;
        duration: number;
        expectedRateLimited: number;
      }>;
    }
  >;
  stressTests: {
    burstTraffic: {
      requestsPerEndpoint: number;
      parallelEndpoints: string[];
    };
  };
  performanceThresholds: {
    maxAverageResponseTime: number;
    minRequestsPerSecond: number;
  };
};

const configText = readFileSync(configPath, 'utf-8');
const config = safeParseJson<LoadTestConfig>(configText);
if (!config) {
  throw new Error('Invalid load-test-config.json');
}
const loadTestConfig: LoadTestConfig = config;

// Kommandozeilenargumente
const args = process.argv.slice(2);
const testType = args[0] || 'rate-limit'; // 'rate-limit', 'stress', 'benchmark'
const environment = args[1] || 'development';
const endpoint = args[2]; // Optional: spezifischer Endpunkt

// Interface für Test-Ergebnisse
interface LoadTestResult {
  testName: string;
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  rejectedRequests: number;
  statusBuckets: Record<string, number>;
  statusCodes: Record<string, number>;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  requestsPerSecond: number;
  totalDuration: number;
  timestamp: string;
  success: boolean;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

function addCount(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

function formatTopStatusCodes(statusCodes: Record<string, number>, limit = 5): string {
  const entries = Object.entries(statusCodes)
    .filter(([code, count]) => Boolean(code) && count > 0)
    .sort((a, b) => b[1] - a[1]);

  const top = entries.slice(0, limit);
  if (top.length === 0) return '{}';
  return `{ ${top.map(([code, count]) => `${code}: ${count}`).join(', ')} }`;
}

function bucketForStatus(status: number): string {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500 && status < 600) return '5xx';
  return 'other';
}

type AuthContext = {
  cookieHeader: string;
  csrfToken: string;
};

type ApiJson = {
  success?: boolean;
  data?: unknown;
  error?: { type?: string; message?: string; details?: unknown };
};

function getErrorSummaryFromJson(json: ApiJson | null): string | null {
  if (!json?.error) return null;
  const type = json.error.type;
  const message = json.error.message;
  const parts = [type, message].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  );
  return parts.length > 0 ? parts.join(': ') : null;
}

async function diagnoseOneRequest(
  baseUrl: string,
  apiConfig: LoadTestConfig['rateLimitTests'][string],
  auth: AuthContext | null
): Promise<string | null> {
  try {
    const plan = buildRequest(baseUrl, apiConfig, 0, auth);
    const res = await fetch(plan.url, plan.init);
    const text = await res.text().catch(() => '');
    const json = text ? safeParseJson<ApiJson>(text) : null;
    const summary = getErrorSummaryFromJson(json);
    return summary ? `${res.status} ${summary}` : String(res.status);
  } catch {
    return null;
  }
}

function getInternalHealthToken(env: string): string {
  const provided = process.env.INTERNAL_HEALTH_TOKEN;
  if (provided && provided.trim()) return provided.trim();
  if (env === 'development' || env === 'testing') return 'ci-internal-health-token';
  return '';
}

function parseMintResponseData(data: unknown): { userId: string; csrfToken: string } | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const rec = data as Record<string, unknown>;
  const userId = rec.userId;
  const csrfToken = rec.csrfToken;
  if (typeof userId !== 'string' || typeof csrfToken !== 'string') return null;
  return { userId, csrfToken };
}

function extractCookieValue(setCookieHeader: string, name: string): string | null {
  const re = new RegExp(`(?:^|,)\\s*${name}=([^;]+)`, 'i');
  const match = setCookieHeader.match(re);
  return match?.[1] ? match[1] : null;
}

async function mintPerfSession(baseUrl: string, envName: string): Promise<AuthContext> {
  const token = getInternalHealthToken(envName);
  if (!token) {
    throw new Error('Missing INTERNAL_HEALTH_TOKEN for perf mint-session');
  }

  const res = await fetch(`${baseUrl}/api/perf/mint-session`, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Origin: baseUrl,
      'X-Internal-Health': token,
    },
  });

  const text = res.status !== 302 ? await res.text().catch(() => '') : '';
  const json = text ? safeParseJson<ApiJson>(text) : null;
  if (!res.ok || !json?.success) {
    throw new Error(
      `Perf session mint failed: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`
    );
  }
  const parsed = parseMintResponseData(json.data);
  if (!parsed) {
    throw new Error('Perf session mint response missing csrfToken');
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const sessionId = extractCookieValue(setCookie, 'session_id');
  const csrfCookie = extractCookieValue(setCookie, 'csrf_token');
  const hostSession = extractCookieValue(setCookie, '__Host-session');

  const parts: string[] = [];
  if (csrfCookie) parts.push(`csrf_token=${csrfCookie}`);
  else parts.push(`csrf_token=${encodeURIComponent(parsed.csrfToken)}`);
  if (sessionId) parts.push(`session_id=${sessionId}`);
  if (hostSession) parts.push(`__Host-session=${hostSession}`);

  return { cookieHeader: parts.join('; '), csrfToken: parsed.csrfToken };
}

function withUniqueEmail(body: Record<string, unknown> | undefined, index: number): Record<string, unknown> | undefined {
  if (!body) return body;
  const email = body.email;
  if (typeof email !== 'string') return body;
  const at = email.indexOf('@');
  if (at <= 0) return body;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return body;
  const base = local.split('+')[0];
  return { ...body, email: `${base}+${index}@${domain}` };
}

type RequestPlan = {
  url: string;
  init: RequestInit;
};

function buildRequest(
  baseUrl: string,
  apiConfig: LoadTestConfig['rateLimitTests'][string],
  index: number,
  auth: AuthContext | null
): RequestPlan {
  const headers = new Headers();
  headers.set('Origin', baseUrl);

  const requiresAuth = apiConfig.requiresAuth === true;
  const requiresCsrf = apiConfig.requiresCsrf === true;
  const cookieParts: string[] = [];
  if (requiresAuth) {
    if (!auth) {
      throw new Error(`Missing auth context for ${apiConfig.endpoint}`);
    }
    cookieParts.push(auth.cookieHeader);
  }
  if (requiresCsrf) {
    if (!auth) {
      throw new Error(`Missing auth context for CSRF on ${apiConfig.endpoint}`);
    }
    headers.set('X-CSRF-Token', auth.csrfToken);
    if (!cookieParts.some((p) => p.includes('csrf_token='))) {
      cookieParts.push(`csrf_token=${encodeURIComponent(auth.csrfToken)}`);
    }
  }
  if (cookieParts.length > 0) {
    headers.set('Cookie', cookieParts.join('; '));
  }

  const url = `${baseUrl}${apiConfig.endpoint}`;
  if (apiConfig.method === 'GET') {
    return { url, init: { method: 'GET', headers } };
  }

  const contentType = apiConfig.contentType || 'application/json';
  headers.set('Content-Type', contentType);

  const bodyObj = withUniqueEmail(apiConfig.body, index);
  const body = contentType.includes('application/json')
    ? JSON.stringify(bodyObj || {})
    : JSON.stringify(bodyObj || {});

  return {
    url,
    init: {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
    },
  };
}

async function makePacedRequests(
  endpoint: string,
  count: number,
  requestsPerSecond: number,
  requestFn: (index: number) => Promise<Response>
): Promise<LoadTestResult> {
  const startTime = Date.now();
  const timings: number[] = [];
  const statusBuckets: Record<string, number> = {};
  const statusCodes: Record<string, number> = {};
  let rejectedRequests = 0;
  let rateLimitedRequests = 0;
  let successfulRequests = 0;

  const maxConcurrency = Math.min(100, Math.max(10, Math.ceil(requestsPerSecond * 2)));
  const inFlight = new Set<Promise<void>>();

  for (let i = 0; i < count; i++) {
    const scheduledAt = startTime + Math.floor((i * 1000) / Math.max(1, requestsPerSecond));
    const delay = scheduledAt - Date.now();
    if (delay > 0) {
      await sleep(delay);
    }

    const p = (async () => {
      const t0 = Date.now();
      try {
        const res = await requestFn(i);
        const t1 = Date.now();
        const dur = t1 - t0;
        timings.push(dur);
        addCount(statusCodes, String(res.status));
        addCount(statusBuckets, bucketForStatus(res.status));
        if (res.status === 429) rateLimitedRequests += 1;
        if (res.status >= 200 && res.status < 300) successfulRequests += 1;
      } catch {
        rejectedRequests += 1;
      }
    })();
    inFlight.add(p);
    void p.finally(() => inFlight.delete(p));

    if (inFlight.size >= maxConcurrency) {
      await Promise.race(inFlight);
    }
  }

  await Promise.allSettled(Array.from(inFlight));

  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  const avgResponseTime =
    timings.length > 0 ? timings.reduce((sum, t) => sum + t, 0) / timings.length : 0;
  const minResponseTime = timings.length > 0 ? Math.min(...timings) : 0;
  const maxResponseTime = timings.length > 0 ? Math.max(...timings) : 0;
  const p95ResponseTime = percentile(timings, 0.95);
  const actualRps = totalDuration > 0 ? (count / totalDuration) * 1000 : 0;

  const hasSevereErrors = rejectedRequests > 0 || (statusBuckets['5xx'] || 0) > 0;
  const success = !hasSevereErrors;

  return {
    testName: `Paced_${count}_requests`,
    endpoint,
    totalRequests: count,
    successfulRequests,
    rateLimitedRequests,
    rejectedRequests,
    statusBuckets,
    statusCodes,
    averageResponseTime: avgResponseTime,
    minResponseTime,
    maxResponseTime,
    p95ResponseTime,
    requestsPerSecond: actualRps,
    totalDuration,
    timestamp: new Date().toISOString(),
    success,
  };
}

// Hauptfunktion für Rate-Limit-Tests
async function runRateLimitTests() {
  console.log('🚀 Starte Rate-Limiting-Performance-Tests...\n');

  const results: LoadTestResult[] = [];
  const envConfig = loadTestConfig.testEnvironments[environment];
  const baseUrl = envConfig.baseUrl;
  let authContext: AuthContext | null = null;

  async function getAuthContext(): Promise<AuthContext> {
    if (authContext) return authContext;
    authContext = await mintPerfSession(baseUrl, environment);
    return authContext;
  }

  for (const apiName of Object.keys(loadTestConfig.rateLimitTests)) {
    if (endpoint && !apiName.includes(endpoint)) continue;
    const apiConfig = loadTestConfig.rateLimitTests[apiName];

    console.log(`📊 Teste ${apiName} Rate-Limiting...`);

    for (const scenario of apiConfig.testScenarios) {
      console.log(
        `  └─ ${scenario.name}: ${scenario.requestsPerSecond} RPS für ${scenario.duration}s`
      );

      const needsAuth = apiConfig.requiresAuth === true || apiConfig.requiresCsrf === true;
      const auth = needsAuth ? await getAuthContext() : null;

      const totalRequests = scenario.requestsPerSecond * scenario.duration;
      const result = await makePacedRequests(
        apiConfig.endpoint,
        totalRequests,
        scenario.requestsPerSecond,
        async (index) => {
          const plan = buildRequest(baseUrl, apiConfig, index, auth);
          return fetch(plan.url, plan.init);
        }
      );

      results.push(result);

      // Prüfe Erwartungen
      const expectedRateLimited = Math.round(
        (scenario.expectedRateLimited / 100) * result.totalRequests
      );

      const ok2xx = result.successfulRequests;
      const shouldCheckRateLimit = ok2xx > 0;
      if (shouldCheckRateLimit && result.rateLimitedRequests >= expectedRateLimited * 0.8) {
        console.log(
          `    ✅ Rate-Limiting funktioniert korrekt (${result.rateLimitedRequests}/${result.totalRequests} Rate-Limited)`
        );
      } else if (shouldCheckRateLimit) {
        console.log(
          `    ⚠️  Rate-Limiting könnte zu permissiv sein (${result.rateLimitedRequests}/${result.totalRequests} Rate-Limited, erwartet: ${expectedRateLimited})`
        );
        console.log(`    🔎 Statuscodes (Top): ${formatTopStatusCodes(result.statusCodes)}`);
        result.success = false;
      } else {
        const rateLimited = result.rateLimitedRequests;
        const ratio = result.totalRequests > 0 ? rateLimited / result.totalRequests : 0;
        if (rateLimited > 0 && ratio >= 0.95) {
          console.log(
            `    ✅ Komplett rate-limited (2xx=0, 429≈100%). Limiter greift korrekt (${rateLimited}/${result.totalRequests})`
          );
          console.log(`    🔎 Statuscodes (Top): ${formatTopStatusCodes(result.statusCodes)}`);
        } else {
          console.log(
            `    ❌ Keine erfolgreichen Requests (2xx=0). Buckets: ${JSON.stringify(
              result.statusBuckets
            )}`
          );
          console.log(`    🔎 Statuscodes (Top): ${formatTopStatusCodes(result.statusCodes)}`);

          const diag = await diagnoseOneRequest(baseUrl, apiConfig, auth);
          if (diag) {
            console.log(`    🩺 Diagnose: ${diag}`);
          }

          result.success = false;
        }
      }

      console.log(
        `    📈 Performance: ${result.averageResponseTime.toFixed(2)}ms avg (p95 ${result.p95ResponseTime.toFixed(0)}ms), ${result.requestsPerSecond.toFixed(2)} RPS\n`
      );
    }
  }

  return results;
}

// Hauptfunktion für Stress-Tests
async function runStressTests() {
  console.log('🔥 Starte Stress-Tests...\n');

  const results: LoadTestResult[] = [];
  const envConfig = loadTestConfig.testEnvironments[environment];
  const baseUrl = envConfig.baseUrl;
  let authContext: AuthContext | null = null;

  async function getAuthContext(): Promise<AuthContext> {
    if (authContext) return authContext;
    authContext = await mintPerfSession(baseUrl, environment);
    return authContext;
  }

  const byEndpoint = new Map<string, LoadTestConfig['rateLimitTests'][string]>();
  for (const key of Object.keys(loadTestConfig.rateLimitTests)) {
    const entry = loadTestConfig.rateLimitTests[key];
    byEndpoint.set(entry.endpoint, entry);
  }

  if (endpoint === 'burst' || !endpoint) {
    console.log('💥 Teste Burst-Traffic...');

    const endpoints = loadTestConfig.stressTests.burstTraffic.parallelEndpoints;
    const totalRequests =
      loadTestConfig.stressTests.burstTraffic.requestsPerEndpoint * endpoints.length;
    const burstResult = await makePacedRequests(
      'burst-traffic',
      totalRequests,
      Math.max(1, Math.floor(totalRequests / 10)),
      async (index) => {
        const endpointIndex = index % endpoints.length;
        const testEndpoint = endpoints[endpointIndex];
        const cfg = byEndpoint.get(testEndpoint);
        if (cfg) {
          const needsAuth = cfg.requiresAuth === true || cfg.requiresCsrf === true;
          const auth = needsAuth ? await getAuthContext() : null;
          const plan = buildRequest(baseUrl, cfg, index, auth);
          return fetch(plan.url, plan.init);
        }
        return fetch(`${baseUrl}${testEndpoint}`, {
          method: 'GET',
          headers: { Origin: baseUrl },
        });
      }
    );

    results.push(burstResult);
    console.log(
      `💥 Burst-Traffic: ${burstResult.requestsPerSecond.toFixed(2)} RPS, ${burstResult.rateLimitedRequests} Rate-Limited\n`
    );
  }

  return results;
}

// Hauptfunktion für Benchmarks
async function runBenchmarks() {
  console.log('📊 Starte Performance-Benchmarks...\n');

  const results: LoadTestResult[] = [];
  const envConfig = loadTestConfig.testEnvironments[environment];
  const baseUrl = envConfig.baseUrl;

  const benchmarkKeys = ['promptEnhance', 'newsletter', 'leadMagnet'] as const;
  const benchmarkEndpoints = benchmarkKeys
    .map((k) => loadTestConfig.rateLimitTests[k])
    .filter(Boolean);

  if (benchmarkEndpoints.length === 0) {
    throw new Error('No benchmark endpoints configured');
  }

  const benchmarkResult = await makePacedRequests(
    'benchmark-suite',
    100,
    25,
    async (index) => {
      const cfg = benchmarkEndpoints[index % benchmarkEndpoints.length];
      const plan = buildRequest(baseUrl, cfg, index, null);
      return fetch(plan.url, plan.init);
    }
  );

  results.push(benchmarkResult);

  console.log(`📊 Benchmark-Ergebnisse:`);
  console.log(
    `  Durchschnittliche Antwortzeit: ${benchmarkResult.averageResponseTime.toFixed(2)}ms`
  );
  console.log(`  p95 Antwortzeit: ${benchmarkResult.p95ResponseTime.toFixed(0)}ms`);
  console.log(`  Requests pro Sekunde: ${benchmarkResult.requestsPerSecond.toFixed(2)}`);
  console.log(
    `  Rate-Limited: ${benchmarkResult.rateLimitedRequests}/${benchmarkResult.totalRequests}`
  );

  // Prüfe Performance-Thresholds
  const thresholds = loadTestConfig.performanceThresholds;
  const performanceOk =
    benchmarkResult.averageResponseTime <= thresholds.maxAverageResponseTime &&
    benchmarkResult.requestsPerSecond >= thresholds.minRequestsPerSecond;

  if (performanceOk) {
    console.log(`✅ Performance-Thresholds erfüllt`);
  } else {
    console.log(`❌ Performance-Thresholds nicht erfüllt`);
  }

  return results;
}

// Testergebnisse speichern
function saveResults(results: LoadTestResult[], testType: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `load-test-results-${testType}-${environment}-${timestamp}.json`;

  const report = {
    testType,
    environment,
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.length,
      averageResponseTime:
        results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length,
      averageRequestsPerSecond:
        results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / results.length,
      totalRateLimitedRequests: results.reduce((sum, r) => sum + r.rateLimitedRequests, 0),
      totalRejectedRequests: results.reduce((sum, r) => sum + r.rejectedRequests, 0),
    },
    results,
  };

  console.log(`💾 Ergebnisse gespeichert in: ${filename}`);
  console.log(`📊 Zusammenfassung:`);
  console.log(`  Tests: ${report.summary.totalTests}`);
  console.log(`  Ø Antwortzeit: ${report.summary.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Ø RPS: ${report.summary.averageRequestsPerSecond.toFixed(2)}`);
  console.log(`  Rate-Limited: ${report.summary.totalRateLimitedRequests}`);
  console.log(`  Rejected: ${report.summary.totalRejectedRequests}`);

  return report;
}

// Hauptprogramm
async function main() {
  console.log(`🧪 Starte Load-Tests: ${testType} auf ${environment}\n`);

  try {
    let results: LoadTestResult[] = [];

    switch (testType) {
      case 'rate-limit':
        results = await runRateLimitTests();
        break;
      case 'stress':
        results = await runStressTests();
        break;
      case 'benchmark':
        results = await runBenchmarks();
        break;
      default:
        console.error(`❌ Unbekannter Test-Typ: ${testType}`);
        console.log('Verfügbare Typen: rate-limit, stress, benchmark');
        process.exit(1);
    }

    const report = saveResults(results, testType);
    void report;

    // Prüfe ob alle Tests erfolgreich waren
    const allSuccessful = results.every((r) => r.success);
    if (allSuccessful) {
      console.log(`✅ Alle Load-Tests erfolgreich`);
      process.exit(0);
    } else {
      console.log(`❌ Einige Load-Tests fehlgeschlagen`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fehler bei Load-Tests:', error);
    process.exit(1);
  }
}

// Script als Modul oder direkt ausführbar
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runRateLimitTests, runStressTests, runBenchmarks };
