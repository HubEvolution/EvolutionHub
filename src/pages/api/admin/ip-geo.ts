import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';

function isValidIp(ip: string): boolean {
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /:/; // simple check; detailed IPv6 regex is verbose
  return ipv4.test(ip) || ipv6.test(ip);
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { request, url, locals } = context;

    try {
      await requireAdmin({ request, env: { DB: (locals.runtime as any)?.env?.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const ip = url.searchParams.get('ip')?.trim();
    if (!ip || !isValidIp(ip)) {
      return createApiError('validation_error', 'Invalid ip');
    }

    try {
      const providerUrl = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
      const res = await fetch(providerUrl, { headers: { 'User-Agent': 'evolution-hub-ip-geo/1.0' } });
      if (!res.ok) {
        return createApiError('server_error', 'Geo lookup failed');
      }
      const j = await res.json() as any;
      const city = j?.city || '';
      const country = j?.country_name || j?.country || '';
      const display = (city || country) ? `${city ? city + ', ' : ''}${country}` : '';
      return createApiSuccess({ city, country, display });
    } catch {
      return createApiError('server_error', 'Geo lookup failed');
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
