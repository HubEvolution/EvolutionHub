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
const rate_limiter_1 = require('@/lib/rate-limiter');
const auth_helpers_1 = require('@/lib/auth-helpers');
function getAdminEnv(context) {
  const env = context.locals?.runtime?.env ?? {};
  return env ?? {};
}
function isValidIp(ip) {
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /:/; // simple check; detailed IPv6 regex is verbose
  return ipv4.test(ip) || ipv6.test(ip);
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const { request, url } = context;
    const env = getAdminEnv(context);
    const db = env.DB;
    if (!db) {
      return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    try {
      await (0, auth_helpers_1.requireAdmin)({ request, env: { DB: db } });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    let ip = url.searchParams.get('ip')?.trim() || '';
    if (!ip) {
      ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '')
        .split(',')[0]
        .trim();
    }
    if (!ip || !isValidIp(ip)) {
      // Return safe success with empty location instead of hard 4xx to keep UI silent
      return (0, api_middleware_1.createApiSuccess)({
        city: '',
        country: '',
        display: '',
        ip: ip || '',
      });
    }
    try {
      // Provider 1: ipapi.co
      const p1 = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
      const r1 = await fetch(p1, { headers: { 'User-Agent': 'evolution-hub-ip-geo/1.0' } });
      if (r1.ok) {
        const j = await r1.json();
        const city = j?.city;
        const countryName = j?.country_name;
        const countryAlt = j?.country;
        const cityStr = typeof city === 'string' ? city : '';
        const countryStr =
          typeof countryName === 'string'
            ? countryName
            : typeof countryAlt === 'string'
              ? countryAlt
              : '';
        const display =
          cityStr || countryStr ? `${cityStr ? cityStr + ', ' : ''}${countryStr}` : '';
        return (0, api_middleware_1.createApiSuccess)({
          city: cityStr,
          country: countryStr,
          display,
          ip,
        });
      }
      // Provider 2: ipwho.is (no key, JSON format)
      const p2 = `https://ipwho.is/${encodeURIComponent(ip)}`;
      const r2 = await fetch(p2, { headers: { 'User-Agent': 'evolution-hub-ip-geo/1.0' } });
      if (r2.ok) {
        const j2 = await r2.json();
        const city2 = j2?.city;
        const country2 = j2?.country;
        const cityStr2 = typeof city2 === 'string' ? city2 : '';
        const countryStr2 = typeof country2 === 'string' ? country2 : '';
        const display =
          cityStr2 || countryStr2 ? `${cityStr2 ? cityStr2 + ', ' : ''}${countryStr2}` : '';
        return (0, api_middleware_1.createApiSuccess)({
          city: cityStr2,
          country: countryStr2,
          display,
          ip,
        });
      }
      // Fallback: succeed silently with empty display
      return (0, api_middleware_1.createApiSuccess)({ city: '', country: '', display: '', ip });
    } catch {
      // Fail-soft: succeed with empty display so UI shows '—' without a console 500
      return (0, api_middleware_1.createApiSuccess)({ city: '', country: '', display: '', ip });
    }
  },
  {
    rateLimiter: rate_limiter_1.apiRateLimiter,
  }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
