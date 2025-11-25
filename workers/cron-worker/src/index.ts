type R2Bucket = { put: (key: string, value: BodyInit, options?: unknown) => Promise<unknown> };
type KVNamespace = {
  put: (key: string, value: string) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
};
interface ScheduledEvent {
  cron: string;
}
interface ExecutionContext {
  waitUntil: (p: Promise<unknown>) => void;
}

export interface Env {
  R2_MAINTENANCE: R2Bucket;
  KV_CRON_STATUS: KVNamespace;
  BASE_URL: string;
  BASE_URLS?: string;
  GITHUB_TOKEN?: string;
  INTERNAL_HEALTH_TOKEN?: string;
  E2E_PROD_AUTH_SMOKE?: string;
  HC_PRICING?: string;
  HC_AUTH?: string;
  HC_DOCS?: string;
  // Optional: Web-Eval executor gating & health
  WEB_EVAL_EXEC_ENABLE?: string;
  WEB_EVAL_EXEC_HOSTS?: string;
  WEB_EVAL_EXEC_MAX_RUNS_PER_TICK?: string;
  HC_WEB_EVAL?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function dateKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function putJsonR2(env: Env, key: string, data: unknown) {
  try {
    console.log('[cron-worker] R2 put start', key);
    await env.R2_MAINTENANCE.put(key, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    });
    console.log('[cron-worker] R2 put ok', key);
  } catch (e) {
    console.log('[cron-worker] R2 put error', key, String(e));
    throw e;
  }
}

async function putStatusKV(env: Env, key: string, data: unknown) {
  try {
    console.log('[cron-worker] KV put start', key);
    await env.KV_CRON_STATUS.put(key, JSON.stringify(data));
    console.log('[cron-worker] KV put ok', key);
  } catch (e) {
    console.log('[cron-worker] KV put error', key, String(e));
    throw e;
  }
}

async function hcPing(url?: string, suffix?: string) {
  if (!url) return;
  try {
    await fetch(url + (suffix || ''));
  } catch {}
}

function parseTargets(env: Env): Array<{ url: string; host: string }> {
  const list: string[] = (() => {
    const raw = env.BASE_URLS || '';
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter((v) => typeof v === 'string');
      } catch {}
    }
    const single = env.BASE_URL || '';
    return single ? [single] : [];
  })();
  return list
    .map((u) => {
      try {
        const url = u.replace(/\/$/, '');
        const host = new URL(url).host;
        return { url, host };
      } catch {
        return null;
      }
    })
    .filter((x): x is { url: string; host: string } => !!x);
}

async function runPricingSmokeFor(env: Env, baseUrl: string, host: string) {
  const start = Date.now();
  const url = `${baseUrl}/en/pricing`;
  let ok = false;
  let status = 0;
  let sample = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'evolution-hub-cron' } });
    status = res.status;
    ok = res.ok;
    const text = await res.text();
    sample = text.slice(0, 512);
  } catch (e) {
    ok = false;
    sample = String(e);
  }
  const ms = Date.now() - start;
  const payload = { kind: 'pricing-smoke', ok, status, ms, url, sample, at: nowIso(), host };
  const key = `maintenance/pricing/${host}/${dateKey()}/${Date.now()}.json`;
  await putJsonR2(env, key, payload);
  await putStatusKV(env, `pricing:last:${host}`, { ok, status, ms, at: payload.at });
}

async function runPricingSmokeAll(env: Env, onlyHost?: string) {
  const targets = parseTargets(env).filter((t) => (!onlyHost ? true : t.host === onlyHost));
  for (const t of targets) {
    await runPricingSmokeFor(env, t.url, t.host);
  }
}

async function runProdAuthHealthFor(env: Env, baseUrl: string, host: string) {
  const gate = String(env.E2E_PROD_AUTH_SMOKE || '').toLowerCase();
  if (!(gate === '1' || gate === 'true')) return;
  const start = Date.now();
  const url = `${baseUrl}/api/health/auth`;
  let ok = false;
  let status = 0;
  let data: unknown = null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'evolution-hub-cron',
        'X-Internal-Health': env.INTERNAL_HEALTH_TOKEN || '',
      },
    });
    status = res.status;
    const json = await res.json().catch(() => ({}));
    ok = res.ok && !!json && (json as any).success === true;
    data = json;
  } catch (e) {
    ok = false;
    data = { error: String(e) };
  }
  const ms = Date.now() - start;
  const payload = { kind: 'prod-auth-health', ok, status, ms, url, data, at: nowIso(), host };
  const key = `maintenance/prod-auth/${host}/${dateKey()}/${Date.now()}.json`;
  await putJsonR2(env, key, payload);
  await putStatusKV(env, `prod-auth:last:${host}`, { ok, status, ms, at: payload.at });
}

async function runProdAuthHealthAll(env: Env, onlyHost?: string) {
  const targets = parseTargets(env).filter((t) => (!onlyHost ? true : t.host === onlyHost));
  for (const t of targets) {
    await runProdAuthHealthFor(env, t.url, t.host);
  }
}

function isWebEvalExecEnabledFor(env: Env, host: string): boolean {
  const gate = String(env.WEB_EVAL_EXEC_ENABLE || '').toLowerCase();
  if (!(gate === '1' || gate === 'true')) return false;

  const rawHosts = env.WEB_EVAL_EXEC_HOSTS || '[]';
  let allowedHosts: string[] = [];
  try {
    const parsed = JSON.parse(rawHosts);
    if (Array.isArray(parsed)) {
      allowedHosts = parsed.filter((v) => typeof v === 'string');
    }
  } catch {
    // ignore JSON parse errors and treat as disabled
  }

  if (!allowedHosts.length) return false;
  return allowedHosts.includes(host);
}

function getWebEvalMaxRunsPerTick(env: Env): number {
  const raw = env.WEB_EVAL_EXEC_MAX_RUNS_PER_TICK || '';
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n > 0 && n <= 20) return n;
  return 3;
}

async function runWebEvalExecFor(env: Env, baseUrl: string, host: string) {
  if (!isWebEvalExecEnabledFor(env, host)) {
    return;
  }

  const maxRuns = getWebEvalMaxRunsPerTick(env);
  let runs = 0;
  let lastStatus = 0;
  let ok = true;
  let lastError: string | null = null;

  for (let i = 0; i < maxRuns; i++) {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/testing/evaluate/next/run`, {
        method: 'POST',
        headers: {
          'User-Agent': 'evolution-hub-cron',
          Origin: baseUrl,
          'x-internal-exec': '1',
        },
      });
    } catch (e) {
      ok = false;
      lastError = `fetch_error:${String(e)}`;
      break;
    }

    lastStatus = res.status;
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // tolerate empty/invalid JSON, will be handled below
    }

    if (res.status === 200) {
      runs += 1;
      if (!json || json.success !== true) {
        ok = false;
        lastError = 'unexpected_response';
        break;
      }
      const task = json.data && 'task' in json.data ? json.data.task : null;
      // Wenn keine weitere Task vorhanden ist, Queue leer → abbrechen
      if (!task) {
        break;
      }
      // Andernfalls nächste Iteration (bis maxRuns erreicht ist)
      continue;
    }

    if (res.status === 429) {
      ok = false;
      lastError = 'rate_limited';
      break;
    }

    if (res.status === 403) {
      ok = false;
      lastError = 'forbidden';
      break;
    }

    ok = false;
    lastError = `http_${res.status}`;
    break;
  }

  const payload = {
    kind: 'web-eval-exec',
    ok,
    runs,
    lastStatus,
    lastError,
    at: nowIso(),
    host,
  };
  try {
    await putStatusKV(env, `webeval:last:${host}`, payload);
  } catch {
    // Status-Logging darf den Executor nicht hart brechen
  }
}

async function runWebEvalExecAll(env: Env, onlyHost?: string) {
  const targets = parseTargets(env).filter((t) => (!onlyHost ? true : t.host === onlyHost));
  for (const t of targets) {
    await runWebEvalExecFor(env, t.url, t.host);
  }
}

async function runDocsInventory(env: Env) {
  const start = Date.now();
  const owner = 'HubEvolution';
  const repo = 'EvolutionHub';
  const api = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
  let ok = false;
  let status = 0;
  let count = 0;
  let files: Array<{ path: string; sha: string; type: string; size?: number }> = [];
  try {
    const res = await fetch(api, {
      headers: env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'User-Agent': 'evolution-hub-cron' }
        : { 'User-Agent': 'evolution-hub-cron' },
    });
    status = res.status;
    const json = await res.json();
    const tree = Array.isArray(json?.tree) ? json.tree : [];
    files = tree
      .filter((n: any) => typeof n?.path === 'string' && n.path.startsWith('docs/'))
      .map((n: any) => ({ path: n.path, sha: n.sha, type: n.type, size: n.size })) as any;
    count = files.length;
    ok = res.ok;
  } catch (e) {
    ok = false;
    files = [];
  }
  const ms = Date.now() - start;
  const registry = { generatedAt: nowIso(), ok, status, count, files };
  const day = dateKey();
  const base = `maintenance/docs-registry/${day}`;
  await putJsonR2(env, `${base}/registry.json`, registry);
  await putJsonR2(env, `maintenance/docs-registry/latest.json`, registry);
  await putStatusKV(env, 'docs-registry:last', { ok, status, count, ms, at: registry.generatedAt });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/__cron/run/')) {
      const token = request.headers.get('x-internal-health') || '';
      if (!env.INTERNAL_HEALTH_TOKEN || token !== env.INTERNAL_HEALTH_TOKEN) {
        return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const target = url.pathname.replace('/__cron/run/', '');
      const hostFilter = url.searchParams.get('host') || undefined;
      try {
        if (target === 'pricing') {
          await hcPing(env.HC_PRICING, '/start');
          try {
            if (hostFilter) {
              await runPricingSmokeAll(env, hostFilter);
            } else {
              await runPricingSmokeAll(env);
            }
            await hcPing(env.HC_PRICING);
          } catch (e) {
            await hcPing(env.HC_PRICING, '/fail');
            throw e;
          }
          return new Response(
            JSON.stringify({ ok: true, ran: 'pricing', host: hostFilter || 'all' }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (target === 'auth') {
          await hcPing(env.HC_AUTH, '/start');
          try {
            if (hostFilter) {
              await runProdAuthHealthAll(env, hostFilter);
            } else {
              await runProdAuthHealthAll(env);
            }
            await hcPing(env.HC_AUTH);
          } catch (e) {
            await hcPing(env.HC_AUTH, '/fail');
            throw e;
          }
          return new Response(
            JSON.stringify({ ok: true, ran: 'auth', host: hostFilter || 'all' }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (target === 'webeval') {
          await hcPing(env.HC_WEB_EVAL, '/start');
          try {
            if (hostFilter) {
              await runWebEvalExecAll(env, hostFilter);
            } else {
              await runWebEvalExecAll(env);
            }
            await hcPing(env.HC_WEB_EVAL);
          } catch (e) {
            await hcPing(env.HC_WEB_EVAL, '/fail');
            throw e;
          }
          return new Response(
            JSON.stringify({ ok: true, ran: 'webeval', host: hostFilter || 'all' }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (target === 'docs') {
          await hcPing(env.HC_DOCS, '/start');
          try {
            await runDocsInventory(env);
            await hcPing(env.HC_DOCS);
          } catch (e) {
            await hcPing(env.HC_DOCS, '/fail');
            throw e;
          }
          return new Response(JSON.stringify({ ok: true, ran: 'docs' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (target === 'status') {
          const [pricing, auth, docs] = await Promise.all([
            env.KV_CRON_STATUS.get('pricing:last:' + (hostFilter || '')).catch(() => null),
            env.KV_CRON_STATUS.get('prod-auth:last:' + (hostFilter || '')).catch(() => null),
            env.KV_CRON_STATUS.get('docs-registry:last').catch(() => null),
          ]);
          return new Response(
            JSON.stringify({
              ok: true,
              pricing: pricing || null,
              auth: auth || null,
              docs: docs || null,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ ok: false, error: 'unknown-task' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return new Response('ok');
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('[cron-worker] scheduled fired', event.cron, nowIso());
    if (event.cron === '0 2 * * *') {
      ctx.waitUntil(
        (async () => {
          await hcPing(env.HC_PRICING, '/start');
          try {
            await runPricingSmokeAll(env);
            await hcPing(env.HC_PRICING);
          } catch (e) {
            await hcPing(env.HC_PRICING, '/fail');
            throw e;
          }
        })()
      );
    } else if (event.cron === '0 4 * * *') {
      ctx.waitUntil(
        (async () => {
          await hcPing(env.HC_AUTH, '/start');
          try {
            await runProdAuthHealthAll(env);
            await hcPing(env.HC_AUTH);
          } catch (e) {
            await hcPing(env.HC_AUTH, '/fail');
            throw e;
          }
        })()
      );
    } else if (event.cron === '0 5 * * 1') {
      ctx.waitUntil(
        (async () => {
          await hcPing(env.HC_DOCS, '/start');
          try {
            await runDocsInventory(env);
            await hcPing(env.HC_DOCS);
          } catch (e) {
            await hcPing(env.HC_DOCS, '/fail');
            throw e;
          }
        })()
      );
    } else if (event.cron === '*/5 * * * *') {
      // Optional: Web-Eval Executor, über Env komplett deaktivierbar
      ctx.waitUntil(
        (async () => {
          await hcPing(env.HC_WEB_EVAL, '/start');
          try {
            await runWebEvalExecAll(env);
            await hcPing(env.HC_WEB_EVAL);
          } catch (e) {
            await hcPing(env.HC_WEB_EVAL, '/fail');
            throw e;
          }
        })()
      );
    } else {
      ctx.waitUntil(
        (async () => {
          await hcPing(env.HC_PRICING, '/start');
          try {
            await runPricingSmokeAll(env);
            await hcPing(env.HC_PRICING);
          } catch (e) {
            await hcPing(env.HC_PRICING, '/fail');
            throw e;
          }
        })()
      );
    }
  },
};
