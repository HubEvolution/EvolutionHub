/**
 * Performance-optimierte Kommentar-API-Endpunkte
 * Implementiert Pagination, Caching und Lazy Loading
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { rateLimiter } from 'hono-rate-limiter';
import { drizzle } from 'drizzle-orm/d1';
import { PerformanceService } from '../../../lib/services/performance-service';
import { log, generateRequestId } from '../../../server/utils/logger';
import { requireAuth, getAuthUser } from '../../../lib/auth-helpers';
import type { PaginationOptions, CommentSearchOptions } from '../../../lib/types/performance';

type CommentsBindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type CommentsVariables = {
  userId: number;
  requestId: string;
};

type CommentsContext = Context<{ Bindings: CommentsBindings; Variables: CommentsVariables }>;

const app = new Hono<{ Bindings: CommentsBindings; Variables: CommentsVariables }>();

const SORT_FIELDS: ReadonlyArray<NonNullable<PaginationOptions['sortBy']>> = [
  'createdAt',
  'updatedAt',
  'likes',
  'replies',
];

const SORT_ORDERS: ReadonlyArray<NonNullable<PaginationOptions['sortOrder']>> = ['asc', 'desc'];

function clampNumber(value: number, { min, max }: { min?: number; max?: number } = {}): number {
  let result = value;
  if (typeof min === 'number') {
    result = Math.max(min, result);
  }
  if (typeof max === 'number') {
    result = Math.min(max, result);
  }
  return result;
}

function parseInteger(value: string | undefined, fallback: number, bounds?: { min?: number; max?: number }): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clampNumber(parsed, bounds ?? {});
}

function parseSortField(value: string | undefined): PaginationOptions['sortBy'] {
  const candidate = value as PaginationOptions['sortBy'] | undefined;
  return candidate && SORT_FIELDS.includes(candidate) ? candidate : 'createdAt';
}

function parseSortOrder(value: string | undefined): PaginationOptions['sortOrder'] {
  const candidate = value as PaginationOptions['sortOrder'] | undefined;
  return candidate && SORT_ORDERS.includes(candidate) ? candidate : 'desc';
}

function parseBoolean(value: string | undefined): boolean {
  return value === 'true';
}

function buildPaginationOptions(query: Record<string, string | undefined>): PaginationOptions {
  return {
    page: parseInteger(query.page, 1, { min: 1 }),
    limit: parseInteger(query.limit, 20, { min: 1, max: 100 }),
    sortBy: parseSortField(query.sortBy),
    sortOrder: parseSortOrder(query.sortOrder),
    includeReplies: parseBoolean(query.includeReplies),
    maxDepth: parseInteger(query.maxDepth, 5, { min: 1 }),
  };
}

function buildSearchOptions(query: Record<string, string | undefined>): CommentSearchOptions {
  const status = query.status?.split(',').map((value) => value.trim()).filter(Boolean);
  const authorId = query.authorId
    ?.split(',')
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isFinite(id)) as number[] | undefined;
  const dateFrom = Number.isFinite(Number(query.dateFrom)) ? Number.parseInt(query.dateFrom!, 10) : undefined;
  const dateTo = Number.isFinite(Number(query.dateTo)) ? Number.parseInt(query.dateTo!, 10) : undefined;
  const minLikes = Number.isFinite(Number(query.minLikes)) ? Number.parseInt(query.minLikes!, 10) : undefined;
  const hasReplies = query.hasReplies ? parseBoolean(query.hasReplies) : undefined;

  return {
    query: query.q ?? '',
    pagination: {
      page: parseInteger(query.page, 1, { min: 1 }),
      limit: parseInteger(query.limit, 20, { min: 1, max: 50 }),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    filters: {
      status: status && status.length > 0 ? status : ['approved'],
      authorId,
      dateFrom,
      dateTo,
      hasReplies,
      minLikes,
    },
    highlight: true,
  };
}

function decodeBearerUserId(header: string | null): number | undefined {
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }

  const [, payload] = header.split('.');
  if (!payload) {
    return undefined;
  }

  try {
    const atobFn =
      globalThis.atob ||
      ((input: string) => Buffer.from(input, 'base64').toString('binary'));
    const json = JSON.parse(atobFn(payload)) as { userId?: unknown };
    const id = json.userId;
    return typeof id === 'number' ? id : undefined;
  } catch {
    return undefined;
  }
}

async function resolveOptionalUserId(c: CommentsContext): Promise<number | undefined> {
  const user = await getAuthUser(adaptRequest(c));
  if (user) {
    const numericId = Number.parseInt(user.id, 10);
    return Number.isFinite(numericId) ? numericId : undefined;
  }

  const authHeader = c.req.header('Authorization') ?? c.req.header('authorization');
  return decodeBearerUserId(authHeader ?? null);
}

function toNumericId(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid numeric identifier');
  }
  return parsed;
}

const adaptRequest = (c: CommentsContext) => ({
  req: { header: (name: string) => c.req.header(name) },
  request: c.req.raw,
  env: { DB: c.env.DB } as { DB: D1Database },
});

// Middleware
// Attach requestId for structured logging
app.use('/*', async (c, next) => {
  c.set('requestId', generateRequestId());
  await next();
});
app.use('/*', cors());
app.use('/search', async (c, next) => {
  const secret = c.env.JWT_SECRET;
  return jwt({ secret })(c, next);
});
app.use(
  '/search',
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 20, // 20 Suchen pro Minute
    keyGenerator: (ctx) =>
      ctx.req.header('CF-Connecting-IP') ||
      ctx.req.header('cf-connecting-ip') ||
      ctx.req.header('x-forwarded-for') ||
      ctx.req.header('x-real-ip') ||
      'anonymous',
  })
);
app.use('/preload', async (c, next) => jwt({ secret: c.env.JWT_SECRET })(c, next));

/**
 * GET /api/comments/performance/paginated/:postId
 * Holt paginierte Kommentare mit Performance-Optimierungen
 */
app.get('/paginated/:postId', async (c) => {
  try {
    const postId = c.req.param('postId');
    const query = c.req.query();
    const options = buildPaginationOptions(query);
    const userId = await resolveOptionalUserId(c);

    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const result = await performanceService.getPaginatedComments(postId, options, userId);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log('error', 'Error fetching paginated comments', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/paginated/:postId',
      method: 'GET',
      postId: c.req.param('postId'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch comments',
        },
      },
      500
    );
  }
});

/**
 * GET /api/comments/performance/search
 * Sucht Kommentare mit Volltext-Suche und Performance-Optimierungen
 */
app.get('/search', async (c) => {
  try {
    const query = c.req.query();
    await requireAuth(adaptRequest(c));

    if (!query.q) {
      return c.json(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Search query is required',
          },
        },
        400
      );
    }

    const searchOptions = buildSearchOptions(query);

    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const result = await performanceService.searchComments(searchOptions);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log('error', 'Error searching comments', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/search',
      method: 'GET',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Search failed',
        },
      },
      500
    );
  }
});

/**
 * POST /api/comments/performance/preload/:postId
 * Preloadet Kommentare für bessere UX
 */
app.post('/preload/:postId', async (c) => {
  try {
    const postId = c.req.param('postId');
    const user = await requireAuth(adaptRequest(c));
    const userId = toNumericId(user.id);

    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    // Preloade erste Seiten im Hintergrund
    await performanceService.preloadComments(postId, userId);

    return c.json({
      success: true,
      data: {
        message: 'Comments preloaded successfully',
      },
    });
  } catch (error) {
    log('error', 'Error preloading comments', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/preload/:postId',
      method: 'POST',
      postId: c.req.param('postId'),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Preloading failed',
        },
      },
      500
    );
  }
});

/**
 * GET /api/comments/performance/cache/stats
 * Holt Cache-Statistiken
 */
app.get('/cache/stats', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const stats = performanceService.getCacheStats();

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log('error', 'Error fetching cache stats', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/cache/stats',
      method: 'GET',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch cache statistics',
        },
      },
      500
    );
  }
});

/**
 * POST /api/comments/performance/cache/clear
 * Bereinigt Cache (nur für Admins)
 */
app.post('/cache/clear', async (c) => {
  try {
    const user = await requireAuth(adaptRequest(c));
    const userId = toNumericId(user.id);

    // Prüfe Admin-Berechtigung (vereinfacht)
    if (userId !== 1) {
      // Annahme: User ID 1 ist Admin
      return c.json(
        {
          success: false,
          error: {
            type: 'forbidden',
            message: 'Admin access required',
          },
        },
        403
      );
    }

    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const clearedCount = performanceService.cleanupCache();

    return c.json({
      success: true,
      data: {
        clearedEntries: clearedCount,
        message: 'Cache cleared successfully',
      },
    });
  } catch (error) {
    log('error', 'Error clearing cache', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/cache/clear',
      method: 'POST',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to clear cache',
        },
      },
      500
    );
  }
});

/**
 * GET /api/comments/performance/lazy-config
 * Holt Lazy Loading Konfiguration
 */
app.get('/lazy-config', (c) => {
  try {
    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const config = performanceService.getLazyLoadConfig();

    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    log('error', 'Error fetching lazy config', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/lazy-config',
      method: 'GET',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch lazy loading configuration',
        },
      },
      500
    );
  }
});

/**
 * GET /api/comments/performance/metrics
 * Holt Performance-Metriken
 */
app.get('/metrics', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const metrics = await performanceService.getPerformanceMetrics();

    return c.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    log('error', 'Error fetching performance metrics', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/metrics',
      method: 'GET',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch performance metrics',
        },
      },
      500
    );
  }
});

/**
 * POST /api/comments/performance/optimize
 * Optimiert Datenbank-Indizes (nur für Admins)
 */
app.post('/optimize', async (c) => {
  try {
    const user = await requireAuth(adaptRequest(c));
    const userId = toNumericId(user.id);

    // Prüfe Admin-Berechtigung
    if (userId !== 1) {
      return c.json(
        {
          success: false,
          error: {
            type: 'forbidden',
            message: 'Admin access required',
          },
        },
        403
      );
    }

    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    await performanceService.optimizeIndexes();

    return c.json({
      success: true,
      data: {
        message: 'Database optimization completed',
      },
    });
  } catch (error) {
    log('error', 'Error optimizing database', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/optimize',
      method: 'POST',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Database optimization failed',
        },
      },
      500
    );
  }
});

/**
 * GET /api/comments/performance/batch/:postId
 * Holt Kommentare in Batches für Lazy Loading
 */
app.get('/batch/:postId', async (c) => {
  try {
    // const postId = c.req.param('postId'); // currently unused in mock response
    const query = c.req.query();

    const batchOptions = {
      page: parseInt(query.page || '1'),
      limit: Math.min(parseInt(query.limit || '10'), 50),
      offset: parseInt(query.offset || '0'),
      includeReplies: query.includeReplies === 'true',
    };

    // Hier würde die echte Batch-Implementierung erfolgen
    // Für jetzt geben wir eine Struktur zurück

    return c.json({
      success: true,
      data: {
        comments: [], // Würde echte Kommentare enthalten
        hasMore: false,
        nextOffset: batchOptions.offset + batchOptions.limit,
        batchSize: batchOptions.limit,
      },
    });
  } catch (error) {
    log('error', 'Error fetching comment batch', {
      requestId: c.get('requestId'),
      endpoint: '/api/comments/performance/batch/:postId',
      method: 'GET',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Failed to fetch comment batch',
        },
      },
      500
    );
  }
});
