'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.POST =
  exports.GET =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const auth_helpers_1 = require('@/lib/auth-helpers');
const rate_limiter_1 = require('@/lib/rate-limiter');
function getAdminEnv(context) {
  const env = context.locals?.runtime?.env ?? {};
  return env ?? {};
}
function getEnvString(value) {
  return typeof value === 'string' ? value : '';
}
// Cloudflare GraphQL endpoint
const CF_GQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const envBindings = getAdminEnv(context);
    const db = envBindings.DB;
    if (!db) {
      return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    try {
      await (0, auth_helpers_1.requireAdmin)({ request: context.request, env: { DB: db } });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const runtimeEnv = context.locals.runtime?.env ?? {};
    const apiToken =
      getEnvString(runtimeEnv.CLOUDFLARE_API_TOKEN) || getEnvString(runtimeEnv.CF_API_TOKEN);
    const zoneId =
      getEnvString(runtimeEnv.CLOUDFLARE_ZONE_ID) || getEnvString(runtimeEnv.CF_ZONE_ID);
    const accountId =
      getEnvString(runtimeEnv.CLOUDFLARE_ACCOUNT_ID) || getEnvString(runtimeEnv.CF_ACCOUNT_ID);
    if (!apiToken || (!zoneId && !accountId)) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Missing Cloudflare credentials',
        {
          missing: {
            CLOUDFLARE_API_TOKEN: !apiToken,
            ZONE_OR_ACCOUNT_ID: !(zoneId || accountId),
          },
        }
      );
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
      const json = await resp.json();
      // Totals: try Browser Insights first, then fall back to httpRequestsAdaptiveGroups
      let pageViews = 0;
      let visits = 0;
      let haveTotals = false;
      if (resp.ok && !json.errors) {
        const dataRoot = json.data;
        const groupsBI = zoneId
          ? dataRoot?.viewer?.zones?.[0]?.browserInsightsAdaptiveGroups
          : dataRoot?.viewer?.accounts?.[0]?.browserInsightsAdaptiveGroups;
        if (Array.isArray(groupsBI) && groupsBI.length > 0 && groupsBI[0]?.sum) {
          const sumBI = groupsBI[0].sum;
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
        const j = await r.json();
        if (r.ok && !j.errors) {
          const dataReq = j.data;
          const groupsReq = zoneId
            ? dataReq?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups
            : dataReq?.viewer?.accounts?.[0]?.httpRequestsAdaptiveGroups;
          if (Array.isArray(groupsReq) && groupsReq.length > 0 && groupsReq[0]?.sum) {
            const sumReq = groupsReq[0].sum;
            pageViews = Number(sumReq.requests || 0); // approximate pageviews
            visits = Number(sumReq.visits || 0);
            haveTotals = true;
          }
        }
      }
      // Optionally fetch a 24-point series for sparkline
      let series;
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
        async function tryFetch(bodyObj) {
          const r = await fetch(CF_GQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
            body: JSON.stringify(bodyObj),
          });
          const j = await r.json();
          return { ok: r.ok && !j.errors, j };
        }
        const bi = await tryFetch(seriesBodyBI);
        if (bi.ok) {
          const dataBI = bi.j.data;
          const groupsBI = zoneId
            ? dataBI?.viewer?.zones?.[0]?.browserInsightsAdaptiveGroups
            : dataBI?.viewer?.accounts?.[0]?.browserInsightsAdaptiveGroups;
          if (Array.isArray(groupsBI)) {
            series = groupsBI.map((g) => ({
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
            const dataReq = rq.j.data;
            const groupsReq = dataReq?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
            series = groupsReq.map((g) => ({
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
      return (0, api_middleware_1.createApiSuccess)({
        pageViews,
        visits,
        from: datetimeStart,
        to: datetimeEnd,
        series,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return (0, api_middleware_1.createApiError)('server_error', msg);
    }
  },
  { rateLimiter: rate_limiter_1.apiRateLimiter, logMetadata: { action: 'admin_traffic_24h' } }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
