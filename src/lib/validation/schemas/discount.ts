import { z } from 'zod';

export const discountCodeTypeSchema = z.enum(['percentage', 'fixed']);

export const discountCodeStatusSchema = z.enum(['active', 'inactive', 'expired']);

export const discountCodeResponseSchema = z.object({
  id: z.string().min(1),
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/),
  stripeCouponId: z.string(),
  type: discountCodeTypeSchema,
  value: z.number().int().positive(),
  maxUses: z.number().int().positive().nullable(),
  usesCount: z.number().int().nonnegative(),
  validFrom: z.number().int().nullable(),
  validUntil: z.number().int().nullable(),
  status: discountCodeStatusSchema,
  description: z.string().max(500).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export type DiscountCodeResponse = z.infer<typeof discountCodeResponseSchema>;

export const createDiscountCodeBodySchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/),
    stripeCouponId: z.string().trim().min(1).optional(),
    type: discountCodeTypeSchema,
    value: z.number().int().positive(),
    maxUses: z.number().int().positive().nullable().optional(),
    validFrom: z.number().int().nullable().optional(),
    validUntil: z.number().int().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    status: discountCodeStatusSchema.optional(),
  })
  .strict();

export type CreateDiscountCodeBody = z.infer<typeof createDiscountCodeBodySchema>;

export const listDiscountCodesQuerySchema = z
  .object({
    status: discountCodeStatusSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
    isActiveNow: z.preprocess((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
      }
      return value;
    }, z.boolean().optional()),
    hasRemainingUses: z.preprocess((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
      }
      return value;
    }, z.boolean().optional()),
    limit: z.preprocess((value) => {
      if (value == null || value === '') return undefined;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    }, z.number().int().min(1).max(100).optional()),
    cursor: z.string().trim().min(1).optional(),
  })
  .transform((value) => ({
    status: value.status,
    search: value.search ?? undefined,
    isActiveNow: value.isActiveNow ?? undefined,
    hasRemainingUses: value.hasRemainingUses ?? undefined,
    limit: value.limit ?? 25,
    cursor: value.cursor ?? null,
  }));

export type ListDiscountCodesQuery = z.infer<typeof listDiscountCodesQuerySchema>;

export const createDiscountCodeResponseDataSchema = z.object({
  discountCode: discountCodeResponseSchema,
});

export type CreateDiscountCodeResponseData = z.infer<typeof createDiscountCodeResponseDataSchema>;

export const listDiscountCodesResponseDataSchema = z.object({
  items: z.array(discountCodeResponseSchema),
  pagination: z.object({
    limit: z.number().int().min(1).max(100),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type ListDiscountCodesResponseData = z.infer<typeof listDiscountCodesResponseDataSchema>;
