import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { BlogListOptions, PaginatedResult } from '../content/types';

/**
 * Base content service for handling common content operations
 */
export class ContentService<T extends CollectionEntry<'blog'>> {
  protected collectionName: string;
  protected defaultOptions: BlogListOptions;

  constructor(collectionName: string, defaultOptions: BlogListOptions = {}) {
    this.collectionName = collectionName;
    this.defaultOptions = {
      limit: 10,
      offset: 0,
      includeDrafts: import.meta.env.DEV,
      ...defaultOptions
    };
  }

  /**
   * Get all entries with optional filtering and sorting
   */
  async getAllEntries(options: BlogListOptions = {}): Promise<T[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const { limit, offset, includeDrafts, ...filters } = mergedOptions;

    let entries = await getCollection(this.collectionName as 'blog', (entry: CollectionEntry<'blog'>) => {
      // Filter out drafts unless explicitly included
      if (entry.data.draft && !includeDrafts) {
        return false;
      }

      // Apply additional filters
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined) return true;
        
        const entryValue = (entry.data as any)[key];
        if (entryValue === undefined) return true;
        
        // Handle array values (e.g., tags)
        if (Array.isArray(entryValue)) {
          return (entryValue as any[]).includes(value);
        }
        
        // Handle direct comparison
        return entryValue === value;
      });
    });

    // Sort by publication date (newest first)
    entries = entries.sort((a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>) => 
      new Date(a.data.pubDate as any).getTime() - new Date(b.data.pubDate as any).getTime()
    ).reverse();

    // Apply pagination
    if (offset !== undefined) {
      entries = entries.slice(offset, (offset || 0) + (limit || entries.length));
    }

    return entries as unknown as T[];
  }

  /**
   * Get a paginated result of entries
   */
  async getPaginatedEntries(
    page: number = 1,
    perPage: number = 10,
    options: Omit<BlogListOptions, 'limit' | 'offset'> = {}
  ): Promise<PaginatedResult<T> & { perPage: number; hasNext: boolean; hasPrevious: boolean }> {
    const offset = (page - 1) * perPage;
    const allEntries = await this.getAllEntries({
      ...options,
      limit: perPage,
      offset
    });

    const total = await this.getTotalCount(options);
    const totalPages = Math.ceil(total / perPage);

    return {
      items: allEntries,
      total,
      page,
      perPage,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  /**
   * Get the total count of entries matching the filters
   */
  async getTotalCount(filters: Omit<BlogListOptions, 'limit' | 'offset'> = {}): Promise<number> {
    const entries = await this.getAllEntries({
      ...filters,
      limit: undefined,
      offset: undefined
    });
    return entries.length;
  }

  /**
   * Get a single entry by slug
   */
  async getEntryBySlug(slug: string): Promise<T | undefined> {
    const entries = await getCollection(this.collectionName as 'blog', (entry: CollectionEntry<'blog'>) => 
      entry.slug === slug && (!entry.data.draft || this.defaultOptions.includeDrafts)
    );
    return entries[0] as unknown as T;
  }

  /**
   * Get related entries based on tags or categories
   */
  async getRelatedEntries(
    currentEntry: T,
    { limit = 3, ...filters }: BlogListOptions & { limit?: number } = {}
  ): Promise<T[]> {
    const current = currentEntry as unknown as CollectionEntry<'blog'>;
    const { tags = [], category } = current.data as any;
    const allEntries = await this.getAllEntries(filters);
    const allCE = allEntries as unknown as CollectionEntry<'blog'>[];

    // Score entries based on tag matches, excluding the current entry
    const scoredEntries = allCE
      .filter((entry) => entry.id !== current.id)
      .map((entry) => {
        const entryTags = ((entry.data as any).tags || []) as string[];
        const tagMatches = entryTags.filter((tag: string) => (tags as string[]).includes(tag)).length;
        const categoryMatch = (entry.data as any).category === category ? 1 : 0;
      
        return {
          entry,
          score: (tagMatches * 2) + categoryMatch // Weight tags more than category
        };
      });

    // Sort by score (descending) and take the top N
    return scoredEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.entry as unknown as T);
  }
}

/**
 * Helper function to get a content service instance
 */
export function createContentService<T extends CollectionEntry<'blog'>>(
  collectionName: string,
  options: BlogListOptions = {}
): ContentService<T> {
  return new ContentService<T>(collectionName, options);
}
