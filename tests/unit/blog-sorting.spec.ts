import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock astro:content before importing modules that use it
const sampleEntries = [
  {
    id: 'post-1',
    slug: 'old-post',
    body: 'Old body',
    data: {
      title: 'Old',
      description: 'Old desc',
      pubDate: new Date('2024-01-01'),
      updatedDate: new Date('2024-03-01'),
      category: 'New Work',
      tags: ['legacy'],
      featured: false,
      draft: false,
    },
    render: async () => ({ Content: () => null }),
  },
  {
    id: 'post-2',
    slug: 'new-published',
    body: 'New published body',
    data: {
      title: 'NewPublished',
      description: 'NewPublished desc',
      pubDate: new Date('2025-10-10'),
      category: 'New Work',
      tags: ['news'],
      featured: false,
      draft: false,
    },
    render: async () => ({ Content: () => null }),
  },
  {
    id: 'post-3',
    slug: 'updated-new',
    body: 'Updated new body',
    data: {
      title: 'UpdatedNew',
      description: 'UpdatedNew desc',
      pubDate: new Date('2025-10-01'),
      updatedDate: new Date('2025-10-18'),
      category: 'New Work',
      tags: ['produktivitt'],
      featured: false,
      draft: false,
    },
    render: async () => ({ Content: () => null }),
  },
];

vi.mock('astro:content', () => {
  return {
    getCollection: vi.fn(async (_collectionName: 'blog', filter?: (entry: any) => boolean) => {
      const entries = [...sampleEntries];
      return typeof filter === 'function' ? entries.filter(filter) : entries;
    }),
  };
});

// Mock content config to avoid importing schema that references 'astro:content' z
vi.mock('@/content/config', () => {
  return {
    formatDate: (d: any) => {
      try {
        return new Date(d).toISOString().slice(0, 10);
      } catch {
        return String(d);
      }
    },
  };
});

import { ContentService } from '@/lib/content';
import { BlogService } from '@/lib/blog';

describe('Blog sorting by updatedDate ?? pubDate (desc)', () => {
  beforeEach(() => {
    // no-op; getCollection is already mocked
  });

  it('ContentService.getAllEntries returns entries sorted by updatedDate first, then pubDate desc', async () => {
    const svc = new ContentService('blog', { includeDrafts: true });
    const entries = await svc.getAllEntries({
      includeDrafts: true,
      limit: undefined,
      offset: undefined,
    });
    const titles = entries.map((e: any) => e.data.title);
    expect(titles).toEqual(['UpdatedNew', 'NewPublished', 'Old']);
  });

  it('BlogService.getBlogIndexData returns posts sorted by updatedDate first, then pubDate desc', async () => {
    const blog = new BlogService({ includeDrafts: true });
    const { posts } = await blog.getBlogIndexData(1, 50, { includeDrafts: true });
    const titles = posts.map((p) => String(p.data.title));
    expect(titles[0]).toBe('UpdatedNew');
    expect(titles).toContain('NewPublished');
    expect(titles).toContain('Old');
  });
});
