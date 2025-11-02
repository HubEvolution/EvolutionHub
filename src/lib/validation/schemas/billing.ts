import { z } from 'zod';

export const billingCreditsRequestSchema = z.object({
  pack: z.union([z.literal(100), z.literal(500), z.literal(1500)]),
  workspaceId: z.string().trim().min(1).max(100).optional(),
  returnTo: z.string().trim().max(300).optional(),
});

export type BillingCreditsRequest = z.infer<typeof billingCreditsRequestSchema>;

export const billingCancelRequestSchema = z.object({
  subscriptionId: z.string().trim().min(1),
});

export type BillingCancelRequest = z.infer<typeof billingCancelRequestSchema>;
