import { describe, it, expect } from 'vitest';
import { dashboardActionSchema } from '@/lib/validation/schemas/dashboard';

describe('dashboardActionSchema', () => {
  it('accepts create_project', () => {
    const res = dashboardActionSchema.safeParse({ action: 'create_project' });
    expect(res.success).toBe(true);
  });

  it('accepts view_docs', () => {
    const res = dashboardActionSchema.safeParse({ action: 'view_docs' });
    expect(res.success).toBe(true);
  });

  it('rejects invalid action', () => {
    const res = dashboardActionSchema.safeParse({ action: 'unknown' } as any);
    expect(res.success).toBe(false);
  });

  it('rejects missing action', () => {
    const res = dashboardActionSchema.safeParse({} as any);
    expect(res.success).toBe(false);
  });
});
