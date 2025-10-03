/**
 * API Route for Webscraper Tool
 *
 * POST /api/webscraper/extract: Extract content from URL.
 * Integrates with WebscraperService, applies middleware for rate-limiting, CSRF, logging.
 * No auth required (MVP), supports guest/user via cookie/locals.
 */

import type { APIRoute } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { WebscraperService } from '@/lib/services/webscraper-service';
import { createRateLimiter } from '@/lib/rate-limiter';
import type { ScrapeInput, ScrapeResult } from '@/types/webscraper';

const webscraperLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 requests per minute
  name: 'webscraper',
});

function ensureGuestIdCookie(context: Parameters<APIRoute>[0]): string {
  const cookies = context.cookies;
  let guestId = cookies.get('guest_id')?.value;
  if (!guestId) {
    guestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const url = new URL(context.request.url);
    cookies.set('guest_id', guestId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 180, // 180 days
    });
  }
  return guestId;
}

export const POST = withApiMiddleware(
  async (context) => {
    const { locals, request } = context;
    const user = locals.user;

    // Parse body
    let input: ScrapeInput;
    try {
      const bodyUnknown: unknown = await request.json();
      if (!bodyUnknown || typeof bodyUnknown !== 'object') {
        return createApiError('validation_error', 'Invalid JSON body');
      }
      const body = bodyUnknown as Record<string, any>;

      const url = typeof body.url === 'string' ? body.url.trim() : '';
      if (!url) {
        return createApiError('validation_error', 'URL is required');
      }

      input = {
        url,
        options: body.options || {},
      };
    } catch {
      return createApiError('validation_error', 'Invalid JSON body');
    }

    // Owner detection
    const ownerType = user ? 'user' : 'guest';
    const ownerId = user?.id || ensureGuestIdCookie(context);

    // Init service with flag check
    const env = (locals.runtime?.env as any) ?? {};
    if (env.PUBLIC_WEBSCRAPER_V1 === 'false') {
      return createApiError('forbidden', 'Feature not enabled');
    }

    const service = new WebscraperService({
      KV_WEBSCRAPER: env.KV_WEBSCRAPER,
      ENVIRONMENT: env.ENVIRONMENT,
      PUBLIC_WEBSCRAPER_V1: env.PUBLIC_WEBSCRAPER_V1,
      WEBSCRAPER_GUEST_LIMIT: env.WEBSCRAPER_GUEST_LIMIT,
      WEBSCRAPER_USER_LIMIT: env.WEBSCRAPER_USER_LIMIT,
    });

    try {
      const result: ScrapeResult = await service.scrape(input, ownerType, ownerId);

      return createApiSuccess({
        result: result.result,
        usage: result.usage,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('quota exceeded')) {
        return createApiError('forbidden', err.message, (err as any).details);
      }
      if (err instanceof Error && (err as any).code === 'feature_disabled') {
        return createApiError('forbidden', err.message);
      }
      if (err instanceof Error && (err as any).code === 'validation_error') {
        return createApiError('validation_error', err.message);
      }
      if (err instanceof Error && (err as any).code === 'robots_txt_blocked') {
        return createApiError('forbidden', err.message);
      }
      if (err instanceof Error && (err as any).code === 'fetch_error') {
        return createApiError('server_error', err.message);
      }
      if (err instanceof Error && (err as any).code === 'parse_error') {
        return createApiError('server_error', err.message);
      }
      return createApiError('server_error', err instanceof Error ? err.message : 'Unknown error');
    }
  },
  {
    rateLimiter: webscraperLimiter,
    enforceCsrfToken: true,
    disableAutoLogging: false,
  }
);

// 405 for other methods
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
