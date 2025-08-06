/// <reference types="astro/client" />
import { getCollection, type CollectionEntry } from 'astro:content';

// ContentService is assumed to be correctly imported and functional.
import { ContentService } from './content';
import type {
  BlogPost,
  BlogListOptions,
  ProcessedBlogPost,
  PaginatedResult
} from '../content/types';
import { formatDate } from '@/content/config'; // Verwende die existierende formatDate-Funktion aus content/config.ts
import type { CategoryWithCount, TagWithCount } from '../types/blog';

// Export BlogCollectionEntry type so it can be used elsewhere, assuming it's correctly defined or inferred.
// Using Astro's built-in `CollectionEntry<'blog'>` to ensure compatibility and correct type inference.
export type BlogCollectionEntry = CollectionEntry<'blog'>;

// Define the BlogPostService interface to ensure BlogService implements the required methods for blog-specific operations.
// Exporting the interface might help TypeScript resolve types more reliably across files.
export interface BlogPostService {
  /**
   * Retrieves a single blog post by its slug, returning the original entry and processed data.
   * @param slug The unique identifier for the blog post.
   * @returns A promise that resolves to the blog post data or undefined if not found.
   */
  getEntryBySlug(slug: string): Promise<{ entry: BlogCollectionEntry; processedData: ProcessedBlogPost } | undefined>;

  /**
   * Retrieves related blog posts based on tags or category.
   * @param currentPost The blog post for which related posts are sought.
   * @param options Optional parameters for filtering and limiting related posts.
   * @returns A promise that resolves to an array of processed blog posts.
   */
  getRelatedEntries(
    currentPost: BlogCollectionEntry,
    options: BlogListOptions & { limit?: number }
  ): Promise<ProcessedBlogPost[]>;
  
  /**
   * Optimized method to get data needed for the blog index page.
   * Fetches all posts once and returns paginated/filtered results along with categories and tags.
   */
  getBlogIndexData(
    page: number,
    perPage: number,
    options: Omit<BlogListOptions, 'limit' | 'offset'>
  ): Promise<{
    posts: ProcessedBlogPost[];
    categories: CategoryWithCount[];
    tags: TagWithCount[];
    total: number;
    currentPage: number;
    totalPages: number;
  }>;
}

/**
 * Blog-specific content service that extends the base ContentService.
 * Handles fetching, processing, and filtering blog posts.
 * It implements the BlogPostService interface to guarantee certain blog-specific methods are available.
 */
export class BlogService extends ContentService<BlogCollectionEntry> implements BlogPostService {
  constructor(options: BlogListOptions = {}) {
    // Use 'blog' as the collection name, which corresponds to the 'src/content/blog' directory
    // as defined in Astro's content collections configuration.
    super('blog', options);
  }

  /**
   * Calculates reading time for a given text.
   * @param text The content to calculate reading time for.
   * @returns An object containing the reading time text, minutes, time in ms, and word count.
   */
  calculateReadingTime(text: string): { text: string; minutes: number; time: number; words: number } {
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    // Assume an average reading speed of 200 words per minute
    const minutes = Math.ceil(wordCount / 200);
    const time = minutes * 60 * 1000; // Time in milliseconds

    let timeText = '';
    if (minutes === 0) {
      timeText = 'Less than a minute read';
    } else if (minutes === 1) {
      timeText = '1 minute read';
    } else {
      timeText = `${minutes} minutes read`;
    }

    return { text: timeText, minutes, time, words: wordCount };
  }

  /**
   * Processes a single blog post entry to include calculated and formatted data.
   * @param post The raw blog collection entry.
   * @returns A ProcessedBlogPost object with enriched data.
   */
  processPost(post: BlogCollectionEntry): ProcessedBlogPost {
    const readingTime = this.calculateReadingTime(post.body);

    // Format dates
    const formattedPubDate = formatDate(post.data.pubDate);
    const formattedUpdatedDate = post.data.updatedDate
      ? formatDate(post.data.updatedDate)
      : undefined;

    return {
      ...post,
      readingTime,
      formattedPubDate,
      formattedUpdatedDate,
      url: this.getPostUrl(post)
    };
  }

  /**
   * Fetches all blog posts and returns them along with calculated categories and tags.
   * This method is optimized to fetch all blog entries only once.
   * It does NOT apply pagination here, but returns all processed data.
   */
  private cachedBlogIndexData: Promise<{
    processedPosts: ProcessedBlogPost[];
    categories: CategoryWithCount[];
    tags: TagWithCount[];
  }> | null = null; // Cache for the fetched and processed blog data

  private async fetchAllBlogData(): Promise<{
    processedPosts: ProcessedBlogPost[];
    categories: CategoryWithCount[];
    tags: TagWithCount[];
  }> {
    // If data is already cached, return it.
    if (!this.cachedBlogIndexData) {
      // Fetch all blog entries.
      // Explicitly typing the result of getCollection to help TypeScript infer types.
      const allEntries: BlogCollectionEntry[] = await getCollection('blog'); // Direct call without super

      // Ensure that `allEntries` is an array before mapping.
      const processedPosts = Array.isArray(allEntries)
        ? allEntries.map(post => this.processPost(post))
        : [];

      // Calculate categories with counts
      const categoryMap = new Map<string, number>();
      processedPosts.forEach(post => {
        if (post.data.category) {
          const currentCount = categoryMap.get(post.data.category) || 0;
          categoryMap.set(post.data.category, currentCount + 1);
        }
      });
      const categoriesWithCounts: CategoryWithCount[] = Array.from(categoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')); // Sort by name (German locale)

      // Calculate tags with counts
      const tagMap = new Map<string, number>();
      processedPosts.forEach(post => {
        post.data.tags?.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      });
      const tagsWithCounts: TagWithCount[] = Array.from(tagMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      // Cache the data before returning
      this.cachedBlogIndexData = Promise.resolve({ processedPosts, categories: categoriesWithCounts, tags: tagsWithCounts });
    }
    // Return the cached data
    return this.cachedBlogIndexData!;
  }
  
  /**
   * Retrieves all category data, including counts, by fetching all blog posts once.
   * This method leverages the cached data from fetchAllBlogData.
   * @returns A promise resolving to an array of categories with their counts.
   */
  async getAllCategories(): Promise<CategoryWithCount[]> {
    const { categories } = await this.fetchAllBlogData();
    return categories;
  }

  /**
   * Retrieves all tag data, including counts, by fetching all blog posts once.
   * This method leverages the cached data from fetchAllBlogData.
   * @returns A promise resolving to an array of tags with their counts.
   */
  async getAllTags(): Promise<TagWithCount[]> {
    const { tags } = await this.fetchAllBlogData();
    return tags;
  }
  
  /**
   * Gets the total count of posts matching given options.
   * This method is optimized to reuse the filtering logic from getBlogIndexData,
   * thus minimizing redundant computations.
   * @param options - Filtering options for posts.
   * @returns The total count of matching posts.
   */
  async getTotalCount(options: BlogListOptions): Promise<number> {
    // Leverage getBlogIndexData which already performs filtering, caching, and calculates total count.
    // We pass page=1 and a large perPage value (e.g., 99999) to ensure we get the total count for all matching posts
    // without unintended pagination truncation from getPaginatedPosts.
    // The options object is passed directly, as it matches the expected type for filtering.
    const result = await this.getBlogIndexData(1, 99999, options);
    return result.total;
  }

  /**
   * Get a paginated list of blog posts.
   * This method now leverages the optimized fetch and applies pagination.
   */
  async getPaginatedPosts(
    page: number = 1,
    perPage: number = 10,
    options: Omit<BlogListOptions, 'limit' | 'offset'> = {}
  ): Promise<PaginatedResult<ProcessedBlogPost>> {
    // Fetch all posts, then apply filters, and then paginate.
    // This is slightly less efficient than filtering during collection fetching for counts,
    // but necessary for returning processed posts with proper pagination.
    const { processedPosts: allPosts } = await this.fetchAllBlogData();

    // Apply filters from options
    const filteredPosts = allPosts.filter(post => {
      let match = true;
      if (options.category && post.data.category !== options.category) {
        match = false;
      }
      if (options.tag && !post.data.tags?.includes(options.tag)) {
        match = false;
      }
      if (options.search && typeof options.search === 'string' && options.search.trim() !== '') {
        const searchTerm = options.search.toLowerCase();
        // Check if search term is in body or title.
        if (!(post.body.toLowerCase().includes(searchTerm) || post.data.title.toLowerCase().includes(searchTerm))) {
           match = false;
        }
      }
      if (options.featured !== undefined && post.data.featured !== options.featured) {
         match = false;
      }
      if (options.includeDrafts === false && post.data.draft === true) {
         match = false;
      }
      return match;
    });

    const total = filteredPosts.length;
    const totalPages = Math.ceil(total / perPage);
    const paginatedPosts = filteredPosts.slice((page - 1) * perPage, page * perPage);

    // Return correct structure: items, total, page, perPage, totalPages
    return {
      items: paginatedPosts, // Use 'items' as per PaginatedResult type
      total: total,
      page: page,
      totalPages: totalPages
    };
  }

  /**
   * Get related blog posts
   */
  // This method is defined in BlogService to add processing after fetching related entries.
  public async getRelatedPosts(
    currentPost: BlogCollectionEntry,
    options: BlogListOptions & { limit?: number }
  ): Promise<ProcessedBlogPost[]> {
    // Fetch related entries using the super method.
    // The super method (from ContentService) is getRelatedEntries.
    // Explicitly typing the result from super.getRelatedEntries.
    const relatedEntries: BlogCollectionEntry[] = await super.getRelatedEntries(currentPost, options);
    
    // Process the fetched related entries into the ProcessedBlogPost format.
    const processedPosts = relatedEntries.map(entry => this.processPost(entry));
    
    return processedPosts;
  }

  /**
   * Get a single blog post by slug with its original entry and processed data.
   * This method is defined in BlogService to combine entry fetching with post processing.
   */
  public async getPostBySlug(slug: string): Promise<{ entry: BlogCollectionEntry; processedData: ProcessedBlogPost } | undefined> {
    // Fetch the original entry using the super method.
    // The super method (from ContentService) is getEntryBySlug.
    // Explicitly typing the result from super.getEntryBySlug.
    const entry: BlogCollectionEntry | undefined = await super.getEntryBySlug(slug); // Assume getEntryBySlug returns the original entry
    if (entry) {
      // Process the fetched entry into the desired format.
      const processedData = this.processPost(entry);
      return { entry, processedData };
    }
    return undefined;
  }

  /**
   * Generate URL for a blog post
   */
  private getPostUrl(post: BlogCollectionEntry): string {
    return `/blog/${post.slug}/`;
  }

  /**
   * Optimized method to get data needed for the blog index page.
   * Fetches all posts once and returns paginated/filtered results along with categories and tags.
   */
  async getBlogIndexData(
    page: number,
    perPage: number,
    options: Omit<BlogListOptions, 'limit' | 'offset'>
  ): Promise<{
    posts: ProcessedBlogPost[];
    categories: CategoryWithCount[];
    tags: TagWithCount[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    // Fetch all necessary data in one go to avoid multiple collection fetches
    const { processedPosts, categories, tags } = await this.fetchAllBlogData();
    
    // Apply filters from options
    const filteredPosts = processedPosts.filter(post => {
      let match = true;
      if (options.category && post.data.category !== options.category) {
        match = false;
      }
      if (options.tag && !post.data.tags?.includes(options.tag)) {
        match = false;
      }
      if (options.search && typeof options.search === 'string' && options.search.trim() !== '') {
        const searchTerm = options.search.toLowerCase();
        if (!(post.body.toLowerCase().includes(searchTerm) || post.data.title.toLowerCase().includes(searchTerm))) {
          match = false;
        }
      }
      if (options.featured !== undefined && post.data.featured !== options.featured) {
        match = false;
      }
      if (options.includeDrafts === false && post.data.draft === true) {
        match = false;
      }
      return match;
    });

    // Calculate pagination
    const total = filteredPosts.length;
    const totalPages = Math.ceil(total / perPage);
    const currentPage = page;
    const paginatedPosts = filteredPosts.slice((page - 1) * perPage, page * perPage);

    return {
      posts: paginatedPosts,
      categories,
      tags,
      total,
      currentPage,
      totalPages
    };
  }
}

// Default blog service instance. It's explicitly typed as BlogService to help TypeScript.
export const blogService: BlogService = new BlogService();
