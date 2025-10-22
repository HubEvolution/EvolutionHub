import { describe, it, expect } from 'vitest';
import { sanitizeReturnTo } from './sanitizeReturnTo';

describe('sanitizeReturnTo', () => {
  it('allows valid path-only values', () => {
    expect(sanitizeReturnTo('/pricing')).toBe('/pricing');
    expect(sanitizeReturnTo('/tools/imag-enhancer')).toBe('/tools/imag-enhancer');
    expect(sanitizeReturnTo('/en/pricing?plan=pro')).toBe('/en/pricing?plan=pro');
    expect(sanitizeReturnTo('/dashboard#billing')).toBe('/dashboard#billing');
  });

  it('rejects empty or non-string', () => {
    expect(sanitizeReturnTo('')).toBe('');
    expect(sanitizeReturnTo(null)).toBe('');
    expect(sanitizeReturnTo(undefined)).toBe('');
  });

  it('rejects absolute URLs and protocols', () => {
    expect(sanitizeReturnTo('https://evil.com/x')).toBe('');
    expect(sanitizeReturnTo('http://example.com/abc')).toBe('');
    expect(sanitizeReturnTo('javascript:alert(1)')).toBe('');
    expect(sanitizeReturnTo('data:text/html,abc')).toBe('');
  });

  it('rejects protocol-relative and non-leading-slash paths', () => {
    expect(sanitizeReturnTo('//evil.com/x')).toBe('');
    expect(sanitizeReturnTo('pricing')).toBe('');
    expect(sanitizeReturnTo(' /pricing')).toBe('');
  });

  it('rejects values with backslashes or CRLF', () => {
    expect(sanitizeReturnTo('/foo\\bar')).toBe('');
    expect(sanitizeReturnTo('/foo%5Cbar')).toBe('/foo%5Cbar');
    expect(sanitizeReturnTo('/a\r\nb')).toBe('');
  });

  it('rejects values longer than 512 chars', () => {
    const long = '/' + 'a'.repeat(600);
    expect(sanitizeReturnTo(long)).toBe('');
  });
});
