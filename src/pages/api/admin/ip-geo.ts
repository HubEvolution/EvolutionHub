import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { D1Database } from '@cloudflare/workers-types';

function isValidIp(ip: string): boolean {
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /:/; // simple check; detailed IPv6 regex is verbose
  return ipv4.test(ip) || ipv6.test(ip);
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { request, url, locals } = context;

    try {
      const dbMaybe = ((locals.runtime?.env ?? {}) as { DB?: D1Database }).DB;
      await requireAdmin({ request, env: { DB: dbMaybe as D1Database } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let ip = url.searchParams.get('ip')?.trim() || '';
    if (!ip) {
      ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '')
        .split(',')[0]
        .trim();
    }
    if (!ip || !isValidIp(ip)) {
      // Return safe success with empty location instead of hard 4xx to keep UI silent
      return createApiSuccess({ city: '', country: '', display: '', ip: ip || '' });
    }

    try {
      // Provider 1: ipapi.co
      const p1 = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
      const r1 = await fetch(p1, { headers: { 'User-Agent': 'evolution-hub-ip-geo/1.0' } });
      if (r1.ok) {
        const j = (await r1.json()) as unknown;
        const city = (j as { city?: unknown })?.city;
        const countryName = (j as { country_name?: unknown })?.country_name;
        const countryAlt = (j as { country?: unknown })?.country;
        const cityStr = typeof city === 'string' ? city : '';
        const countryStr =
          typeof countryName === 'string'
            ? countryName
            : typeof countryAlt === 'string'
              ? countryAlt
              : '';
        const display =
          cityStr || countryStr ? `${cityStr ? cityStr + ', ' : ''}${countryStr}` : '';
        return createApiSuccess({ city: cityStr, country: countryStr, display, ip });
      }

      // Provider 2: ipwho.is (no key, JSON format)
      const p2 = `https://ipwho.is/${encodeURIComponent(ip)}`;
      const r2 = await fetch(p2, { headers: { 'User-Agent': 'evolution-hub-ip-geo/1.0' } });
      if (r2.ok) {
        const j2 = (await r2.json()) as unknown;
        const city2 = (j2 as { city?: unknown })?.city;
        const country2 = (j2 as { country?: unknown })?.country;
        const cityStr2 = typeof city2 === 'string' ? city2 : '';
        const countryStr2 = typeof country2 === 'string' ? country2 : '';
        const display =
          cityStr2 || countryStr2 ? `${cityStr2 ? cityStr2 + ', ' : ''}${countryStr2}` : '';
        return createApiSuccess({ city: cityStr2, country: countryStr2, display, ip });
      }

      // Fallback: succeed silently with empty display
      return createApiSuccess({ city: '', country: '', display: '', ip });
    } catch {
      // Fail-soft: succeed with empty display so UI shows '—' without a console 500
      return createApiSuccess({ city: '', country: '', display: '', ip });
    }
  },
  {
    rateLimiter: apiRateLimiter,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
