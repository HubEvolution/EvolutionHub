import { z } from 'zod';

export const createDiscountCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Code must contain only letters, numbers, hyphens, and underscores'),
  type: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: 'Type must be either percentage or fixed' }),
  }),
  value: z
    .number()
    .int('Value must be an integer')
    .positive('Value must be positive')
    .refine((val) => val > 0, 'Value must be greater than 0'),
  maxUses: z
    .number()
    .int('Max uses must be an integer')
    .positive('Max uses must be positive')
    .optional()
    .nullable(),
  validFrom: z
    .number()
    .int('Valid from must be a timestamp')
    .positive('Valid from must be positive')
    .optional()
    .nullable(),
  validUntil: z
    .number()
    .int('Valid until must be a timestamp')
    .positive('Valid until must be positive')
    .optional()
    .nullable(),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
  status: z.enum(['active', 'inactive', 'expired']).optional().default('active'),
});

export type CreateDiscountCodeRequest = z.infer<typeof createDiscountCodeSchema>;

export const listDiscountCodesQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  limit: z.preprocess((value) => {
    if (value == null || value === '') return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }, z.number().int().min(1).max(100).optional().default(25)),
  cursor: z.string().trim().min(1).optional(),
});

export type ListDiscountCodesQuery = z.infer<typeof listDiscountCodesQuerySchema>;

export const discountCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(50, 'Code must be at most 50 characters'),
});

export type DiscountCodeParam = z.infer<typeof discountCodeParamSchema>;
