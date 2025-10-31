import { describe, it, expect } from 'vitest';
import { promptInputSchema } from '@/lib/validation/schemas/prompt';
import { TEXT_LENGTH_MAX } from '@/config/prompt-enhancer';

describe('promptInputSchema', () => {
  it('accepts minimal valid input', () => {
    const r = promptInputSchema.safeParse({ text: 'Hello world' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.text).toBe('Hello world');
      expect(r.data.mode).toBeUndefined();
    }
  });

  it('rejects empty text', () => {
    const r = promptInputSchema.safeParse({ text: '' });
    expect(r.success).toBe(false);
  });

  it('rejects text exceeding max length', () => {
    const long = 'x'.repeat(TEXT_LENGTH_MAX + 1);
    const r = promptInputSchema.safeParse({ text: long });
    expect(r.success).toBe(false);
  });

  it('accepts known mode values', () => {
    expect(promptInputSchema.parse({ text: 'ok', mode: 'agent' }).mode).toBe('agent');
    expect(promptInputSchema.parse({ text: 'ok', mode: 'concise' }).mode).toBe('concise');
  });

  it('rejects unknown mode values', () => {
    const r = promptInputSchema.safeParse({ text: 'ok', mode: 'fast' });
    expect(r.success).toBe(false);
  });
});
