import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLocale, navigateLocale } from './i18n';
import { getI18n, getI18nArray } from '@/utils/i18n';

describe('i18n', () => {
  describe('getLocale', () => {
    it('should return "de" for paths starting with "/de"', () => {
      expect(getLocale('/de/blog/post')).toBe('de');
      expect(getLocale('/de/tools')).toBe('de');
      expect(getLocale('/de/')).toBe('de');
    });

    it('should return "en" for paths starting with "/en"', () => {
      expect(getLocale('/en/blog/post')).toBe('en');
      expect(getLocale('/en/tools')).toBe('en');
      expect(getLocale('/en/')).toBe('en');
    });

    it('should return "de" for paths not starting with "/de" or "/en"', () => {
      expect(getLocale('/blog/post')).toBe('de');
      expect(getLocale('/tools')).toBe('de');
      expect(getLocale('/')).toBe('de');
    });
  });

  describe('navigateLocale', () => {
    // Mock window.location.assign
    const mockAssign = vi.fn();

    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          assign: mockAssign,
          pathname: '/de/blog/post',
        },
        writable: true,
      });
    });

    afterEach(() => {
      mockAssign.mockReset();
    });

    it('should navigate to English version when current locale is German', () => {
      window.location.pathname = '/de/blog/post';
      navigateLocale('en');
      expect(mockAssign).toHaveBeenCalledWith('/en/blog/post');
    });

    it('should navigate to German version when current locale is English', () => {
      window.location.pathname = '/en/blog/post';
      navigateLocale('de');
      expect(mockAssign).toHaveBeenCalledWith('/blog/post');
    });

    it('should add locale prefix to path without existing locale', () => {
      window.location.pathname = '/blog/post';
      navigateLocale('en');
      expect(mockAssign).toHaveBeenCalledWith('/en/blog/post');
    });

    it('should handle root path correctly', () => {
      window.location.pathname = '/';
      navigateLocale('en');
      expect(mockAssign).toHaveBeenCalledWith('/en/');

      window.location.pathname = '/en/';
      navigateLocale('de');
      expect(mockAssign).toHaveBeenCalledWith('/');
    });
  });

  describe('getI18n', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('returns a translated string for an existing key in the current locale', () => {
      const t = getI18n('en');
      const value = t('pages.dashboard.title');
      expect(typeof value).toBe('string');
      expect(value).not.toMatch(/fallback_not_found/);
    });

    it('formats parameters into the translated string', () => {
      const t = getI18n('en');
      const msg = t('auth.toasts.login_error', { code: 'TEST_CODE' });
      expect(msg).toContain('TEST_CODE');
      expect(msg).not.toMatch(/fallback_not_found/);
    });

    it('supports pluralization based on the count parameter', () => {
      const t = getI18n('en');
      const one = t('pages.dashboard.billing.quota.resets', { count: 1 });
      const many = t('pages.dashboard.billing.quota.resets', { count: 3 });

      expect(one).toContain('1');
      expect(many).toContain('3');
      expect(one).not.toEqual(many);
    });

    it('returns a fallback_not_found marker when the key is missing in all locales', () => {
      const t = getI18n('en');
      const key = 'nonexistent.key.path.for.test';
      const result = t(key);

      expect(result).toBe(`[en:${key}_fallback_not_found]`);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('getI18nArray', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('returns an array for an existing array key', () => {
      const getArray = getI18nArray('en');
      const lines = getArray('pages.home.hero.typewriter_lines');

      expect(Array.isArray(lines)).toBe(true);
      expect(lines.length).toBeGreaterThan(0);
    });

    it('returns an empty array and warns when the key is missing', () => {
      const getArray = getI18nArray('en');
      const result = getArray('nonexistent.array.key');

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
