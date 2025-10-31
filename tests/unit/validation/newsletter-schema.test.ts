import { describe, it, expect } from 'vitest';
import { newsletterSubscribeSchema } from '@/lib/validation/schemas/newsletter';

describe('newsletterSubscribeSchema', () => {
  it('accepts valid input (email + consent=true)', () => {
    const input = { email: 'user@example.com', consent: true };
    const res = newsletterSubscribeSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const input = { email: 'not-an-email', consent: true };
    const res = newsletterSubscribeSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it('rejects when consent is false', () => {
    const input = { email: 'user@example.com', consent: false } as any;
    const res = newsletterSubscribeSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it('allows optional firstName/source', () => {
    const input = { email: 'a@b.co', consent: true, firstName: 'Max', source: 'website' };
    const res = newsletterSubscribeSchema.safeParse(input);
    expect(res.success).toBe(true);
  });
});
