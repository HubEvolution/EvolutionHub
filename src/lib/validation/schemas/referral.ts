import { z } from 'zod';

export const referralVerifyRequestSchema = z.object({
  referredUserId: z.string().trim().min(1),
  subscriptionId: z.string().trim().min(1).optional(),
  rewardTenths: z.number().int().nonnegative().optional(),
});

export type ReferralVerifyRequest = z.infer<typeof referralVerifyRequestSchema>;

export const referralAdminUpdateSchema = z.object({
  referralEventId: z.string().trim().min(1),
  action: z.enum(['mark_paid', 'cancel']),
  reason: z.string().trim().max(500).optional(),
});

export type ReferralAdminUpdateRequest = z.infer<typeof referralAdminUpdateSchema>;
