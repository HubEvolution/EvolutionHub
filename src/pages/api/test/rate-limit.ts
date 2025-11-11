import type { APIContext } from 'astro';
import { withApiMiddleware, createApiSuccess } from '@/lib/api-middleware';
import { createRateLimiter } from '@/lib/rate-limiter';

const testLimiter = createRateLimiter({ name: 'e2e-kv-rl', maxRequests: 1, windowMs: 5_000 });

export const GET = withApiMiddleware(
  async (_context: APIContext) => {
    return createApiSuccess({ ok: true, ts: Date.now() });
  },
  { rateLimiter: testLimiter }
);
