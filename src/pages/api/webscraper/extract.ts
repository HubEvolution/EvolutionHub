/**
 * API Route for Webscraper Tool
 *
 * POST /api/webscraper/extract: Extract content from URL.
 * Integrates with WebscraperService, applies middleware for rate-limiting, CSRF, logging.
 * No auth required (MVP), supports guest/user via cookie/locals.
 */

import type { APIContext } from 'astro';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { WebscraperService } from '@/lib/services/webscraper-service';
import { createRateLimiter } from '@/lib/rate-limiter';
import type { ScrapeInput, ScrapeResult } from '@/types/webscraper';
import type { Plan } from '@/config/ai-image';
import { getWebscraperEntitlementsFor } from '@/config/webscraper/entitlements';
import { webscraperRequestSchema } from '@/lib/validation/schemas/webscraper';
import { formatZodError } from '@/lib/validation';

interface WebscraperEnv {
  KV_WEBSCRAPER?: KVNamespace;
  ENVIRONMENT?: string;
  PUBLIC_WEBSCRAPER_V1?: string;
  WEBSCRAPER_GUEST_LIMIT?: string;
  WEBSCRAPER_USER_LIMIT?: string;
}

interface WebscraperError extends Error {
  code?: string;
  details?: unknown;
}

const webscraperLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 requests per minute
  name: 'webscraper',
});

function ensureGuestIdCookie(context: APIContext): string {
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
  async (context: APIContext) => {
    const { locals, request } = context;
    const user = locals.user;

    // Parse body
    let input: ScrapeInput;
    try {
      const bodyUnknown: unknown = await request.json();
      if (!bodyUnknown || typeof bodyUnknown !== 'object') {
        return createApiError('validation_error', 'Invalid JSON body');
      }
      const parsed = webscraperRequestSchema.safeParse(bodyUnknown);
      if (!parsed.success) {
        return createApiError('validation_error', 'Invalid JSON body', {
          details: formatZodError(parsed.error),
        });
      }
      input = { url: parsed.data.url, options: parsed.data.options ?? {} };
    } catch {
      return createApiError('validation_error', 'Invalid JSON body');
    }

    // Owner detection
    const ownerType = user ? 'user' : 'guest';
    const ownerId = user?.id || ensureGuestIdCookie(context);
    const plan: Plan | undefined =
      ownerType === 'user'
        ? (((user as { plan?: Plan } | null)?.plan ?? 'free') as Plan)
        : undefined;

    // Init service with flag check
    const rawEnv = (locals.runtime?.env ?? {}) as Record<string, unknown>;
    const env: WebscraperEnv = {
      KV_WEBSCRAPER: rawEnv.KV_WEBSCRAPER as KVNamespace | undefined,
      ENVIRONMENT: typeof rawEnv.ENVIRONMENT === 'string' ? rawEnv.ENVIRONMENT : undefined,
      PUBLIC_WEBSCRAPER_V1:
        typeof rawEnv.PUBLIC_WEBSCRAPER_V1 === 'string' ? rawEnv.PUBLIC_WEBSCRAPER_V1 : undefined,
      WEBSCRAPER_GUEST_LIMIT:
        typeof rawEnv.WEBSCRAPER_GUEST_LIMIT === 'string'
          ? rawEnv.WEBSCRAPER_GUEST_LIMIT
          : undefined,
      WEBSCRAPER_USER_LIMIT:
        typeof rawEnv.WEBSCRAPER_USER_LIMIT === 'string' ? rawEnv.WEBSCRAPER_USER_LIMIT : undefined,
    };

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
      const ent = getWebscraperEntitlementsFor(ownerType, plan);
      const result: ScrapeResult = await service.scrape(
        input,
        ownerType,
        ownerId,
        ent.dailyBurstCap
      );

      return createApiSuccess({
        result: result.result,
        usage: result.usage,
      });
    } catch (err) {
      const typedErr = err as WebscraperError;
      if (typedErr instanceof Error && typedErr.message.includes('quota exceeded')) {
        const detailsRecord =
          typedErr.details &&
          typeof typedErr.details === 'object' &&
          !Array.isArray(typedErr.details)
            ? (typedErr.details as Record<string, unknown>)
            : undefined;
        return createApiError('forbidden', typedErr.message, detailsRecord);
      }
      if (typedErr instanceof Error && typedErr.code === 'feature_disabled') {
        return createApiError('forbidden', typedErr.message);
      }
      if (typedErr instanceof Error && typedErr.code === 'validation_error') {
        return createApiError('validation_error', typedErr.message);
      }
      if (typedErr instanceof Error && typedErr.code === 'robots_txt_blocked') {
        return createApiError('forbidden', typedErr.message);
      }
      if (typedErr instanceof Error && typedErr.code === 'fetch_error') {
        return createApiError('server_error', typedErr.message);
      }
      if (typedErr instanceof Error && typedErr.code === 'parse_error') {
        return createApiError('server_error', typedErr.message);
      }
      return createApiError(
        'server_error',
        typedErr instanceof Error ? typedErr.message : 'Unknown error'
      );
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
