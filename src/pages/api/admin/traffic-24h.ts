import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { APIContext } from 'astro';
import { requireAdmin } from '@/lib/auth-helpers';
import type { D1Database } from '@cloudflare/workers-types';
import type { AdminBindings } from '@/lib/types/admin';
import { apiRateLimiter } from '@/lib/rate-limiter';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

function getEnvString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// Cloudflare GraphQL endpoint
const CF_GQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const envBindings = getAdminEnv(context);
    const db = envBindings.DB as D1Database | undefined;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }
    try {
      await requireAdmin({ request: context.request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const runtimeEnv = (context.locals.runtime?.env ?? {}) as Record<string, unknown>;
    const apiToken =
      getEnvString(runtimeEnv.CLOUDFLARE_API_TOKEN) || getEnvString(runtimeEnv.CF_API_TOKEN);
    const zoneId =
      getEnvString(runtimeEnv.CLOUDFLARE_ZONE_ID) || getEnvString(runtimeEnv.CF_ZONE_ID);
    const accountId =
      getEnvString(runtimeEnv.CLOUDFLARE_ACCOUNT_ID) || getEnvString(runtimeEnv.CF_ACCOUNT_ID);

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
        viewer?: {
          accounts?: Array<{
            browserInsightsAdaptiveGroups?: CFBIGroup[];
            httpRequestsAdaptiveGroups?: CFBIGroup[];
          }>;
        };
      };

      const json = (await resp.json()) as {
        errors?: Array<{ message?: string }>;
        data?: unknown;
      };

      // Totals: try Browser Insights first, then fall back to httpRequestsAdaptiveGroups
      let pageViews = 0;
      let visits = 0;
      let haveTotals = false;

      if (resp.ok && !json.errors) {
        const dataRoot = json.data as CFZoneResp & CFAccountResp;
        const groupsBI = zoneId
          ? dataRoot?.viewer?.zones?.[0]?.browserInsightsAdaptiveGroups
          : dataRoot?.viewer?.accounts?.[0]?.browserInsightsAdaptiveGroups;
        if (Array.isArray(groupsBI) && groupsBI.length > 0 && groupsBI[0]?.sum) {
          const sumBI = groupsBI[0].sum as CFSum;
          pageViews = Number(sumBI.pageViews || 0);
          visits = Number(sumBI.visits || 0);
          haveTotals = true;
        }
      }

      if (!haveTotals) {
        const totalsQueryReq = zoneId
          ? `
          query TotalsReq($zoneTag: String!, $start: Time!, $end: Time!) {
            viewer { zones(filter: { zoneTag: $zoneTag }) {
              httpRequestsAdaptiveGroups(
                limit: 1,
                filter: { datetime_geq: $start, datetime_lt: $end }
              ) { sum { requests, visits } }
            } }
          }
        `
          : `
          query TotalsReqAccount($accountTag: String!, $start: Time!, $end: Time!) {
            viewer { accounts(filter: { accountTag: $accountTag }) {
              httpRequestsAdaptiveGroups(
                limit: 1,
                filter: { datetime_geq: $start, datetime_lt: $end }
              ) { sum { requests, visits } }
            } }
          }
        `;
        const totalsBodyReq = zoneId
          ? {
              query: totalsQueryReq,
              variables: { zoneTag: zoneId, start: datetimeStart, end: datetimeEnd },
            }
          : {
              query: totalsQueryReq,
              variables: { accountTag: accountId, start: datetimeStart, end: datetimeEnd },
            };

        const r = await fetch(CF_GQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify(totalsBodyReq),
        });
        const j = (await r.json()) as { errors?: Array<{ message?: string }>; data?: unknown };
        if (r.ok && !j.errors) {
          const dataReq = j.data as CFZoneResp & CFAccountResp;
          const groupsReq = zoneId
            ? dataReq?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups
            : dataReq?.viewer?.accounts?.[0]?.httpRequestsAdaptiveGroups;
          if (Array.isArray(groupsReq) && groupsReq.length > 0 && groupsReq[0]?.sum) {
            const sumReq = groupsReq[0].sum as CFSum;
            pageViews = Number(sumReq.requests || 0); // approximate pageviews
            visits = Number(sumReq.visits || 0);
            haveTotals = true;
          }
        }
      }

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
                sum { requests, visits }
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
              visits: Number(g?.sum?.visits || 0),
            }));
          }
        }
      }

      if (!haveTotals && Array.isArray(series) && series.length > 0) {
        pageViews = series.reduce((a, s) => a + Number(s.pageViews || 0), 0);
        visits = series.reduce((a, s) => a + Number(s.visits || 0), 0);
      }
      return createApiSuccess({ pageViews, visits, from: datetimeStart, to: datetimeEnd, series });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return createApiError('server_error', msg);
    }
  },
  { rateLimiter: apiRateLimiter, logMetadata: { action: 'admin_traffic_24h' } }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
