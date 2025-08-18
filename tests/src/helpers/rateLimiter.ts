import { vi } from 'vitest';
import * as rateLimiter from '@/lib/rate-limiter';

/**
 * Mockt den Rate-Limiter genau einmal mit einer 429-Response (Too Many Requests).
 * Optional: eigenen Status/StatusText setzen.
 */
export function mockRateLimitOnce(
  status = 429,
  statusText = 'Too Many Requests',
  limiter: 'apiRateLimiter' | 'standardApiLimiter' | 'authLimiter' = 'apiRateLimiter'
) {
  const rateLimitResponse = new Response(null, {
    status,
    statusText,
  });
  return vi
    .spyOn(rateLimiter as any, limiter)
    .mockResolvedValueOnce(rateLimitResponse as any);
}
