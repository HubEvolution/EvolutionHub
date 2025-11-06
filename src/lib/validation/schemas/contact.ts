import { z } from '@/lib/validation';

export const contactMessageSchema = z
  .object({
    firstName: z.string().trim().min(1, 'first_name_required').max(100),
    lastName: z.string().trim().min(1, 'last_name_required').max(100),
    email: z.string().email('email_invalid').max(320),
    subject: z.string().trim().min(1, 'subject_required').max(200),
    message: z.string().trim().min(10, 'message_too_short').max(4000),
    consent: z.boolean().refine(Boolean, { message: 'consent_required' }),
    locale: z.enum(['de', 'en']).optional(),
    turnstileToken: z.string().min(10, 'turnstile_missing'),
    source: z.string().trim().max(120).optional(),
  })
  .strict();

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
