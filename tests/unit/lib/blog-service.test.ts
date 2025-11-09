import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlogService } from '@/lib/blog';

type MockEntry = {
  fields: {
    slug: string;
    publishDate: string;
    updatedDate?: string;
    lang?: 'de' | 'en';
    title: string;
    description: string;
    draft: boolean;
    category: string;
    tags: string[];
    featured: boolean;
  };
};

type EntryOverrides = Partial<MockEntry['fields']>;

const getEntriesMock = vi.hoisted(() => vi.fn());
const mapEntryToBlogPostMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/contentful', () => {
  return {
    getContentfulClient: () => ({ getEntries: getEntriesMock }),
    mapEntryToBlogPost: mapEntryToBlogPostMock,
  };
});

const makeEntry = (slug: string, overrides: EntryOverrides = {}): MockEntry => ({
  fields: {
    slug,
    publishDate: overrides.publishDate ?? '2025-01-01T00:00:00.000Z',
    updatedDate: overrides.updatedDate,
    lang: overrides.lang,
    title: overrides.title ?? slug,
    description: overrides.description ?? `${slug} description`,
    draft: overrides.draft ?? false,
    category: overrides.category ?? 'general',
    tags: overrides.tags ?? [],
    featured: overrides.featured ?? false,
  },
});

const toProcessed = (entry: MockEntry) => ({
  id: `id-${entry.fields.slug}`,
  slug: entry.fields.slug,
  body: '',
  data: {
    title: entry.fields.title,
    pubDate: new Date(entry.fields.publishDate),
    updatedDate: entry.fields.updatedDate ? new Date(entry.fields.updatedDate) : undefined,
    category: entry.fields.category,
    tags: entry.fields.tags,
    featured: entry.fields.featured,
    draft: entry.fields.draft,
    description: entry.fields.description,
    author: 'Test Author',
    lang: entry.fields.lang,
  },
  readingTime: { text: '1 min read', minutes: 1, time: 60000, words: 200 },
  formattedPubDate: '2025-01-01',
});

const mockContentfulEntries = (entries: MockEntry[]) => {
  getEntriesMock.mockResolvedValue({ items: entries } as unknown);
  mapEntryToBlogPostMock.mockImplementation((entry: MockEntry) => toProcessed(entry));
};

describe('BlogService content filtering', () => {
  beforeEach(() => {
    getEntriesMock.mockReset();
    mapEntryToBlogPostMock.mockReset();
  });

  it('filters posts by provided lang option', async () => {
    const entries = [
      makeEntry('post-de-1', { lang: 'de', updatedDate: '2025-10-03T00:00:00.000Z' }),
      makeEntry('post-en-1', { lang: 'en', updatedDate: '2025-10-05T00:00:00.000Z' }),
      makeEntry('post-de-2', { lang: 'de', updatedDate: '2025-10-01T00:00:00.000Z' }),
    ];
    mockContentfulEntries(entries);

    const service = new BlogService();
    const { posts } = await service.getBlogIndexData(1, 10, { lang: 'de' });

    expect(posts).toHaveLength(2);
    expect(posts.every((post) => post.data.lang === 'de')).toBe(true);
  });

  it('returns all posts when no lang filter is provided', async () => {
    const entries = [
      makeEntry('post-de-1', { lang: 'de', updatedDate: '2025-09-03T00:00:00.000Z' }),
      makeEntry('post-en-1', { lang: 'en', updatedDate: '2025-10-05T00:00:00.000Z' }),
      makeEntry('post-de-2', { lang: 'de', updatedDate: '2025-08-01T00:00:00.000Z' }),
    ];
    mockContentfulEntries(entries);

    const service = new BlogService();
    const { posts } = await service.getBlogIndexData(1, 10);

    expect(posts).toHaveLength(3);
    expect(posts.map((post) => post.slug)).toEqual(['post-en-1', 'post-de-1', 'post-de-2']);
  });

  it('returns empty list when lang filter has no matches', async () => {
    const entries = [
      makeEntry('post-de-1', { lang: 'de' }),
      makeEntry('post-de-2', { lang: 'de' }),
    ];
    mockContentfulEntries(entries);

    const service = new BlogService();
    const { posts } = await service.getBlogIndexData(1, 10, { lang: 'en' });

    expect(posts).toHaveLength(0);
  });

  it('resolves post data by slug via getPostBySlug', async () => {
    const entries = [
      makeEntry('post-one', { lang: 'de', title: 'Post One' }),
      makeEntry('post-two', { lang: 'en', title: 'Post Two' }),
    ];
    mockContentfulEntries(entries);

    const service = new BlogService();
    const result = await service.getPostBySlug('post-two');

    expect(result).toBeDefined();
    expect(result?.entry.fields.slug).toBe('post-two');
    expect(result?.processedData.slug).toBe('post-two');
    expect(result?.processedData.data.lang).toBe('en');
  });
});
