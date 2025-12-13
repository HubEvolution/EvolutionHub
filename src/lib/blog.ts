import type { EntryCollection } from 'contentful';

import {
  getContentfulClient,
  mapEntryToBlogPost,
  type ContentfulBlogEntry,
  type BlogPostSkeleton,
} from '@/lib/contentful';
import type { BlogListOptions, ProcessedBlogPost, PaginatedResult } from '@/content/types';
import type { CategoryWithCount, TagWithCount } from '@/types/blog';

type CachedBlogData = {
  entries: ContentfulBlogEntry[];
  processedPosts: ProcessedBlogPost[];
};

const DEFAULT_PER_PAGE = 10;

const BLOG_CACHE_TTL_MS = 60_000;

export class BlogService {
  private readonly defaultOptions: BlogListOptions;
  private cachedData?: Promise<CachedBlogData>;
  private cachedDataAtMs?: number;

  constructor(options: BlogListOptions = {}) {
    this.defaultOptions = {
      limit: DEFAULT_PER_PAGE,
      offset: 0,
      includeDrafts: import.meta.env.DEV,
      ...options,
    };
  }

  private resolveIncludeDrafts(options?: BlogListOptions): boolean {
    if (options?.includeDrafts !== undefined) {
      return options.includeDrafts;
    }
    if (this.defaultOptions.includeDrafts !== undefined) {
      return Boolean(this.defaultOptions.includeDrafts);
    }
    return import.meta.env.DEV;
  }

  private async fetchAllBlogData(force = false): Promise<CachedBlogData> {
    const nowMs = Date.now();
    const isExpired =
      this.cachedDataAtMs !== undefined && nowMs - this.cachedDataAtMs > BLOG_CACHE_TTL_MS;

    if (!this.cachedData || force || isExpired) {
      this.cachedDataAtMs = nowMs;
      this.cachedData = (async () => {
        const client = getContentfulClient();
        const { lang } = this.defaultOptions;

        const query: Record<string, unknown> = {
          content_type: 'blogPost',
          include: 2,
          order: ['-fields.publishDate'],
        };
        if (lang) {
          query['fields.lang'] = lang;
        }

        const response: EntryCollection<BlogPostSkeleton> =
          await client.getEntries<BlogPostSkeleton>(query);
        const entries = response.items ?? [];
        const processedPosts = entries.map((entry) => mapEntryToBlogPost(entry));

        processedPosts.sort((a, b) => {
          const dateA = new Date((a.data.updatedDate ?? a.data.pubDate) as Date | string).getTime();
          const dateB = new Date((b.data.updatedDate ?? b.data.pubDate) as Date | string).getTime();
          return dateB - dateA;
        });

        return { entries, processedPosts };
      })();
    }

    return this.cachedData;
  }

  private filterPosts(
    posts: ProcessedBlogPost[],
    options: BlogListOptions = {}
  ): ProcessedBlogPost[] {
    const includeDrafts = this.resolveIncludeDrafts(options);
    const searchTerm =
      typeof options.search === 'string' && options.search.trim().length > 0
        ? options.search.trim().toLowerCase()
        : undefined;
    const tagFilter = options.tag ? options.tag.toLowerCase() : undefined;

    return posts.filter((post) => {
      if (!includeDrafts && post.data.draft) {
        return false;
      }
      if (options.category && post.data.category !== options.category) {
        return false;
      }
      if (options.lang && post.data.lang !== options.lang) {
        return false;
      }
      if (options.featured !== undefined && post.data.featured !== options.featured) {
        return false;
      }
      if (tagFilter) {
        const tags = Array.isArray(post.data.tags)
          ? (post.data.tags as string[]).map((tag) => tag.toLowerCase())
          : [];
        if (!tags.includes(tagFilter)) {
          return false;
        }
      }
      if (searchTerm) {
        const title = ((post.data.title as string | undefined) ?? '').toLowerCase();
        const body = (post.body ?? '').toLowerCase();
        if (!title.includes(searchTerm) && !body.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }

  private computeCategories(posts: ProcessedBlogPost[]): CategoryWithCount[] {
    const categoryMap = new Map<string, number>();
    posts.forEach((post) => {
      const category = post.data.category as string | undefined;
      if (!category) return;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  private computeTags(posts: ProcessedBlogPost[]): TagWithCount[] {
    const tagMap = new Map<string, number>();
    posts.forEach((post) => {
      const rawTags = post.data.tags as unknown;
      const tags: string[] = Array.isArray(rawTags)
        ? rawTags.filter((tag): tag is string => typeof tag === 'string')
        : [];
      tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async getAllPosts(options: BlogListOptions = {}): Promise<ProcessedBlogPost[]> {
    const { processedPosts } = await this.fetchAllBlogData();
    const includeDrafts = this.resolveIncludeDrafts(options);
    const base = includeDrafts ? processedPosts : processedPosts.filter((post) => !post.data.draft);
    return this.filterPosts(base, options);
  }

  async getAllCategories(options: BlogListOptions = {}): Promise<CategoryWithCount[]> {
    const { processedPosts } = await this.fetchAllBlogData();
    const includeDrafts = this.resolveIncludeDrafts(options);
    const base = includeDrafts ? processedPosts : processedPosts.filter((post) => !post.data.draft);
    return this.computeCategories(base);
  }

  async getAllTags(options: BlogListOptions = {}): Promise<TagWithCount[]> {
    const { processedPosts } = await this.fetchAllBlogData();
    const includeDrafts = this.resolveIncludeDrafts(options);
    const base = includeDrafts ? processedPosts : processedPosts.filter((post) => !post.data.draft);
    return this.computeTags(base);
  }

  async getTotalCount(options: BlogListOptions = {}): Promise<number> {
    const posts = await this.getAllPosts(options);
    return posts.length;
  }

  async getPaginatedPosts(
    page: number = 1,
    perPage: number = DEFAULT_PER_PAGE,
    options: Omit<BlogListOptions, 'limit' | 'offset'> = {}
  ): Promise<PaginatedResult<ProcessedBlogPost>> {
    const posts = await this.getAllPosts(options);
    const total = posts.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * perPage;
    const items = posts.slice(offset, offset + perPage);

    return {
      items,
      total,
      page: currentPage,
      totalPages,
    };
  }

  async getPublishedPosts(): Promise<ProcessedBlogPost[]> {
    return this.getAllPosts({ includeDrafts: false });
  }

  async getRelatedPosts(
    slug: string,
    options: BlogListOptions & { limit?: number } = {}
  ): Promise<ProcessedBlogPost[]> {
    const { processedPosts } = await this.fetchAllBlogData();
    const includeDrafts = this.resolveIncludeDrafts(options);
    const basePosts = includeDrafts
      ? processedPosts
      : processedPosts.filter((post) => !post.data.draft);

    const current = processedPosts.find((post) => post.slug === slug);
    if (!current) {
      return [];
    }

    const currentTags = Array.isArray(current.data.tags) ? (current.data.tags as string[]) : [];
    const currentCategory = current.data.category as string | undefined;

    const scored = basePosts
      .filter((post) => post.slug !== slug)
      .map((post) => {
        const postTags = Array.isArray(post.data.tags) ? (post.data.tags as string[]) : [];
        const tagMatches = postTags.filter((tag) => currentTags.includes(tag)).length;
        const categoryMatch = currentCategory && post.data.category === currentCategory ? 1 : 0;
        const score = tagMatches * 2 + categoryMatch;
        return { post, score };
      })
      .filter((item) => item.score > 0);

    const limit = options.limit ?? 3;

    return scored
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        const dateA = new Date(
          (a.post.data.updatedDate ?? a.post.data.pubDate) as Date | string
        ).getTime();
        const dateB = new Date(
          (b.post.data.updatedDate ?? b.post.data.pubDate) as Date | string
        ).getTime();
        return dateB - dateA;
      })
      .slice(0, limit)
      .map((item) => item.post);
  }

  async getPostBySlug(
    slug: string
  ): Promise<{ entry: ContentfulBlogEntry; processedData: ProcessedBlogPost } | undefined> {
    const { entries, processedPosts } = await this.fetchAllBlogData();
    const entry = entries.find((item) => item.fields.slug === slug);
    if (!entry) {
      return undefined;
    }

    const processed =
      processedPosts.find((post) => post.slug === slug) ??
      mapEntryToBlogPost(entry as ContentfulBlogEntry);

    return { entry, processedData: processed };
  }

  async getBlogIndexData(
    page: number,
    perPage: number,
    options: Omit<BlogListOptions, 'limit' | 'offset'> = {}
  ): Promise<{
    posts: ProcessedBlogPost[];
    categories: CategoryWithCount[];
    tags: TagWithCount[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { processedPosts } = await this.fetchAllBlogData();
    const includeDrafts = this.resolveIncludeDrafts(options);

    const basePosts = includeDrafts
      ? processedPosts
      : processedPosts.filter((post) => !post.data.draft);
    const categories = this.computeCategories(basePosts);
    const tags = this.computeTags(basePosts);
    const filtered = this.filterPosts(basePosts, options);

    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * perPage;
    const posts = filtered.slice(offset, offset + perPage);

    return {
      posts,
      categories,
      tags,
      total,
      currentPage,
      totalPages,
    };
  }
}

export const blogService = new BlogService();

export type { ContentfulBlogEntry } from '@/lib/contentful';
