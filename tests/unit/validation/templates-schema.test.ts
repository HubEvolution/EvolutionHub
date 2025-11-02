import { describe, it, expect } from 'vitest';
import { templateSaveSchema } from '@/lib/validation/schemas/templates';

describe('templateSaveSchema', () => {
  it('accepts valid input', () => {
    const res = templateSaveSchema.safeParse({
      templateId: 't1',
      name: 'My Template',
      description: 'Some description',
      prompt: 'Write a concise summary.',
    });
    expect(res.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const res = templateSaveSchema.safeParse({ name: 'X' } as any);
    expect(res.success).toBe(false);
  });

  it('rejects empty strings', () => {
    const res = templateSaveSchema.safeParse({
      templateId: '',
      name: '',
      description: '',
      prompt: '',
    });
    expect(res.success).toBe(false);
  });
});
