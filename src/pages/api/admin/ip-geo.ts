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

    let ip = url.searchParams.get('ip')?.trim() || '';
    if (!ip) {
      ip = (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '').split(',')[0].trim();
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
        const j = (await r1.json()) as any;
        const city = j?.city || '';
        const country = j?.country_name || j?.country || '';
        const display = (city || country) ? `${city ? city + ', ' : ''}${country}` : '';
        return createApiSuccess({ city, country, display, ip });
      }

      // Provider 2: ipwho.is (no key, JSON format)
      const p2 = `https://ipwho.is/${encodeURIComponent(ip)}`;
      const r2 = await fetch(p2, { headers: { 'User-Agent': 'evolution-hub-ip-geo/1.0' } });
      if (r2.ok) {
        const j2 = (await r2.json()) as any;
        const city = j2?.city || '';
        const country = j2?.country || '';
        const display = (city || country) ? `${city ? city + ', ' : ''}${country}` : '';
        return createApiSuccess({ city, country, display, ip });
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
