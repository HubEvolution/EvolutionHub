import {
  withAuthApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { APIContext } from 'astro';
import type { AdminBindings } from '@/lib/types/admin';

const CF_GQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const CF_ANALYTICS_QUERY = `
  query Traffic30d($accountTag: String!, $start: Time!, $end: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        httpRequestsAdaptiveGroups(
          limit: 30,
          orderBy: [datetime_ASC],
          filter: { datetime_geq: $start, datetime_lt: $end }
        ) {
          dimensions { datetime }
          sum { requests, visits }
        }
      }
    }
  }
`;

interface StripeReportResponse {
  total_volume?: number;
  mrr?: number;
  arr?: number;
}

interface CachedMetrics {
  payload: unknown;
  expiresAt: number;
}

const CACHE_KEY = 'admin:metrics:v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

function getEnvString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function getCachedMetrics(kv: KVNamespace | undefined): Promise<CachedMetrics | null> {
  if (!kv) return null;
  try {
    const raw = await kv.get(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMetrics;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function setCachedMetrics(
  kv: KVNamespace | undefined,
  payload: unknown,
  ttlMs: number
): Promise<void> {
  if (!kv) return;
  try {
    const record: CachedMetrics = {
      payload,
      expiresAt: Date.now() + ttlMs,
    };
    await kv.put(CACHE_KEY, JSON.stringify(record), {
      expirationTtl: Math.ceil(ttlMs / 1000),
    });
  } catch {
    // Ignore cache write issues
  }
}

async function fetchStripeMetrics(
  env: Record<string, unknown>
): Promise<StripeReportResponse | null> {
  const stripeSecret = getEnvString(env.STRIPE_SECRET);
  if (!stripeSecret) return null;

  try {
    const stripeModule = await import('stripe');
    const stripe = new stripeModule.default(stripeSecret, { apiVersion: '2023-10-16' });
    const reportRun = await stripe.reporting.reportRuns.create({
      report_type: 'balance.summary.1',
      parameters: {
        interval_start: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
        interval_end: Math.floor(Date.now() / 1000),
      },
    });

    const result = await stripe.reporting.reportRuns.retrieve(reportRun.id);
    const totals = (result.result as unknown as { totals?: Array<{ amount: number }> })?.totals;
    const totalVolume = Array.isArray(totals)
      ? totals.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      : null;

    return {
      total_volume: totalVolume
        ? Math.round((totalVolume / 100 + Number.EPSILON) * 100) / 100
        : undefined,
      mrr: undefined,
      arr: undefined,
    };
  } catch (err) {
    console.error(
      '[admin_metrics] stripe_reporting_failed',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function fetchCloudflareTraffic(
  env: Record<string, unknown>
): Promise<{ series: Array<{ day: string; requests: number; visits: number }> } | null> {
  const apiToken = getEnvString(env.CLOUDFLARE_API_TOKEN) || getEnvString(env.CF_API_TOKEN);
  const accountId = getEnvString(env.CLOUDFLARE_ACCOUNT_ID) || getEnvString(env.CF_ACCOUNT_ID);
  if (!apiToken || !accountId) return null;

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  try {
    const resp = await fetch(CF_GQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        query: CF_ANALYTICS_QUERY,
        variables: {
          accountTag: accountId,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      data?: {
        viewer?: {
          accounts?: Array<{
            httpRequestsAdaptiveGroups?: Array<{
              dimensions?: { datetime?: string };
              sum?: { requests?: number; visits?: number };
            }>;
          }>;
        };
      };
    };
    const groups =
      json.data?.viewer?.accounts?.[0]?.httpRequestsAdaptiveGroups?.map((group) => ({
        day: group.dimensions?.datetime ?? '',
        requests: Number(group.sum?.requests ?? 0),
        visits: Number(group.sum?.visits ?? 0),
      })) ?? [];

    return { series: groups };
  } catch (err) {
    console.error(
      '[admin_metrics] cloudflare_fetch_failed',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = getAdminEnv(context);
    const db = env.DB as D1Database | undefined;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }
    const database = db;

    try {
      await requireAdmin({ request: context.request, env: { DB: database } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const kv = env.KV_ADMIN_DASHBOARD;
    const cached = await getCachedMetrics(kv);
    if (cached) {
      const payload = cached.payload as Record<string, unknown>;
      return createApiSuccess({
        ...(payload ?? {}),
        cacheHit: true,
        cacheTtlMs: Math.max(cached.expiresAt - Date.now(), 0),
      });
    }

    async function scalar<T = number>(sql: string, ...binds: unknown[]): Promise<T | null> {
      try {
        const row = await database
          .prepare(sql)
          .bind(...binds)
          .first<{ v: T }>();
        return row?.v ?? null;
      } catch (err) {
        console.error('[admin_metrics] scalar_failed', err instanceof Error ? err.message : err);
        return null;
      }
    }

    const [activeSessionsByIso, activeSessionsByEpoch, activeUsersByIso, activeUsersByEpoch] =
      await Promise.all([
        scalar<number>(
          `SELECT COUNT(*) as v FROM sessions WHERE datetime(expires_at) > datetime('now')`
        ),
        scalar<number>(
          `SELECT COUNT(*) as v FROM sessions WHERE CAST(expires_at AS INTEGER) > strftime('%s','now')`
        ),
        scalar<number>(
          `SELECT COUNT(DISTINCT user_id) as v FROM sessions WHERE datetime(expires_at) > datetime('now')`
        ),
        scalar<number>(
          `SELECT COUNT(DISTINCT user_id) as v FROM sessions WHERE CAST(expires_at AS INTEGER) > strftime('%s','now')`
        ),
      ]);

    const activeSessions = (activeSessionsByIso ?? 0) || (activeSessionsByEpoch ?? 0) || 0;
    const activeUsers = (activeUsersByIso ?? 0) || (activeUsersByEpoch ?? 0) || 0;
    const usersTotal = (await scalar<number>(`SELECT COUNT(*) as v FROM users`)) ?? 0;

    const [
      usersNew24hIso,
      usersNew24hEpoch,
      usersNew7dIso,
      usersNew7dEpoch,
      usersNew30dIso,
      usersNew30dEpoch,
    ] = await Promise.all([
      scalar<number>(
        `SELECT COUNT(*) as v FROM users WHERE datetime(created_at) >= datetime('now','-1 day')`
      ),
      scalar<number>(
        `SELECT COUNT(*) as v FROM users WHERE CAST(created_at AS INTEGER) >= strftime('%s','now','-1 day')`
      ),
      scalar<number>(
        `SELECT COUNT(*) as v FROM users WHERE datetime(created_at) >= datetime('now','-7 day')`
      ),
      scalar<number>(
        `SELECT COUNT(*) as v FROM users WHERE CAST(created_at AS INTEGER) >= strftime('%s','now','-7 day')`
      ),
      scalar<number>(
        `SELECT COUNT(*) as v FROM users WHERE datetime(created_at) >= datetime('now','-30 day')`
      ),
      scalar<number>(
        `SELECT COUNT(*) as v FROM users WHERE CAST(created_at AS INTEGER) >= strftime('%s','now','-30 day')`
      ),
    ]);

    const usersNew24h = (usersNew24hIso ?? 0) || (usersNew24hEpoch ?? 0) || 0;
    const usersNew7d = (usersNew7dIso ?? 0) || (usersNew7dEpoch ?? 0) || 0;
    const usersNew30d = (usersNew30dIso ?? 0) || (usersNew30dEpoch ?? 0) || 0;

    const [usersNew7dPrevIso, usersNew7dPrevEpoch, usersNew30dPrevIso, usersNew30dPrevEpoch] =
      await Promise.all([
        scalar<number>(
          `SELECT COUNT(*) as v FROM users WHERE datetime(created_at) >= datetime('now','-14 day') AND datetime(created_at) < datetime('now','-7 day')`
        ),
        scalar<number>(
          `SELECT COUNT(*) as v FROM users WHERE CAST(created_at AS INTEGER) >= strftime('%s','now','-14 day') AND CAST(created_at AS INTEGER) < strftime('%s','now','-7 day')`
        ),
        scalar<number>(
          `SELECT COUNT(*) as v FROM users WHERE datetime(created_at) >= datetime('now','-60 day') AND datetime(created_at) < datetime('now','-30 day')`
        ),
        scalar<number>(
          `SELECT COUNT(*) as v FROM users WHERE CAST(created_at AS INTEGER) >= strftime('%s','now','-60 day') AND CAST(created_at AS INTEGER) < strftime('%s','now','-30 day')`
        ),
      ]);

    const usersNew7dPrevious = (usersNew7dPrevIso ?? 0) || (usersNew7dPrevEpoch ?? 0) || 0;
    const usersNew30dPrevious = (usersNew30dPrevIso ?? 0) || (usersNew30dPrevEpoch ?? 0) || 0;

    const growthRate7d = usersNew7dPrevious
      ? (usersNew7d - usersNew7dPrevious) / usersNew7dPrevious
      : usersNew7d > 0
        ? 1
        : null;
    const growthRate30d = usersNew30dPrevious
      ? (usersNew30d - usersNew30dPrevious) / usersNew30dPrevious
      : usersNew30d > 0
        ? 1
        : null;

    const dailyNewUsersRaw = await database
      .prepare(
        `SELECT strftime('%Y-%m-%d', datetime(created_at)) as day, COUNT(*) as cnt
         FROM users
         WHERE datetime(created_at) >= datetime('now','-30 day')
         GROUP BY day
         ORDER BY day ASC`
      )
      .all<{ day: string; cnt: number }>();
    const dailyNewUsers = (dailyNewUsersRaw?.results ?? []).map((row) => ({
      day: row.day,
      count: Number(row.cnt || 0),
    }));

    const alerts: Array<{
      type: 'low_active_users' | 'no_new_users' | 'data_stale' | 'low_sessions';
      severity: 'info' | 'warning' | 'critical';
      message: string;
      sinceTs?: number;
    }> = [];
    if (activeUsers < 5) {
      alerts.push({
        type: 'low_active_users',
        severity: activeUsers === 0 ? 'critical' : 'warning',
        message: 'Sehr wenige aktive Nutzer in den letzten Stunden',
      });
    }
    if (usersNew24h === 0) {
      alerts.push({
        type: 'no_new_users',
        severity: 'warning',
        message: 'Keine neuen Nutzer in den letzten 24 Stunden',
      });
    }

    const runtimeEnv = (context.locals.runtime?.env ?? {}) as Record<string, unknown>;
    const [stripeMetrics, cfTraffic] = await Promise.all([
      fetchStripeMetrics(runtimeEnv),
      fetchCloudflareTraffic(runtimeEnv),
    ]);

    const payload = {
      activeSessions,
      activeUsers,
      usersTotal,
      usersNew24h,
      usersNew7d,
      usersNew30d,
      usersNew7dPrevious,
      usersNew30dPrevious,
      growthRate7d,
      growthRate30d,
      dailyNewUsers,
      alerts,
      stripe: stripeMetrics ?? undefined,
      traffic: cfTraffic?.series ?? undefined,
      ts: Date.now(),
    };

    await setCachedMetrics(kv, payload, CACHE_TTL_MS);

    return createApiSuccess({
      ...payload,
      cacheHit: false,
      cacheTtlMs: CACHE_TTL_MS,
    });
  },
  { rateLimiter: apiRateLimiter, logMetadata: { action: 'admin_metrics' } }
);

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
