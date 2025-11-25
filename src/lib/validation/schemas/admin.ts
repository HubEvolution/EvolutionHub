import { z } from 'zod';

export const adminSetPlanRequestSchema = z
  .object({
    email: z.string().email().trim().optional(),
    userId: z.string().trim().min(1).optional(),
    plan: z.enum(['free', 'pro', 'premium', 'enterprise']),
    reason: z.string().trim().max(500).optional(),
    interval: z.enum(['monthly', 'annual']).optional(),
    prorationBehavior: z.enum(['create_prorations', 'none']).optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
    cancelImmediately: z.boolean().optional(),
  })
  .refine((v) => !!v.email !== !!v.userId, {
    message: 'Provide exactly one of email or userId',
    path: ['email'],
  });

export type AdminSetPlanRequest = z.infer<typeof adminSetPlanRequestSchema>;

export const adminUserListQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(['active', 'banned', 'deleted']).optional(),
    plan: z.enum(['free', 'pro', 'premium', 'enterprise']).optional(),
    limit: z.preprocess((value) => {
      if (value == null || value === '') return undefined;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    }, z.number().int().min(1).max(100).optional()),
    cursor: z.string().trim().min(1).optional(),
  })
  .transform((value) => ({
    search: typeof value.search === 'string' ? value.search.toLowerCase() : undefined,
    status: value.status,
    plan: value.plan,
    limit: value.limit ?? 25,
    cursor: value.cursor,
  }));

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminUserLifecycleRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  sendEmail: z.boolean().optional(),
});

export type AdminUserLifecycleRequest = z.infer<typeof adminUserLifecycleRequestSchema>;

export const adminWebEvalTasksQuerySchema = z
  .object({
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'aborted']).optional(),
    ownerType: z.enum(['user', 'guest', 'system']).optional(),
    ownerId: z.string().trim().min(1).max(128).optional(),
    limit: z.preprocess((value) => {
      if (value == null || value === '') return undefined;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    }, z.number().int().min(1).max(50).optional()),
    cursor: z.string().trim().min(1).optional(),
  })
  .transform((value) => ({
    status: value.status,
    ownerType: value.ownerType,
    ownerId: value.ownerId,
    limit: value.limit ?? 25,
    cursor: value.cursor,
  }));

export type AdminWebEvalTasksQuery = z.infer<typeof adminWebEvalTasksQuerySchema>;
