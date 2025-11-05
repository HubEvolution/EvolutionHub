declare module '@/lib/rate-limiter' {
  export const apiRateLimiter: any;
  export const standardApiLimiter: any;
  export function createRateLimiter(config: any): any;
  export function rateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<void>;
}

declare module '@/lib/security/csrf' {
  export const validateCsrfToken: any;
}

declare module '@/lib/spam-detection' {
  export const checkSpam: any;
}

declare module '@/lib/utils/id-generator' {
  export const generateId: any;
}

declare module '@/lib/security/sanitize' {
  export function sanitizeCommentContent(s: string): string;
}
declare module '@/lib/utils/mime' {
  export const detectImageMimeFromBytes: any;
}

declare module 'drizzle-orm/sqlite-core' {
  export const sqliteTable: any;
  export const text: any;
  export const integer: any;
}

declare module '@/server/utils/logger-factory' {
  export const loggerFactory: any;
}
// Minimal ambient module declarations for src-only typecheck (Phase-1)
// Do not expand unless necessary.

declare module 'astro' {
  export type APIContext = any;
}

declare global {
  interface D1PreparedStatement {
    bind: (...args: any[]) => D1PreparedStatement;
    first: (...args: any[]) => Promise<any>;
    run: (...args: any[]) => Promise<any>;
    all: (...args: any[]) => Promise<any>;
  }
  interface D1Database {
    prepare: (query: string) => D1PreparedStatement;
  }
  interface KVNamespace {
    get: (...args: any[]) => any;
    put: (...args: any[]) => any;
    delete: (...args: any[]) => any;
    list: (...args: any[]) => any;
  }
}

declare module '@cloudflare/workers-types' {
  export interface D1Database extends globalThis.D1Database {}
  export interface KVNamespace extends globalThis.KVNamespace {}
  export interface R2Bucket {
    get: (...args: any[]) => Promise<any>;
    put: (...args: any[]) => Promise<any>;
    delete: (...args: any[]) => Promise<any>;
  }
}

declare module 'drizzle-orm' {
  export const eq: any;
  export const and: any;
  export const desc: any;
  export const count: any;
  export const sql: any;
  export const gte: any;
  export const lte: any;
  export const or: any;
  export const inArray: any;
  export const isNull: any;
}

declare module 'drizzle-orm/d1' {
  export const drizzle: any;
}

declare module '@/lib/api-middleware' {
  export const withApiMiddleware: any;
  export const withAuthApiMiddleware: any;
  export const createApiError: any;
  export const createApiSuccess: any;
  export const createMethodNotAllowed: any;
}

declare module '@/lib/types/comments' {
  export type Comment = any;
  export type CreateCommentRequest = any;
  export type UpdateCommentRequest = any;
  export type CommentModeration = any;
  export type CommentReport = any;
  export type CommentListResponse = any;
  export type CommentStats = any;
  export type ModerateCommentRequest = any;
  export type CommentFilters = any;
  export type ModerationQueueItem = any;
  export type ReportCommentRequest = any;
}

declare module '@/lib/auth-helpers' {
  export const requireAuth: any;
  export const requireModerator: any;
}

declare module '@/lib/security/csrf' {
  export const validateCsrfToken: any;
  export const createCsrfMiddleware: any;
}

declare module '@/lib/db/schema' {
  export const comments: any;
  export const commentReports: any;
  export const commentModeration: any;
}

declare module 'stripe' {
  const Stripe: any;
  export = Stripe;
}

declare module 'hono' {
  export class Hono<T = any> {
    constructor(...args: any[]);
    use: (...args: any[]) => any;
    get: (...args: any[]) => any;
    put: (...args: any[]) => any;
    delete: (...args: any[]) => any;
  }
  export interface Context {
    req: {
      param: (name: string) => string;
      header: (name: string) => string | undefined;
      raw: Request;
      json: <T = any>() => Promise<T>;
    };
    env: any;
    json: (data: any, status?: number) => Response;
  }
}

declare module 'hono/cors' {
  export const cors: (...args: any[]) => any;
  export default cors;
}

declare module 'hono/logger' {
  export const logger: (...args: any[]) => any;
  export default logger;
}

// AI Image + utilities
declare module 'openai' {
  const OpenAI: any;
  export default OpenAI;
}

declare module '@/config/ai-image' {
  export type AllowedModel = any;
  export type OwnerType = any;
  export const ALLOWED_MODELS: any[];
  export const ALLOWED_CONTENT_TYPES: any;
  export const MAX_UPLOAD_BYTES: any;
  export const AI_R2_PREFIX: any;
  export const FREE_LIMIT_GUEST: any;
  export const FREE_LIMIT_USER: any;
}

declare module '@/types/logger' {
  export type ExtendedLogger = any;
}

declare module '@/lib/kv/usage' {
  export const addCreditPackTenths: any;
  export const getCreditsBalanceTenths: any;
  export const incrementDailyRolling: any;
  export const getUsage: any;
  export const rollingDailyKey: any;
  export const legacyMonthlyKey: any;
  export const consumeCreditsTenths: any;
}

declare module '@/lib/response-helpers' {
  export const createSecureErrorResponse: any;
  export const createSecureJsonResponse: any;
  export const createDeprecatedGoneHtml: any;
  export const createDeprecatedGoneJson: any;
}

declare module './provider-error' {
  export const buildProviderError: any;
}
declare module '*provider-error' {
  export const buildProviderError: any;
}

// Comment service relatives
declare module '../utils/id-generator' {
  export const generateId: any;
}
declare module '../rate-limiter' {
  export const rateLimit: any;
}
declare module '../security/csrf' {
  export const validateCsrfToken: any;
}
declare module '../spam-detection' {
  export const checkSpam: any;
}
declare module '../db/schema' {
  export const comments: any;
  export const commentReports: any;
  export const commentModeration: any;
}
declare module '../types/notifications' {
  export type NotificationContext = any;
  export type CommentNotificationData = any;
}
declare module '../types/comments' {
  export type CreateCommentRequest = any;
  export type CommentFilters = any;
}
declare module '../security/sanitize' {
  const x: any;
  export = x;
}

// Stripe webhook helpers
declare module '@/lib/rate-limiter' {
  export const createRateLimiter: any;
}
declare module '@/lib/response-helpers' {
  export const createSecureErrorResponse: any;
  export const createSecureJsonResponse: any;
}
