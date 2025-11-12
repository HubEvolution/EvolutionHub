'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const i18n_1 = require('./i18n');
(0, vitest_1.describe)('i18n', () => {
  (0, vitest_1.describe)('getLocale', () => {
    (0, vitest_1.it)('should return "de" for paths starting with "/de"', () => {
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/de/blog/post')).toBe('de');
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/de/tools')).toBe('de');
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/de/')).toBe('de');
    });
    (0, vitest_1.it)('should return "en" for paths starting with "/en"', () => {
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/en/blog/post')).toBe('en');
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/en/tools')).toBe('en');
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/en/')).toBe('en');
    });
    (0, vitest_1.it)('should return "de" for paths not starting with "/de" or "/en"', () => {
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/blog/post')).toBe('de');
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/tools')).toBe('de');
      (0, vitest_1.expect)((0, i18n_1.getLocale)('/')).toBe('de');
    });
  });
  (0, vitest_1.describe)('navigateLocale', () => {
    // Mock window.location.assign
    const mockAssign = vitest_1.vi.fn();
    (0, vitest_1.beforeEach)(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          assign: mockAssign,
          pathname: '/de/blog/post',
        },
        writable: true,
      });
    });
    (0, vitest_1.afterEach)(() => {
      mockAssign.mockReset();
    });
    (0, vitest_1.it)('should navigate to English version when current locale is German', () => {
      window.location.pathname = '/de/blog/post';
      (0, i18n_1.navigateLocale)('en');
      (0, vitest_1.expect)(mockAssign).toHaveBeenCalledWith('/en/blog/post');
    });
    (0, vitest_1.it)('should navigate to German version when current locale is English', () => {
      window.location.pathname = '/en/blog/post';
      (0, i18n_1.navigateLocale)('de');
      (0, vitest_1.expect)(mockAssign).toHaveBeenCalledWith('/blog/post');
    });
    (0, vitest_1.it)('should add locale prefix to path without existing locale', () => {
      window.location.pathname = '/blog/post';
      (0, i18n_1.navigateLocale)('en');
      (0, vitest_1.expect)(mockAssign).toHaveBeenCalledWith('/en/blog/post');
    });
    (0, vitest_1.it)('should handle root path correctly', () => {
      window.location.pathname = '/';
      (0, i18n_1.navigateLocale)('en');
      (0, vitest_1.expect)(mockAssign).toHaveBeenCalledWith('/en/');
      window.location.pathname = '/en/';
      (0, i18n_1.navigateLocale)('de');
      (0, vitest_1.expect)(mockAssign).toHaveBeenCalledWith('/');
    });
  });
});
