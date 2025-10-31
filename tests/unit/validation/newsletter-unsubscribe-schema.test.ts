import { describe, it, expect } from 'vitest';
import { newsletterUnsubscribeSchema } from '@/lib/validation/schemas/newsletter';

describe('newsletterUnsubscribeSchema', () => {
  it('accepts valid email', () => {
    const res = newsletterUnsubscribeSchema.safeParse({ email: 'user@example.com' });
    expect(res.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const res = newsletterUnsubscribeSchema.safeParse({ email: 'invalid' });
    expect(res.success).toBe(false);
  });
});
