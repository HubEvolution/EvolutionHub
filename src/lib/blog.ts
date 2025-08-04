import { getCollection } from 'astro:content';

import { ContentService } from './content'; // Assuming ContentService is in ./content
import type {
  BlogPost,
  BlogListOptions,
  ProcessedBlogPost,
  PaginatedResult
} from '../content/types';
import { formatDate } from '../content/config'; // Assuming formatDate is in ../content/config
import type { CategoryWithCount, TagWithCount } from '../types/blog';

// Export BlogCollectionEntry type so it can be used elsewhere
export type BlogCollectionEntry = Awaited<ReturnType<typeof getCollection<'blog'>>>[number];


/**
 * Blog-specific content service that extends the base ContentService
 */
export class BlogService extends ContentService<BlogCollectionEntry> {
  constructor(options: BlogListOptions = {}) {
    // Ensure the correct collection name is passed if required by ContentService
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
   * Process a blog post with additional data like reading time
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
  private async fetchAllBlogData(): Promise<{
    processedPosts: ProcessedBlogPost[];
    categories: CategoryWithCount[];
    tags: TagWithCount[];
  }> {
    // Fetch all blog entries.
    const allEntries = await super.getAllEntries({});
    const processedPosts = allEntries.map(post => this.processPost(post));

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

    return { processedPosts, categories: categoriesWithCounts, tags: tagsWithCounts };
  }

  /**
   * Optimized method to get data needed for the blog index page.
   * Fetches all posts once and returns paginated/filtered results along with categories and tags.
   */
  async getBlogIndexData(
    page: number = 1,
    perPage: number = 10,
    options: Omit<BlogListOptions, 'limit' | 'offset'> = {}
  ): Promise<{
    posts: ProcessedBlogPost[];
    categories: CategoryWithCount[];
    tags: TagWithCount[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { processedPosts: allPosts, categories, tags } = await this.fetchAllBlogData();

    // Apply filters from options
    const filteredPosts = allPosts.filter(post => {
      let match = true;
      if (options.category && post.data.category !== options.category) {
        match = false;
      }
      if (options.tag && !post.data.tags?.includes(options.tag)) {
        match = false;
      }
      if (options.search && !(
        post.body.toLowerCase().includes(options.search.toLowerCase()) ||
        post.data.title.toLowerCase().includes(options.search.toLowerCase())
      )) {
         match = false;
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

    return {
      posts: paginatedPosts,
      categories: categories,
      tags: tags,
      total: total,
      currentPage: page,
      totalPages: totalPages
    };
  }

  /**
   * Get all unique categories from blog posts as an array of strings.
   * This method now leverages the optimized fetch.
   */
  async getAllCategories(): Promise<string[]> {
    const { categories } = await this.fetchAllBlogData();
    return categories.map(cat => cat.name);
  }
  
  /**
   * Get category counts, optimized to fetch all posts only once.
   * This method is now redundant if getBlogIndexData is solely used for index page data.
   * Kept for potential other uses, but relies on fetchAllBlogData internally.
   */
  async getCategoryCounts(): Promise<CategoryWithCount[]> {
    const { categories } = await this.fetchAllBlogData();
    return categories;
  }

  /**
   * Get all unique tags from blog posts with counts.
   * This method now leverages the optimized fetch.
   */
  async getAllTags(): Promise<TagWithCount[]> {
    const { tags } = await this.fetchAllBlogData();
    return tags;
  }


  /**
   * Get the total count of posts matching the given options.
   * This method is updated to use the filtered results from a single fetch.
   * @param options - Filtering options for posts.
   * @returns The total count of matching posts.
   */
  async getTotalCount(options: BlogListOptions): Promise<number> {
    // Fetch all posts and apply filters to determine the total count.
    const { processedPosts: allPosts } = await this.fetchAllBlogData();

    const filteredPosts = allPosts.filter(post => {
      let match = true;
      if (options.category && post.data.category !== options.category) {
        match = false;
      }
      if (options.tag && !post.data.tags?.includes(options.tag)) {
        match = false;
      }
      if (options.search && !(
        post.body.toLowerCase().includes(options.search.toLowerCase()) ||
        post.data.title.toLowerCase().includes(options.search.toLowerCase())
      )) {
         match = false;
      }
      if (options.featured !== undefined && post.data.featured !== options.featured) {
         match = false;
      }
      if (options.includeDrafts === false && post.data.draft === true) {
         match = false;
      }
      return match;
    });
    return filteredPosts.length;
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
      if (options.search && !(
        post.body.toLowerCase().includes(options.search.toLowerCase()) ||
        post.data.title.toLowerCase().includes(options.search.toLowerCase())
      )) {
         match = false;
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

    return {
      items: paginatedPosts,
      total: total,
      page: page,
      totalPages: totalPages
    };
  }

  /**
   * Get related blog posts
   */
  // Modified to accept BlogCollectionEntry for relation logic as needed by getRelatedEntries super method.
  async getRelatedPosts(
    currentPost: BlogCollectionEntry, // Keep original type for currentPost if used by super.getRelatedEntries
    options: BlogListOptions & { limit?: number } = {}
  ): Promise<ProcessedBlogPost[]> {
    // This method might still be a bottleneck if it fetches all posts again.
    // For now, we'll leave it as is, assuming it's not a primary performance concern for the index page.
    // A more advanced optimization would be to pass cached data to it.
    // Fetching all posts to find related ones. This needs to be optimized for performance in production.
    // The super.getRelatedEntries call needs to be checked if it requires a specific type or handles BlogCollectionEntry.
    // Assuming it does, and it returns entries that we then process.
    const relatedEntries = await super.getRelatedEntries(currentPost, options);
    
    // Process the related entries
    const processedPosts = relatedEntries.map(entry => this.processPost(entry));
    
    return processedPosts;
  }

  /**
   * Get a single blog post by slug with its original entry and processed data.
   */
  async getPostBySlug(slug: string): Promise<{ entry: BlogCollectionEntry; processedData: ProcessedBlogPost } | undefined> {
    // getEntryBySlug is expected to return the original collection entry
    const entry = await super.getEntryBySlug(slug); // Assume getEntryBySlug returns the original entry
    if (entry) {
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
}

// Type guard to check if an object is a valid BlogPost
export function isBlogPost(post: unknown): post is BlogCollectionEntry {
  return (
    typeof post === 'object' &&
    post !== null &&
    'id' in post &&
    'slug' in post &&
    'data' in post &&
    typeof (post as any).data === 'object' &&
    (post as any).data !== null &&
    'title' in (post as any).data &&
    'pubDate' in (post as any).data
  );
}

// Default blog service instance
export const blogService = new BlogService();
