/**
 * Performance-optimierte Kommentar-API-Endpunkte
 * Implementiert Pagination, Caching und Lazy Loading
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { rateLimiter } from 'hono-rate-limiter';
import { drizzle } from 'drizzle-orm/d1';
import { PerformanceService } from '../../../lib/services/performance-service';
import { requireAuth } from '../../../lib/auth-helpers';
import type { PaginationOptions, CommentSearchOptions } from '../../../lib/types/performance';

const app = new Hono<{
  Bindings: { DB: D1Database; JWT_SECRET: string };
  Variables: { userId: number };
}>();

// Middleware
app.use('/*', cors());
app.use('/search', jwt({ secret: process.env.JWT_SECRET! }));
app.use(
  '/search',
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 20, // 20 Suchen pro Minute
    keyGenerator: (c) =>
      c.req.header('CF-Connecting-IP') ||
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      c.req.header('x-real-ip') ||
      'anonymous',
  })
);
app.use('/preload', jwt({ secret: process.env.JWT_SECRET! }));

/**
 * GET /api/comments/performance/paginated/:postId
 * Holt paginierte Kommentare mit Performance-Optimierungen
 */
app.get('/paginated/:postId', async (c) => {
  try {
    const postId = c.req.param('postId');
    const query = c.req.query();

    // Parse Query-Parameter
    const options: PaginationOptions = {
      page: parseInt(query.page || '1'),
      limit: Math.min(parseInt(query.limit || '20'), 100),
      sortBy: (query.sortBy as any) || 'createdAt',
      sortOrder: (query.sortOrder as any) || 'desc',
      includeReplies: query.includeReplies === 'true',
      maxDepth: parseInt(query.maxDepth || '5'),
    };

    // Hole User-ID wenn authentifiziert
    let userId: number | undefined;
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(atob(authHeader.split('.')[1]));
        userId = payload.userId;
      } catch (error) {
        // Nicht authentifiziert - trotzdem OK für öffentliche Kommentare
      }
    }

    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const result = await performanceService.getPaginatedComments(postId, options, userId);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching paginated comments:', error);
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
    await requireAuth(c);

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

    const searchOptions: CommentSearchOptions = {
      query: query.q,
      pagination: {
        page: parseInt(query.page || '1'),
        limit: Math.min(parseInt(query.limit || '20'), 50),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      filters: {
        status: query.status ? query.status.split(',') : ['approved'],
        authorId: query.authorId ? query.authorId.split(',').map((id) => parseInt(id)) : undefined,
        dateFrom: query.dateFrom ? parseInt(query.dateFrom) : undefined,
        dateTo: query.dateTo ? parseInt(query.dateTo) : undefined,
        hasReplies: query.hasReplies === 'true',
        minLikes: query.minLikes ? parseInt(query.minLikes) : undefined,
      },
      highlight: true,
    };

    const db = drizzle(c.env.DB);
    const performanceService = new PerformanceService(db);

    const result = await performanceService.searchComments(searchOptions);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error searching comments:', error);
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
    const user = await requireAuth(c);
    const userId = Number(user.id);

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
    console.error('Error preloading comments:', error);
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
    console.error('Error fetching cache stats:', error);
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
    const user = await requireAuth(c);
    const userId = Number(user.id);

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
    console.error('Error clearing cache:', error);
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
    console.error('Error fetching lazy config:', error);
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
    console.error('Error fetching performance metrics:', error);
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
    const user = await requireAuth(c);
    const userId = Number(user.id);

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
    console.error('Error optimizing database:', error);
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
    console.error('Error fetching comment batch:', error);
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
