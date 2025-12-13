declare module '@/lib/rate-limiter' {
  export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    name?: string;
  }

  export interface RateLimiterContext {
    request: Request;
    clientAddress?: string;
    locals?: unknown;
  }

  export type RateLimiterResult = Response | { success?: boolean } | void;

  export type RateLimiter = (context: RateLimiterContext) => Promise<RateLimiterResult>;

  export function createRateLimiter(config: RateLimitConfig): RateLimiter;
  export function rateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
    options?: {
      env?: Record<string, unknown>;
      kv?: unknown;
      limiterName?: string;
      retry?: { attempts?: number; baseDelayMs?: number };
    }
  ): Promise<void>;
  export function getLimiterState(
    name?: string,
    options?: { env?: Record<string, unknown>; kv?: unknown }
  ): Promise<
    Record<
      string,
      {
        maxRequests: number;
        windowMs: number;
        entries: Array<{ key: string; count: number; resetAt: number }>;
      }
    >
  >;
  export function resetLimiterKey(
    name: string,
    key: string,
    options?: { env?: Record<string, unknown>; kv?: unknown }
  ): Promise<boolean>;

  export type AnyEnv = Record<string, unknown>;

  export const standardApiLimiter: RateLimiter;
  export const authLimiter: RateLimiter;
  export const sensitiveActionLimiter: RateLimiter;
  export const apiRateLimiter: RateLimiter;
  export const aiJobsLimiter: RateLimiter;
  export const aiGenerateLimiter: RateLimiter;
  export const voiceTranscribeLimiter: RateLimiter;
  export const contactFormLimiter: RateLimiter;
  export const webEvalTaskLimiter: RateLimiter;
  export const webEvalBrowserLimiter: RateLimiter;
}

declare module '@/lib/security/csrf' {
  export function ensureCsrfToken(): string;
  export const validateCsrfToken: any;
  export const createCsrfMiddleware: any;
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
  interface DrizzleColumnBuilder {
    $type<T>(): DrizzleColumnBuilder;
    primaryKey(options?: any): DrizzleColumnBuilder;
    notNull(): DrizzleColumnBuilder;
    unique(): DrizzleColumnBuilder;
    default(value: unknown): DrizzleColumnBuilder;
    references(ref: (...args: any[]) => unknown, options?: any): DrizzleColumnBuilder;
  }

  export function sqliteTable(name: string, columns: Record<string, unknown>): any;
  export function text(name: string, config?: any): DrizzleColumnBuilder;
  export function integer(name: string, config?: any): DrizzleColumnBuilder;
}

declare module '@/server/utils/logger-factory' {
  export const loggerFactory: any;
}

declare module 'opentype.js' {
  namespace opentype {
    export interface BoundingBox {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }

    export interface Path {
      toPathData(decimalPlaces?: number): string;
      getBoundingBox(): BoundingBox;
    }

    export interface Glyph {
      advanceWidth?: number;
      getPath(x: number, y: number, fontSize: number): Path;
    }

    export interface Font {
      unitsPerEm: number;
      stringToGlyphs(text: string): Glyph[];
    }

    export function load(url: string): Promise<Font>;
  }

  export default opentype;
}
// Minimal ambient module declarations for src-only typecheck (Phase-1)
// Do not expand unless necessary.

declare module 'astro' {
  export type APIContext = any;
  export type APIRoute = any;
}

declare global {
  interface D1PreparedStatement {
    bind: (...args: any[]) => D1PreparedStatement;
    first<T = unknown>(): Promise<T | null>;
    run<T = unknown>(): Promise<T>;
    all<T = unknown>(): Promise<{ results: T[] }>;
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

declare module '../../tests/utils/kv-mock' {
  import type { KVNamespace } from '@cloudflare/workers-types';

  export interface KVNamespaceMock {
    namespace: KVNamespace;
    getLastWrite(): { key: string; value: string; options?: Record<string, unknown> } | null;
    readRaw(key: string): string | null;
    readJSON<T>(key: string): T | null;
    clear(): void;
  }

  export function createKVNamespaceMock(): KVNamespaceMock;
}

// declare module '@/lib/api-middleware' {
//   export type ApiHandler = (
//     context: import('astro').APIContext
//   ) => Promise<Response> | Response;
//
//   export function withApiMiddleware(handler: ApiHandler, options?: any): ApiHandler;
//   export function withAuthApiMiddleware(handler: ApiHandler, options?: any): ApiHandler;
//   export function withRedirectMiddleware(handler: ApiHandler, options?: any): ApiHandler;
//   export function createApiError(type: string, message?: string, details?: Record<string, unknown>): Response;
//   export function createApiSuccess<T>(data: T, status?: number): Response;
//   export function createMethodNotAllowed(allow: string, message?: string): Response;
// }

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

declare module '@/lib/db/schema' {
  export const comments: any;
  export const commentReports: any;
  export const commentModeration: any;
  export const referralProfiles: any;
  export const referralEvents: any;
}

declare module 'stripe' {
  const Stripe: any;
  export = Stripe;
}

// Local JSX component without TS types
// Provides a minimal type so TS can resolve the JSX import in src-only mode
declare module '@/components/ui/CardReact.jsx' {
  import type { ReactNode } from 'react';
  const CardReact: (props: {
    title?: string;
    className?: string;
    id?: string;
    variant?: 'default' | 'holo';
    children?: ReactNode;
  }) => JSX.Element;
  export default CardReact;
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
  export type Plan = any;
  export type PlanLimits = any;
  export const ALLOWED_MODELS: any[];
  export const ALLOWED_CONTENT_TYPES: any;
  export const MAX_UPLOAD_BYTES: any;
  export const AI_R2_PREFIX: any;
  export const FREE_LIMIT_GUEST: any;
  export const FREE_LIMIT_USER: any;
  export const PLAN_LIMITS: any;
  export const getAiLimitFor: any;
}

declare module 'astro:content' {
  export function __setCollectionData(collectionName: string, entries: any[]): void;
  export function getCollection(
    collectionName: string,
    filter?: (entry: any) => boolean
  ): Promise<any[]>;
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
