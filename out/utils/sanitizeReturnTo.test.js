'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const sanitizeReturnTo_1 = require('./sanitizeReturnTo');
(0, vitest_1.describe)('sanitizeReturnTo', () => {
  (0, vitest_1.it)('allows valid path-only values', () => {
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('/pricing')).toBe('/pricing');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('/tools/imag-enhancer')).toBe(
      '/tools/imag-enhancer'
    );
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('/en/pricing?plan=pro')).toBe(
      '/en/pricing?plan=pro'
    );
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('/dashboard#billing')).toBe(
      '/dashboard#billing'
    );
  });
  (0, vitest_1.it)('rejects empty or non-string', () => {
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('')).toBe('');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)(null)).toBe('');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)(undefined)).toBe('');
  });
  (0, vitest_1.it)('rejects absolute URLs and protocols', () => {
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('https://evil.com/x')).toBe('');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('http://example.com/abc')).toBe(
      ''
    );
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('javascript:alert(1)')).toBe('');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('data:text/html,abc')).toBe('');
  });
  (0, vitest_1.it)('rejects protocol-relative and non-leading-slash paths', () => {
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('//evil.com/x')).toBe('');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('pricing')).toBe('');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)(' /pricing')).toBe('');
  });
  (0, vitest_1.it)('rejects values with backslashes or CRLF', () => {
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('/foo\\bar')).toBe('');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('/foo%5Cbar')).toBe('/foo%5Cbar');
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)('/a\r\nb')).toBe('');
  });
  (0, vitest_1.it)('rejects values longer than 512 chars', () => {
    const long = '/' + 'a'.repeat(600);
    (0, vitest_1.expect)((0, sanitizeReturnTo_1.sanitizeReturnTo)(long)).toBe('');
  });
});
