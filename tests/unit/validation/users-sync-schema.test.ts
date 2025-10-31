import { describe, it, expect } from 'vitest';
import { internalUserSyncSchema } from '@/lib/validation/schemas/users';

describe('internalUserSyncSchema', () => {
  it('accepts minimal payload', () => {
    const res = internalUserSyncSchema.safeParse({ id: 'u1', email: 'u1@example.com' });
    expect(res.success).toBe(true);
  });

  it('rejects missing id', () => {
    const res = internalUserSyncSchema.safeParse({ email: 'u1@example.com' } as any);
    expect(res.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const res = internalUserSyncSchema.safeParse({ id: 'u1', email: 'invalid' });
    expect(res.success).toBe(false);
  });
});
