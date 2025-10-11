import { describe, it, expect } from 'vitest';
import {
  localizePath,
  switchLocalePath,
  isLocalizedPath,
  getPathLocale,
} from '../../../../src/lib/locale-path';

describe('locale-path helpers', () => {
  describe('localizePath', () => {
    it('prefixes english paths with /en', () => {
      expect(localizePath('en', '/blog/slug')).toBe('/en/blog/slug');
      expect(localizePath('en', 'blog/slug')).toBe('/en/blog/slug');
      expect(localizePath('en', '/')).toBe('/en/');
    });

    it('keeps german paths neutral', () => {
      expect(localizePath('de', '/blog/slug')).toBe('/blog/slug');
      expect(localizePath('de', '/')).toBe('/');
    });

    it('does not double-prefix already localized paths', () => {
      expect(localizePath('en', '/en/blog/slug')).toBe('/en/blog/slug');
      expect(localizePath('de', '/en/blog/slug')).toBe('/en/blog/slug');
      expect(localizePath('de', '/de/blog/slug')).toBe('/de/blog/slug');
    });

    it('passes through external/hash/query links unchanged', () => {
      expect(localizePath('en', 'https://example.com/blog')).toBe('https://example.com/blog');
      expect(localizePath('en', 'mailto:test@example.com')).toBe('mailto:test@example.com');
      expect(localizePath('en', '#section')).toBe('#section');
      expect(localizePath('en', '?q=test')).toBe('?q=test');
    });
  });

  describe('isLocalizedPath/getPathLocale', () => {
    it('detects locale in path', () => {
      expect(isLocalizedPath('/en/blog')).toBe(true);
      expect(isLocalizedPath('/de/blog')).toBe(true);
      expect(isLocalizedPath('/blog')).toBe(false);

      expect(getPathLocale('/en/blog')).toBe('en');
      expect(getPathLocale('/de/blog')).toBe('de');
      expect(getPathLocale('/blog')).toBeNull();
    });
  });

  describe('switchLocalePath', () => {
    it('switches between locales preserving query/hash', () => {
      // For neutral paths (no locale prefix), switching to EN falls back to /en/
      expect(switchLocalePath('en', 'https://site.local/blog?p=1#x')).toBe('/en/?p=1#x');
      expect(switchLocalePath('de', 'https://site.local/en/blog?p=1#x')).toBe('/blog?p=1#x');
    });

    it('for neutral paths, going to en hops to /en/', () => {
      expect(switchLocalePath('en', '/')).toBe('/en/');
      expect(switchLocalePath('de', '/')).toBe('/');
    });
  });
});
