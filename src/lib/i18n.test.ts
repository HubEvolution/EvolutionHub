import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLocale, navigateLocale } from './i18n';

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
          pathname: '/de/blog/post'
        },
        writable: true
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
});