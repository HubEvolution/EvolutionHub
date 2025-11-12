'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const locale_path_1 = require('./locale-path');
(0, vitest_1.describe)('locale-path helpers', () => {
  (0, vitest_1.describe)('localizePath', () => {
    (0, vitest_1.it)('prefixes english paths with /en', () => {
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', '/blog/slug')).toBe(
        '/en/blog/slug'
      );
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', 'blog/slug')).toBe(
        '/en/blog/slug'
      );
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', '/')).toBe('/en/');
    });
    (0, vitest_1.it)('keeps german paths neutral', () => {
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('de', '/blog/slug')).toBe('/blog/slug');
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('de', '/')).toBe('/');
    });
    (0, vitest_1.it)('does not double-prefix already localized paths', () => {
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', '/en/blog/slug')).toBe(
        '/en/blog/slug'
      );
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('de', '/en/blog/slug')).toBe(
        '/en/blog/slug'
      );
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('de', '/de/blog/slug')).toBe(
        '/de/blog/slug'
      );
    });
    (0, vitest_1.it)('passes through external/hash/query links unchanged', () => {
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', 'https://example.com/blog')).toBe(
        'https://example.com/blog'
      );
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', 'mailto:test@example.com')).toBe(
        'mailto:test@example.com'
      );
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', '#section')).toBe('#section');
      (0, vitest_1.expect)((0, locale_path_1.localizePath)('en', '?q=test')).toBe('?q=test');
    });
  });
  (0, vitest_1.describe)('isLocalizedPath/getPathLocale', () => {
    (0, vitest_1.it)('detects locale in path', () => {
      (0, vitest_1.expect)((0, locale_path_1.isLocalizedPath)('/en/blog')).toBe(true);
      (0, vitest_1.expect)((0, locale_path_1.isLocalizedPath)('/de/blog')).toBe(true);
      (0, vitest_1.expect)((0, locale_path_1.isLocalizedPath)('/blog')).toBe(false);
      (0, vitest_1.expect)((0, locale_path_1.getPathLocale)('/en/blog')).toBe('en');
      (0, vitest_1.expect)((0, locale_path_1.getPathLocale)('/de/blog')).toBe('de');
      (0, vitest_1.expect)((0, locale_path_1.getPathLocale)('/blog')).toBeNull();
    });
  });
  (0, vitest_1.describe)('switchLocalePath', () => {
    (0, vitest_1.it)('switches between locales preserving query/hash', () => {
      // For neutral paths (no locale prefix), switching to EN falls back to /en/
      (0, vitest_1.expect)(
        (0, locale_path_1.switchLocalePath)('en', 'https://site.local/blog?p=1#x')
      ).toBe('/en/?p=1#x');
      (0, vitest_1.expect)(
        (0, locale_path_1.switchLocalePath)('de', 'https://site.local/en/blog?p=1#x')
      ).toBe('/blog?p=1#x');
    });
    (0, vitest_1.it)('for neutral paths, going to en hops to /en/', () => {
      (0, vitest_1.expect)((0, locale_path_1.switchLocalePath)('en', '/')).toBe('/en/');
      (0, vitest_1.expect)((0, locale_path_1.switchLocalePath)('de', '/')).toBe('/');
    });
  });
});
