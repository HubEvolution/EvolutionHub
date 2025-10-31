import { z } from 'zod';

export const newsletterSubscribeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().min(1).max(100).optional(),
  consent: z.literal(true),
  source: z.string().trim().min(1).max(100).optional(),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

export const newsletterUnsubscribeSchema = z.object({
  email: z.string().email(),
});

export type NewsletterUnsubscribeInput = z.infer<typeof newsletterUnsubscribeSchema>;
