import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';

vi.mock('@/lib/rate-limiter', () => ({
  apiRateLimiter: vi.fn(),
}));

vi.mock('@/lib/auth-helpers', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: (db: D1Database) => db,
}));

vi.mock('@/lib/services/performance-service', () => ({
  PerformanceService: vi.fn(),
}));

import { GET } from '@/pages/api/comments/performance';
import { PerformanceService } from '@/lib/services/performance-service';
import { requireAuth } from '@/lib/auth-helpers';
import { apiRateLimiter } from '@/lib/rate-limiter';

type PerformanceServiceMock = {
  getPaginatedComments: ReturnType<typeof vi.fn>;
  searchComments: ReturnType<typeof vi.fn>;
  getLazyLoadConfig: ReturnType<typeof vi.fn>;
  getPerformanceMetrics: ReturnType<typeof vi.fn>;
  getCacheStats: ReturnType<typeof vi.fn>;
};

const performanceServiceCtor = PerformanceService as unknown as Mock;
const requireAuthMock = requireAuth as unknown as Mock;
const apiRateLimiterMock = apiRateLimiter as unknown as Mock;

describe('GET /api/comments/performance', () => {
  let createService: () => PerformanceServiceMock;
  let lastService: PerformanceServiceMock | null;

  beforeEach(() => {
    vi.clearAllMocks();
    createService = defaultServiceFactory;
    lastService = null;
    performanceServiceCtor.mockImplementation(() => {
      const instance = createService();
      lastService = instance;
      return instance as unknown as PerformanceService;
    });
    apiRateLimiterMock.mockResolvedValue({ success: true });
    requireAuthMock.mockResolvedValue({ id: 'auth-user' });
  });

  afterEach(() => {
    lastService = null;
  });

  it('returns validation_error when mode is unsupported', async () => {
    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=unknown')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ success: false, error: { type: 'validation_error' } });
    const details = payload.error?.details || {};
    const allowed = Array.isArray(details.allowedModes)
      ? details.allowedModes
      : Array.isArray(details.details?.allowedModes)
        ? details.details.allowedModes
        : [];
    expect(allowed).toContain('status');
    expect(requireAuthMock).not.toHaveBeenCalled();
  });

  it('returns status payload for mode=status', async () => {
    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=status')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.status).toBe('ok');
    expect(Object.keys(payload.data.availableModes)).toContain('paginated');
    expect(requireAuthMock).not.toHaveBeenCalled();
  });

  it('validates postId for paginated mode', async () => {
    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=paginated')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error.type).toBe('validation_error');
    expect(requireAuthMock).not.toHaveBeenCalled();
  });

  it('delegates to getPaginatedComments with parsed parameters and optional user', async () => {
    const result = {
      comments: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: true },
      metadata: { queryTime: 1, cacheHit: false, cacheKey: 'foo' },
    };

    createService = () => ({
      getPaginatedComments: vi.fn().mockResolvedValue(result),
      searchComments: vi.fn(),
      getLazyLoadConfig: vi.fn(),
      getPerformanceMetrics: vi.fn(),
      getCacheStats: vi.fn(),
    });

    const response = await GET(
      createContext(
        'https://example.com/api/comments/performance?mode=paginated&postId=post-123&page=2&limit=10&includeReplies=true',
        { userId: '42' }
      )
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual(result);
    expect(requireAuthMock).not.toHaveBeenCalled();
    expect(lastService?.getPaginatedComments).toHaveBeenCalledWith(
      'post-123',
      {
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeReplies: true,
        maxDepth: 5,
      },
      42
    );
  });

  it('enforces authentication for mode=search and forwards filters', async () => {
    const searchResult = { comments: [], highlights: {}, total: 0, searchTime: 5 };
    createService = () => ({
      getPaginatedComments: vi.fn(),
      searchComments: vi.fn().mockResolvedValue(searchResult),
      getLazyLoadConfig: vi.fn(),
      getPerformanceMetrics: vi.fn(),
      getCacheStats: vi.fn(),
    });

    const response = await GET(
      createContext(
        'https://example.com/api/comments/performance?mode=search&q=keyword&limit=5&authorId=1&status=approved'
      )
    );
    const payload = await responseJson(response);

    expect(requireAuthMock).toHaveBeenCalledOnce();
    expect(lastService?.searchComments).toHaveBeenCalledWith({
      query: 'keyword',
      pagination: { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' },
      filters: {
        status: ['approved'],
        authorId: [1],
        dateFrom: undefined,
        dateTo: undefined,
        hasReplies: undefined,
        minLikes: undefined,
      },
      highlight: true,
    });
    expect(response.status).toBe(200);
    expect(payload.data).toEqual(searchResult);
  });

  it('returns validation_error when search parameters fail validation', async () => {
    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=search&q=')
    );
    const payload = await responseJson(response);

    expect(requireAuthMock).toHaveBeenCalledOnce();
    expect(payload.success).toBe(false);
    expect(payload.error.type).toBe('validation_error');
    expect(lastService?.searchComments).not.toHaveBeenCalled();
  });

  it('returns lazy loading config for mode=lazy-config', async () => {
    const lazyConfig = { enabled: true, threshold: 42 };
    createService = () => ({
      getPaginatedComments: vi.fn(),
      searchComments: vi.fn(),
      getLazyLoadConfig: vi.fn().mockReturnValue(lazyConfig),
      getPerformanceMetrics: vi.fn(),
      getCacheStats: vi.fn(),
    });

    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=lazy-config')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(lazyConfig);
    expect(lastService?.getLazyLoadConfig).toHaveBeenCalledOnce();
  });

  it('returns metrics for mode=metrics', async () => {
    const metrics = { queryTime: 10, cacheHit: false, totalTime: 12 };
    createService = () => ({
      getPaginatedComments: vi.fn(),
      searchComments: vi.fn(),
      getLazyLoadConfig: vi.fn(),
      getPerformanceMetrics: vi.fn().mockResolvedValue(metrics),
      getCacheStats: vi.fn(),
    });

    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=metrics')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(metrics);
    expect(lastService?.getPerformanceMetrics).toHaveBeenCalledOnce();
  });

  it('returns cache stats for mode=cache-stats', async () => {
    const stats = { hits: 1, misses: 2, hitRate: 0.33, totalSize: 1024, maxSize: 4096, entries: 3 };
    createService = () => ({
      getPaginatedComments: vi.fn(),
      searchComments: vi.fn(),
      getLazyLoadConfig: vi.fn(),
      getPerformanceMetrics: vi.fn(),
      getCacheStats: vi.fn().mockReturnValue(stats),
    });

    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=cache-stats')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(stats);
    expect(lastService?.getCacheStats).toHaveBeenCalledOnce();
  });

  it('maps rate limiter failures to rate_limit error', async () => {
    apiRateLimiterMock.mockResolvedValueOnce({ success: false });

    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=status')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(429);
    expect(payload.error.type).toBe('rate_limit');
  });

  it('returns auth_error when requireAuth rejects', async () => {
    requireAuthMock.mockRejectedValueOnce(new Error('Authentication required'));

    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=search&q=foo')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(401);
    expect(payload.error.type).toBe('auth_error');
    expect(lastService?.searchComments).not.toHaveBeenCalled();
  });

  it('maps service exceptions to server_error', async () => {
    createService = () => ({
      getPaginatedComments: vi.fn().mockRejectedValue(new Error('DB down')),
      searchComments: vi.fn(),
      getLazyLoadConfig: vi.fn(),
      getPerformanceMetrics: vi.fn(),
      getCacheStats: vi.fn(),
    });

    const response = await GET(
      createContext('https://example.com/api/comments/performance?mode=paginated&postId=post-1')
    );
    const payload = await responseJson(response);

    expect(response.status).toBe(500);
    expect(payload.error.type).toBe('server_error');
  });

  it('returns server_error when database binding is missing', async () => {
    const context = createContext('https://example.com/api/comments/performance?mode=status');
    ((context.locals as any).runtime.env as any).DB = undefined;

    const response = await GET(context);
    const payload = await responseJson(response);

    expect(response.status).toBe(500);
    expect(payload.error.type).toBe('server_error');
  });
});

function defaultServiceFactory(): PerformanceServiceMock {
  return {
    getPaginatedComments: vi.fn(),
    searchComments: vi.fn(),
    getLazyLoadConfig: vi.fn(),
    getPerformanceMetrics: vi.fn(),
    getCacheStats: vi.fn(),
  };
}

function createContext(url: string, options: { userId?: string } = {}): APIContext {
  const request = new Request(url, { method: 'GET' });
  const db = {
    prepare: vi.fn(() => ({
      first: vi.fn(),
      all: vi.fn(),
    })),
  } as unknown as D1Database;

  const context: Partial<APIContext> = {
    clientAddress: '127.0.0.1',
    request,
    params: {},
    locals: {
      user: options.userId ? { id: options.userId } : undefined,
      runtime: {
        env: {
          DB: db,
        },
      },
    },
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    },
  };

  return context as APIContext;
}

async function responseJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
