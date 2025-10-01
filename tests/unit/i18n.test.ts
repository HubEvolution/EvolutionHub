import { describe, it, expect, vi } from 'vitest';
import { getI18n } from '@/utils/i18n';
import { getLocale } from '@/lib/i18n';

// Mock getLocale for consistent testing
vi.mock('@/lib/i18n', () => ({
  getLocale: vi.fn().mockReturnValue('de')
}));

describe('i18n Utils', () => {
  it('should return translation for existing key', () => {
    const t = getI18n('de');
    expect(t('pages.blog.search.title')).toBe('Blog durchsuchen');
  });

  it('should return fallback for non-existing key', () => {
    const t = getI18n('de');
    expect(t('non.existing.key')).toBe('[de:non.existing.key_fallback_not_found]');
  });

  it('should handle pluralization for one', () => {
    const t = getI18n('de');
    expect(t('pages.blog.posts.count', { count: 1 })).toBe('1 Beitrag');
  });

  it('should handle pluralization for other', () => {
    const t = getI18n('de');
    expect(t('pages.blog.posts.count', { count: 5 })).toBe('5 Beiträge');
  });

  it('should fallback to English for unknown locale (simulated)', () => {
    // Simulate an invalid runtime locale by bypassing TS types
    const t = (getI18n as any)('xx');
    expect(t('pages.blog.search.title')).toBe('Search the blog');
  });
  it('should use English plural for en locale', () => {
    vi.mocked(getLocale).mockReturnValue('en');
    const t = getI18n('en');
    expect(t('pages.blog.posts.count', { count: 1 })).toBe('1 post');
    expect(t('pages.blog.posts.count', { count: 5 })).toBe('5 posts');
  });
  it('should handle plural with options for en', () => {
    const t = getI18n('en');
    expect(t('pages.blog.posts.count', { count: 0 })).toBe('0 posts');
  });

  it('login keys exist for de and do not leak fallback markers', () => {
    const t = getI18n('de');
    const keys = [
      'pages.login.form.oauth.github',
      'pages.login.form.or',
      'pages.login.form.no_account_prompt',
      'pages.login.form.register_link',
    ];
    for (const k of keys) {
      const v = t(k);
      expect(typeof v).toBe('string');
      expect(v).not.toContain('_fallback_not_found');
    }
  });

  it('login keys exist for en and do not leak fallback markers', () => {
    const t = getI18n('en');
    const keys = [
      'pages.login.form.oauth.github',
      'pages.login.form.or',
      'pages.login.form.no_account_prompt',
      'pages.login.form.register_link',
    ];
    for (const k of keys) {
      const v = t(k);
      expect(typeof v).toBe('string');
      expect(v).not.toContain('_fallback_not_found');
    }
  });
});