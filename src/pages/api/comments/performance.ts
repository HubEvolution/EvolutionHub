import type { APIContext } from 'astro';
import {
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
  withApiMiddleware,
} from '@/lib/api-middleware';
import { drizzle } from 'drizzle-orm/d1';
import { PerformanceService } from '@/lib/services/performance-service';
import { requireAuth } from '@/lib/auth-helpers';
import {
  commentPerformancePaginationQuerySchema,
  commentPerformancePostIdParamSchema,
  commentPerformanceSearchQuerySchema,
  formatZodError,
} from '@/lib/validation';

type CommentPerformanceEnv = { DB?: unknown };

const ALLOWED_MODES = ['status', 'paginated', 'search', 'lazy-config', 'metrics', 'cache-stats'] as const;

type CommentPerformanceMode = (typeof ALLOWED_MODES)[number];

function resolvePerformanceEnv(context: APIContext): { db: D1Database } {
  const runtimeEnv = (context.locals?.runtime?.env || {}) as CommentPerformanceEnv;
  const legacyEnv = (context as { locals?: { env?: CommentPerformanceEnv } }).locals?.env;
  const env = runtimeEnv ?? legacyEnv ?? {};
  const dbUnknown = env.DB;
  if (!dbUnknown) {
    throw createApiError('server_error', 'Database binding missing');
  }
  if (typeof (dbUnknown as { prepare?: unknown }).prepare !== 'function') {
    throw createApiError('server_error', 'Database binding invalid');
  }
  return { db: dbUnknown as D1Database };
}

function buildQueryRecord(params: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  const keys = new Set<string>();
  params.forEach((_, key) => keys.add(key));
  for (const key of keys) {
    const values = params.getAll(key);
    if (values.length === 0) continue;
    record[key] = values.length === 1 ? values[0] : values;
  }
  return record;
}

function getOptionalNumericUserId(context: APIContext): number | undefined {
  const locals = context.locals as {
    user?: { id?: string | number };
    runtime?: { user?: { id?: string | number } };
  };

  const candidate = locals.user?.id ?? locals.runtime?.user?.id;
  if (candidate === undefined || candidate === null) return undefined;

  const numeric = Number.parseInt(String(candidate), 10);
  return Number.isFinite(numeric) ? numeric : undefined;
}

const availableModesPayload = {
  status: 'Returns service status',
  paginated: 'Returns paginated comments for a post (requires postId)',
  search: 'Performs authenticated search across comments',
  'lazy-config': 'Returns lazy loading configuration',
  metrics: 'Returns performance metrics snapshot',
  'cache-stats': 'Returns in-memory cache statistics',
} as const;

export const GET = withApiMiddleware(
  async (context: APIContext) => {
    try {
      const { db } = resolvePerformanceEnv(context);
      const url = new URL(context.request.url);
      const mode = (url.searchParams.get('mode')?.toLowerCase() ?? 'status') as CommentPerformanceMode;

      if (!ALLOWED_MODES.includes(mode)) {
        return createApiError('validation_error', 'Unsupported mode provided', {
          details: {
            allowedModes: ALLOWED_MODES,
          },
        });
      }

      if (mode === 'status') {
        return createApiSuccess({
          status: 'ok',
          availableModes: availableModesPayload,
        });
      }

      const rawRecord = buildQueryRecord(url.searchParams);
      const drizzleDb = drizzle(db);
      const performanceService = new PerformanceService(drizzleDb);

      if (mode === 'paginated') {
        const postIdRaw = url.searchParams.get('postId');
        const postIdParsed = commentPerformancePostIdParamSchema.safeParse({ postId: postIdRaw });
        if (!postIdParsed.success) {
          return createApiError('validation_error', 'Invalid postId provided', {
            details: formatZodError(postIdParsed.error),
          });
        }

        const paginationInput = { ...rawRecord } as Record<string, string | string[]>;
        delete paginationInput.mode;
        delete paginationInput.postId;

        const paginationParsed = commentPerformancePaginationQuerySchema.safeParse(paginationInput);
        if (!paginationParsed.success) {
          return createApiError('validation_error', 'Invalid pagination parameters', {
            details: formatZodError(paginationParsed.error),
          });
        }

        const userId = getOptionalNumericUserId(context);
        const result = await performanceService.getPaginatedComments(
          postIdParsed.data.postId,
          paginationParsed.data,
          userId
        );
        return createApiSuccess(result);
      }

      if (mode === 'search') {
        try {
          await requireAuth({ request: context.request, env: { DB: db } });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createApiError('auth_error', message || 'Unauthorized');
        }

        const searchInput = { ...rawRecord } as Record<string, string | string[]>;
        delete searchInput.mode;

        const searchParsed = commentPerformanceSearchQuerySchema.safeParse(searchInput);
        if (!searchParsed.success) {
          return createApiError('validation_error', 'Invalid search parameters', {
            details: formatZodError(searchParsed.error),
          });
        }

        const result = await performanceService.searchComments(searchParsed.data);
        return createApiSuccess(result);
      }

      if (mode === 'lazy-config') {
        const config = performanceService.getLazyLoadConfig();
        return createApiSuccess(config);
      }

      if (mode === 'metrics') {
        const metrics = await performanceService.getPerformanceMetrics();
        return createApiSuccess(metrics);
      }

      if (mode === 'cache-stats') {
        const stats = performanceService.getCacheStats();
        return createApiSuccess(stats);
      }

      return createApiError('server_error', 'Unhandled mode');
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      const message = error instanceof Error ? error.message : String(error);
      return createApiError('server_error', message);
    }
  },
  {
    logMetadata: { action: 'comments_performance' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
