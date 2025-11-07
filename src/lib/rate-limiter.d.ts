declare module '@/lib/rate-limiter' {
  export type RateLimiter = (context: unknown) => Promise<unknown> | unknown;

  export function createRateLimiter(config: any): RateLimiter;
  export function rateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<void>;
  export function getLimiterState(name?: string): Record<string, unknown>;
  export function resetLimiterKey(name: string, key: string): boolean;

  export const standardApiLimiter: RateLimiter;
  export const authLimiter: RateLimiter;
  export const sensitiveActionLimiter: RateLimiter;
  export const apiRateLimiter: RateLimiter;
  export const aiJobsLimiter: RateLimiter;
  export const aiGenerateLimiter: RateLimiter;
  export const voiceTranscribeLimiter: RateLimiter;
  export const contactFormLimiter: RateLimiter;
}
