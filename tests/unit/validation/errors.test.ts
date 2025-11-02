import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { formatZodError } from '@/lib/validation';

describe('formatZodError', () => {
  it('formats field and form errors', () => {
    const schema = z
      .object({
        email: z.string().email(),
        token: z.string().min(4),
      })
      .refine(() => false, { message: 'form-level error' });

    const parsed = schema.safeParse({ email: 'not-an-email', token: 'a' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const formatted = formatZodError(parsed.error);
      expect(formatted.fieldErrors.email?.length).toBeGreaterThan(0);
      expect(formatted.fieldErrors.token?.length).toBeGreaterThan(0);
      expect(formatted.fieldErrors._form?.[0]).toContain('form-level error');
      expect(formatted.issues.length).toBeGreaterThan(0);
      // issues contain path/code/message
      const issue = formatted.issues[0];
      expect(issue).toHaveProperty('path');
      expect(issue).toHaveProperty('code');
      expect(issue).toHaveProperty('message');
    }
  });
});
