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
