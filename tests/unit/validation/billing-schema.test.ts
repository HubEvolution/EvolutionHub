import { describe, it, expect } from 'vitest';
import { billingCreditsRequestSchema } from '@/lib/validation/schemas/billing';

describe('billingCreditsRequestSchema', () => {
  it('accepts pack 200', () => {
    const res = billingCreditsRequestSchema.safeParse({ pack: 200 });
    expect(res.success).toBe(true);
  });

  it('accepts pack 1000 with optional fields', () => {
    const res = billingCreditsRequestSchema.safeParse({
      pack: 1000,
      workspaceId: 'ws_123',
      returnTo: '/dashboard'
    });
    expect(res.success).toBe(true);
  });

  it('rejects other pack values', () => {
    const res = billingCreditsRequestSchema.safeParse({ pack: 300 } as any);
    expect(res.success).toBe(false);
  });
});
