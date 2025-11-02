import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { APIContext } from 'astro';
import { requireAdmin } from '@/lib/auth-helpers';
import type { D1Database } from '@cloudflare/workers-types';

// Cloudflare GraphQL endpoint
const CF_GQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

export const GET = withAuthApiMiddleware(async (context: APIContext) => {
  const runtimeEnv = ((context.locals as unknown as { runtime?: { env?: Record<string, unknown> } })
    ?.runtime?.env || {}) as Record<string, unknown>;
  const db = (runtimeEnv as { DB?: unknown }).DB as unknown;
  // Admin guard
  try {
    await requireAdmin({
      req: { header: (n: string) => context.request.headers.get(n) || undefined },
      request: context.request,
      env: { DB: db as D1Database },
    });
  } catch {
    return createApiError('forbidden', 'Insufficient permissions');
  }

  const env = runtimeEnv as Record<string, string>;
  const apiToken = env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || '';
  const zoneId = env.CLOUDFLARE_ZONE_ID || env.CF_ZONE_ID || '';
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || '';

  if (!apiToken || (!zoneId && !accountId)) {
    return createApiError('validation_error', 'Missing Cloudflare credentials', {
      missing: {
        CLOUDFLARE_API_TOKEN: !apiToken,
        ZONE_OR_ACCOUNT_ID: !(zoneId || accountId),
      },
    });
  }

  // Compute last 24h window in ISO strings
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const datetimeStart = start.toISOString();
  const datetimeEnd = end.toISOString();

  const url = new URL(context.request.url);
  const wantSeries =
    url.searchParams.get('series') === '1' || url.searchParams.get('series') === 'true';

  // Prefer zone-scoped query; fallback to account-scoped if no zoneId
  const queryZone = `
    query Traffic24h($zoneTag: String!, $start: Time!, $end: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          browserInsightsAdaptiveGroups(
            limit: 1,
            filter: { datetime_geq: $start, datetime_lt: $end }
          ) {
            sum { visits, pageViews }
          }
        }
      }
    }
  `;

  const queryAccount = `
    query Traffic24hAccount($accountTag: String!, $start: Time!, $end: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          browserInsightsAdaptiveGroups(
            limit: 1,
            filter: { datetime_geq: $start, datetime_lt: $end }
          ) {
            sum { visits, pageViews }
          }
        }
      }
    }
  `;

  const body = zoneId
    ? { query: queryZone, variables: { zoneTag: zoneId, start: datetimeStart, end: datetimeEnd } }
    : {
        query: queryAccount,
        variables: { accountTag: accountId, start: datetimeStart, end: datetimeEnd },
      };

  try {
    const resp = await fetch(CF_GQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(body),
    });

    type CFSum = { visits?: number; pageViews?: number; requests?: number };
    type CFBIGroup = { dimensions?: { datetime?: string; datetimeHour?: string }; sum?: CFSum };
    type CFZoneResp = {
      viewer?: {
        zones?: Array<{
          browserInsightsAdaptiveGroups?: CFBIGroup[];
          httpRequestsAdaptiveGroups?: CFBIGroup[];
        }>;
      };
    };
    type CFAccountResp = {
      viewer?: { accounts?: Array<{ browserInsightsAdaptiveGroups?: CFBIGroup[] }> };
    };

    const json = (await resp.json()) as {
      errors?: Array<{ message?: string }>;
      data?: unknown;
    };

    if (!resp.ok || json.errors) {
      const message =
        json?.errors
          ?.map((e) => e.message)
          .filter(Boolean)
          .join('; ') || 'Cloudflare GraphQL error';
      return createApiError('server_error', message);
    }

    // Extract sums depending on scope
    const dataRoot = json.data as CFZoneResp & CFAccountResp;
    const groups = zoneId
      ? dataRoot?.viewer?.zones?.[0]?.browserInsightsAdaptiveGroups
      : dataRoot?.viewer?.accounts?.[0]?.browserInsightsAdaptiveGroups;

    const sum =
      Array.isArray(groups) && groups.length > 0 && groups[0]?.sum
        ? groups[0].sum
        : { visits: 0, pageViews: 0 };

    const pageViews = Number(sum.pageViews || 0);
    const visits = Number(sum.visits || 0);

    // Optionally fetch a 24-point series for sparkline
    let series: Array<{ t: string; pageViews?: number; visits?: number }> | undefined;
    if (wantSeries) {
      // Primary attempt: Browser Insights timeseries (grouped by datetime)
      const seriesQueryBI = zoneId
        ? `
        query TrafficSeriesBI($zoneTag: String!, $start: Time!, $end: Time!) {
          viewer { zones(filter: { zoneTag: $zoneTag }) {
            browserInsightsAdaptiveGroups(
              limit: 24,
              orderBy: [datetime_ASC],
              filter: { datetime_geq: $start, datetime_lt: $end }
            ) {
              dimensions { datetime }
              sum { visits, pageViews }
            }
          } }
        }
      `
        : `
        query TrafficSeriesBIAccount($accountTag: String!, $start: Time!, $end: Time!) {
          viewer { accounts(filter: { accountTag: $accountTag }) {
            browserInsightsAdaptiveGroups(
              limit: 24,
              orderBy: [datetime_ASC],
              filter: { datetime_geq: $start, datetime_lt: $end }
            ) {
              dimensions { datetime }
              sum { visits, pageViews }
            }
          } }
        }
      `;

      const seriesBodyBI = zoneId
        ? {
            query: seriesQueryBI,
            variables: { zoneTag: zoneId, start: datetimeStart, end: datetimeEnd },
          }
        : {
            query: seriesQueryBI,
            variables: { accountTag: accountId, start: datetimeStart, end: datetimeEnd },
          };

      async function tryFetch(bodyObj: unknown) {
        const r = await fetch(CF_GQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify(bodyObj),
        });
        const j = (await r.json()) as { errors?: Array<{ message?: string }>; data?: unknown };
        return { ok: r.ok && !j.errors, j };
      }

      const bi = await tryFetch(seriesBodyBI);
      if (bi.ok) {
        const dataBI = bi.j.data as CFZoneResp & CFAccountResp;
        const groupsBI = zoneId
          ? dataBI?.viewer?.zones?.[0]?.browserInsightsAdaptiveGroups
          : dataBI?.viewer?.accounts?.[0]?.browserInsightsAdaptiveGroups;
        if (Array.isArray(groupsBI)) {
          series = groupsBI.map((g: CFBIGroup) => ({
            t: g?.dimensions?.datetime || '',
            pageViews: Number(g?.sum?.pageViews || 0),
            visits: Number(g?.sum?.visits || 0),
          }));
        }
      }

      // Fallback: Zone Requests by hour (httpRequestsAdaptiveGroups)
      if ((!series || series.length === 0) && zoneId) {
        const seriesQueryReq = `
          query TrafficSeriesReq($zoneTag: String!, $start: Time!, $end: Time!) {
            viewer { zones(filter: { zoneTag: $zoneTag }) {
              httpRequestsAdaptiveGroups(
                limit: 24,
                orderBy: [datetimeHour_ASC],
                filter: { datetimeHour_geq: $start, datetimeHour_lt: $end }
              ) {
                dimensions { datetimeHour }
                sum { requests }
              }
            } }
          }
        `;
        const reqBody = {
          query: seriesQueryReq,
          variables: { zoneTag: zoneId, start: datetimeStart, end: datetimeEnd },
        };
        const rq = await tryFetch(reqBody);
        if (rq.ok) {
          const dataReq = rq.j.data as CFZoneResp;
          const groupsReq = dataReq?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
          series = groupsReq.map((g: CFBIGroup) => ({
            t: g?.dimensions?.datetimeHour || '',
            pageViews: Number(g?.sum?.requests || 0), // approximate
          }));
        }
      }
    }

    return createApiSuccess({ pageViews, visits, from: datetimeStart, to: datetimeEnd, series });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return createApiError('server_error', msg);
  }
});

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
