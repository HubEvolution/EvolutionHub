import { z } from 'zod';
import type { CommentSearchOptions, PaginationOptions } from '@/lib/types/performance';

const commentStatusValues = ['pending', 'approved', 'rejected', 'flagged', 'hidden'] as const;
const commentEntityTypes = ['blog_post', 'project', 'general'] as const;

function coerceSearchParam(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return value === '' ? undefined : value;
}

function coerceBooleanParam(value: unknown): boolean | undefined {
  const coerced = coerceSearchParam(value);
  if (coerced === undefined) return undefined;
  const normalized = String(coerced).toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return undefined;
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '')))
      .filter((item) => item.length > 0);
  }
  const single = coerceSearchParam(value);
  if (typeof single === 'string' && single.trim().length > 0) {
    return [single.trim()];
  }
  return [];
}

function coerceNumberParam(
  value: unknown,
  { min, max }: { min?: number; max?: number } = {}
): number | undefined {
  const coerced = coerceSearchParam(value);
  if (coerced === undefined) return undefined;
  const numeric = Number(coerced);
  if (!Number.isFinite(numeric)) return undefined;
  let result = Math.trunc(numeric);
  if (typeof min === 'number') result = Math.max(min, result);
  if (typeof max === 'number') result = Math.min(max, result);
  return result;
}

function coerceNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const numeric = Number(item);
        return Number.isFinite(numeric) ? Math.trunc(numeric) : undefined;
      })
      .filter((item): item is number => typeof item === 'number');
  }
  const single = coerceSearchParam(value);
  if (single === undefined) return [];
  const numeric = Number(single);
  return Number.isFinite(numeric) ? [Math.trunc(numeric)] : [];
}

const performanceSortFields = ['createdAt', 'updatedAt', 'likes', 'replies'] as const;
const performanceSortOrders = ['asc', 'desc'] as const;

export const recentCommentsQuerySchema = z
  .object({
    limit: z
      .preprocess(coerceSearchParam, z.coerce.number().int().min(1).max(10))
      .optional(),
  })
  .transform(({ limit }) => ({ limit: limit ?? 5 }));

export const commentListQuerySchema = z
  .object({
    status: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        return v === undefined ? undefined : v;
      }, z.enum(commentStatusValues).optional())
      .optional(),
    entityType: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        return v === undefined ? undefined : v;
      }, z.enum(commentEntityTypes).optional())
      .optional(),
    entityId: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        if (typeof v === 'string' && v.trim().length > 0) {
          return v.trim();
        }
        return undefined;
      }, z.string().optional())
      .optional(),
    authorId: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        if (typeof v === 'string' && v.trim().length > 0) {
          return v.trim();
        }
        return undefined;
      }, z.string().optional())
      .optional(),
    limit: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        if (v === undefined) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : NaN;
      }, z.number().int().min(1).max(100).optional())
      .optional(),
    offset: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        if (v === undefined) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : NaN;
      }, z.number().int().min(0).max(10000).optional())
      .optional(),
    includeReplies: z
      .preprocess(coerceBooleanParam, z.boolean().optional())
      .optional(),
    debug: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        return v === undefined ? undefined : String(v);
      }, z.literal('1').optional())
      .optional(),
  })
  .transform((value) => ({
    status: value.status,
    entityType: value.entityType,
    entityId: value.entityId,
    authorId: value.authorId,
    limit: value.limit ?? 20,
    offset: value.offset ?? 0,
    includeReplies: value.includeReplies ?? true,
    debug: value.debug === '1',
  }));

export const commentCountQuerySchema = z
  .object({
    entityType: z.preprocess(
      (value) => {
        const v = coerceSearchParam(value);
        return v === undefined ? undefined : v;
      },
      z.enum(commentEntityTypes)
    ),
    entityId: z
      .preprocess(coerceStringArray, z.array(z.string().min(1)).min(1))
      .transform((value) => value),
    debug: z
      .preprocess((value) => {
        const v = coerceSearchParam(value);
        return v === undefined ? undefined : String(v);
      }, z.literal('1').optional())
      .optional(),
  })
  .transform((value) => ({
    entityType: value.entityType,
    entityIds: value.entityId,
    debug: value.debug === '1',
  }));

export const commentCreateSchema = z
  .object({
    content: z.string().min(3).max(2000),
    entityType: z.enum(commentEntityTypes),
    entityId: z.string().min(1),
    parentId: z.string().min(1).optional(),
    authorName: z.string().trim().min(1).optional(),
    authorEmail: z.string().email().optional(),
  })
  .strict();

export const commentUpdateSchema = z
  .object({
    content: z.string().min(3).max(2000),
  })
  .strict();

export const commentIdParamSchema = z
  .object({
    id: z.string().trim().min(1, 'Comment ID required'),
  })
  .strict();

export const commentPerformancePostIdParamSchema = z
  .object({
    postId: z.string().trim().min(1, 'Post ID required'),
  })
  .strict();

export const commentPerformancePaginationQuerySchema = z
  .object({
    page: z
      .preprocess((value) => coerceNumberParam(value, { min: 1 }), z.number().int().min(1).default(1))
      .optional(),
    limit: z
      .preprocess(
        (value) => coerceNumberParam(value, { min: 1, max: 100 }),
        z.number().int().min(1).max(100).default(20)
      )
      .optional(),
    sortBy: z
      .preprocess(
        (value) => {
          const coerced = coerceSearchParam(value);
          if (coerced === undefined) return undefined;
          const normalized = String(coerced) as (typeof performanceSortFields)[number];
          return performanceSortFields.includes(normalized) ? normalized : undefined;
        },
        z.enum(performanceSortFields).default('createdAt')
      )
      .optional(),
    sortOrder: z
      .preprocess(
        (value) => {
          const coerced = coerceSearchParam(value);
          if (coerced === undefined) return undefined;
          const normalized = String(coerced) as (typeof performanceSortOrders)[number];
          return performanceSortOrders.includes(normalized) ? normalized : undefined;
        },
        z.enum(performanceSortOrders).default('desc')
      )
      .optional(),
    includeReplies: z
      .preprocess(coerceBooleanParam, z.boolean().default(false))
      .optional(),
    maxDepth: z
      .preprocess(
        (value) => coerceNumberParam(value, { min: 1, max: 10 }),
        z.number().int().min(1).max(10).default(5)
      )
      .optional(),
  })
  .strict()
  .transform((value) => ({
    page: value.page ?? 1,
    limit: value.limit ?? 20,
    sortBy: (value.sortBy ?? 'createdAt') as PaginationOptions['sortBy'],
    sortOrder: (value.sortOrder ?? 'desc') as PaginationOptions['sortOrder'],
    includeReplies: value.includeReplies ?? false,
    maxDepth: value.maxDepth ?? 5,
  })) satisfies z.ZodType<PaginationOptions>;

export const commentPerformanceSearchQuerySchema = z
  .object({
    q: z
      .preprocess((value) => {
        const coerced = coerceSearchParam(value);
        if (coerced === undefined) return undefined;
        const trimmed = String(coerced).trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }, z.string().min(1, 'Search query is required'))
      .default(''),
    page: z
      .preprocess((value) => coerceNumberParam(value, { min: 1 }), z.number().int().min(1).default(1))
      .optional(),
    limit: z
      .preprocess(
        (value) => coerceNumberParam(value, { min: 1, max: 50 }),
        z.number().int().min(1).max(50).default(20)
      )
      .optional(),
    status: z
      .preprocess((value) => coerceStringArray(value), z.array(z.string()).max(5).default(['approved']))
      .optional(),
    authorId: z
      .preprocess((value) => coerceNumberArray(value), z.array(z.number().int().positive()).max(10).default([]))
      .optional(),
    dateFrom: z
      .preprocess((value) => coerceNumberParam(value), z.number().int().positive().optional())
      .optional(),
    dateTo: z
      .preprocess((value) => coerceNumberParam(value), z.number().int().positive().optional())
      .optional(),
    hasReplies: z.preprocess(coerceBooleanParam, z.boolean().optional()).optional(),
    minLikes: z
      .preprocess((value) => coerceNumberParam(value, { min: 0 }), z.number().int().min(0).optional())
      .optional(),
  })
  .strict()
  .transform((value) => ({
    query: value.q,
    pagination: {
      page: value.page ?? 1,
      limit: value.limit ?? 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } satisfies PaginationOptions,
    filters: {
      status: value.status && value.status.length > 0 ? value.status : ['approved'],
      authorId: value.authorId && value.authorId.length > 0 ? value.authorId : undefined,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
      hasReplies: value.hasReplies,
      minLikes: value.minLikes,
    } satisfies CommentSearchOptions['filters'],
    highlight: true as const,
  })) satisfies z.ZodType<CommentSearchOptions>;

export const commentPerformanceBatchQuerySchema = z
  .object({
    page: z
      .preprocess((value) => coerceNumberParam(value, { min: 1 }), z.number().int().min(1).default(1))
      .optional(),
    limit: z
      .preprocess(
        (value) => coerceNumberParam(value, { min: 1, max: 50 }),
        z.number().int().min(1).max(50).default(10)
      )
      .optional(),
    offset: z
      .preprocess((value) => coerceNumberParam(value, { min: 0 }), z.number().int().min(0).default(0))
      .optional(),
    includeReplies: z
      .preprocess(coerceBooleanParam, z.boolean().default(false))
      .optional(),
  })
  .strict()
  .transform((value) => ({
    page: value.page ?? 1,
    limit: value.limit ?? 10,
    offset: value.offset ?? 0,
    includeReplies: value.includeReplies ?? false,
  }));

export type RecentCommentsQueryInput = z.input<typeof recentCommentsQuerySchema>;
export type RecentCommentsQueryParams = z.infer<typeof recentCommentsQuerySchema>;
export type CommentListQueryParams = z.infer<typeof commentListQuerySchema>;
export type CommentCountQueryParams = z.infer<typeof commentCountQuerySchema>;
export type CommentCreateInput = z.input<typeof commentCreateSchema>;
export type CommentCreatePayload = z.infer<typeof commentCreateSchema>;
export type CommentUpdateInput = z.input<typeof commentUpdateSchema>;
export type CommentUpdatePayload = z.infer<typeof commentUpdateSchema>;
export type CommentIdParamInput = z.input<typeof commentIdParamSchema>;
export type CommentIdParam = z.infer<typeof commentIdParamSchema>;
export type CommentPerformancePostIdParam = z.infer<typeof commentPerformancePostIdParamSchema>;
export type CommentPerformancePaginationQuery = z.infer<typeof commentPerformancePaginationQuerySchema>;
export type CommentPerformanceSearchQuery = z.infer<typeof commentPerformanceSearchQuerySchema>;
export type CommentPerformanceBatchQuery = z.infer<typeof commentPerformanceBatchQuerySchema>;
