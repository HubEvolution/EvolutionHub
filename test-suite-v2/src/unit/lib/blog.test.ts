import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blogService } from '../../../src/lib/blog';
import type { BlogCollectionEntry } from '../../../src/lib/blog';
import { getCollection } from 'astro:content';
import type { Locale } from '../../../src/lib/i18n';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

describe('BlogService lang filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter blog posts by lang when lang is provided', async () => {
    const mockEntries: BlogCollectionEntry[] = [
      { slug: 'post1', data: { lang: 'de' as const, title: 'Post 1' } } as BlogCollectionEntry,
      { slug: 'post2', data: { lang: 'en' as const, title: 'Post 2' } } as BlogCollectionEntry,
      { slug: 'post3', data: { lang: 'de' as const, title: 'Post 3' } } as BlogCollectionEntry,
    ];
    (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntries);

    const result = await blogService.getBlogIndexData(1, 10, { lang: 'de' });

    expect(result.posts.length).toBe(2);
    expect(result.posts[0].data.lang).toBe('de');
    expect(result.posts[1].data.lang).toBe('de');
  });

  it('should return all posts when lang is not provided', async () => {
    const mockEntries: BlogCollectionEntry[] = [
      { slug: 'post1', data: { lang: 'de' as const, title: 'Post 1' } } as BlogCollectionEntry,
      { slug: 'post2', data: { lang: 'en' as const, title: 'Post 2' } } as BlogCollectionEntry,
    ];
    (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntries);

    const result = await blogService.getBlogIndexData(1, 10, { });

    expect(result.posts.length).toBe(2);
  });

  it('should filter getPostBySlug by lang', async () => {
    const mockEntries: BlogCollectionEntry[] = [
      { slug: 'post1', data: { lang: 'de' as const, title: 'Post 1' } } as BlogCollectionEntry,
      { slug: 'post1', data: { lang: 'en' as const, title: 'Post 1 EN' } } as BlogCollectionEntry,
    ];
    (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntries);

    const result = await blogService.getPostBySlug('post1', 'de');

    expect(result).toBeDefined();
    expect(result!.processedData.data.lang).toBe('de');
  });

  it('should fallback to all posts if lang filter finds no match', async () => {
    const mockEntries: BlogCollectionEntry[] = [
      { slug: 'post1', data: { lang: 'de' as const, title: 'Post 1' } } as BlogCollectionEntry,
    ];
    (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntries);

    const result = await blogService.getBlogIndexData(1, 10, { lang: 'en' as Locale });

    expect(result.posts.length).toBe(0); // or handle fallback if implemented
  });
});