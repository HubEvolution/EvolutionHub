import { describe, it, expect } from 'vitest';
import { webscraperRequestSchema } from '@/lib/validation/schemas/webscraper';

describe('webscraperRequestSchema', () => {
  it('accepts valid https URL', () => {
    const r = webscraperRequestSchema.safeParse({ url: 'https://example.com/page' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.url).toBe('https://example.com/page');
  });

  it('rejects non-http protocol', () => {
    const r = webscraperRequestSchema.safeParse({ url: 'ftp://example.com' });
    expect(r.success).toBe(false);
  });

  it('rejects localhost URL', () => {
    const r = webscraperRequestSchema.safeParse({ url: 'http://localhost:3000' });
    expect(r.success).toBe(false);
  });

  it('rejects private IP URL', () => {
    const r = webscraperRequestSchema.safeParse({ url: 'http://192.168.1.1' });
    expect(r.success).toBe(false);
  });
});
