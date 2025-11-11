export const apiRateLimiter: any;
export const standardApiLimiter: any;
export function createRateLimiter(config: any): any;
export function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
  options?: {
    env?: Record<string, unknown>;
    kv?: any;
    limiterName?: string;
    retry?: { attempts?: number; baseDelayMs?: number };
  }
): Promise<void>;
