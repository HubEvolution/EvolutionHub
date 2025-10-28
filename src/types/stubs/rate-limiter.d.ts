export const apiRateLimiter: any;
export const standardApiLimiter: any;
export function createRateLimiter(config: any): any;
export function rateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<void>;
