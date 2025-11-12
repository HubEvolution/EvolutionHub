'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.contactMessageSchema = void 0;
const validation_1 = require('@/lib/validation');
exports.contactMessageSchema = validation_1.z
  .object({
    firstName: validation_1.z.string().trim().min(1, 'first_name_required').max(100),
    lastName: validation_1.z.string().trim().min(1, 'last_name_required').max(100),
    email: validation_1.z.string().email('email_invalid').max(320),
    subject: validation_1.z.string().trim().min(1, 'subject_required').max(200),
    message: validation_1.z.string().trim().min(10, 'message_too_short').max(4000),
    consent: validation_1.z.boolean().refine(Boolean, { message: 'consent_required' }),
    locale: validation_1.z.enum(['de', 'en']).optional(),
    turnstileToken: validation_1.z.string().min(10, 'turnstile_missing'),
    source: validation_1.z.string().trim().max(120).optional(),
  })
  .strict();
