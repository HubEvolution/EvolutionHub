declare module '@/lib/rate-limiter' {
  export type ApiRateLimiter = (context: unknown) => Promise<unknown> | unknown;

  export function createRateLimiter(config: any): ApiRateLimiter;
  export function rateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<void>;

  export const standardApiLimiter: ApiRateLimiter;
  export const authLimiter: ApiRateLimiter;
  export const sensitiveActionLimiter: ApiRateLimiter;
  export const apiRateLimiter: ApiRateLimiter;
  export const aiJobsLimiter: ApiRateLimiter;
  export const aiGenerateLimiter: ApiRateLimiter;
  export const voiceTranscribeLimiter: ApiRateLimiter;
}
