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
  GITHUB_TOKEN?: string;
  INTERNAL_HEALTH_TOKEN?: string;
  E2E_PROD_AUTH_SMOKE?: string;
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

async function runPricingSmoke(env: Env) {
  const start = Date.now();
  const url = `${env.BASE_URL.replace(/\/$/, '')}/en/pricing`;
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
  const payload = { kind: 'pricing-smoke', ok, status, ms, url, sample, at: nowIso() };
  const key = `maintenance/pricing/${dateKey()}/${Date.now()}.json`;
  await putJsonR2(env, key, payload);
  await putStatusKV(env, 'pricing:last', { ok, status, ms, at: payload.at });
}

async function runProdAuthHealth(env: Env) {
  const gate = String(env.E2E_PROD_AUTH_SMOKE || '').toLowerCase();
  if (!(gate === '1' || gate === 'true')) return;
  const start = Date.now();
  const url = `${env.BASE_URL.replace(/\/$/, '')}/api/health/auth`;
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
  const payload = { kind: 'prod-auth-health', ok, status, ms, url, data, at: nowIso() };
  const key = `maintenance/prod-auth/${dateKey()}/${Date.now()}.json`;
  await putJsonR2(env, key, payload);
  await putStatusKV(env, 'prod-auth:last', { ok, status, ms, at: payload.at });
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
      try {
        if (target === 'pricing') {
          await runPricingSmoke(env);
          return new Response(JSON.stringify({ ok: true, ran: 'pricing' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (target === 'auth') {
          await runProdAuthHealth(env);
          return new Response(JSON.stringify({ ok: true, ran: 'auth' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (target === 'docs') {
          await runDocsInventory(env);
          return new Response(JSON.stringify({ ok: true, ran: 'docs' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (target === 'status') {
          const [pricing, auth, docs] = await Promise.all([
            env.KV_CRON_STATUS.get('pricing:last').catch(() => null),
            env.KV_CRON_STATUS.get('prod-auth:last').catch(() => null),
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
      ctx.waitUntil(runPricingSmoke(env));
    } else if (event.cron === '0 4 * * *') {
      ctx.waitUntil(runProdAuthHealth(env));
    } else if (event.cron === '0 5 * * 1') {
      ctx.waitUntil(runDocsInventory(env));
    } else {
      // Fallback for per-env overrides (e.g., testing with "* * * * *")
      ctx.waitUntil(runPricingSmoke(env));
    }
  },
};
