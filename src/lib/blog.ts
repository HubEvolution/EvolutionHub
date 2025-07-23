import { getCollection } from 'astro:content';

import { ContentService } from './content';
import type { 
  BlogPost, 
  BlogListOptions, 
  ProcessedBlogPost,
  PaginatedResult
} from '../content/types';
import { formatDate } from '../content/config';

type BlogCollectionEntry = Awaited<ReturnType<typeof getCollection<'blog'>>>[number];

/**
 * Blog-specific content service that extends the base ContentService
 */
export class BlogService extends ContentService<BlogCollectionEntry> {
  constructor(options: BlogListOptions = {}) {
    super('blog', options);
  }

  /**
   * Process a blog post with additional data like reading time
   */
  processPost(post: BlogCollectionEntry): ProcessedBlogPost {
    // Calculate reading time if not already set
    const readingTime = /* post.data.readingTime || this.calculateReadingTime(post.body) */ { text: '5 min read', minutes: 5, time: 300000, words: 1000 };
    
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
   * Get all blog posts with processing applied
   */
  async getAllPosts(options: BlogListOptions = {}): Promise<ProcessedBlogPost[]> {
    const posts = await super.getAllEntries(options);
    return posts.map(post => this.processPost(post));
  }

  /**
   * Get a paginated list of blog posts
   */
  async getPaginatedPosts(
    page: number = 1,
    perPage: number = 10,
    options: Omit<BlogListOptions, 'limit' | 'offset'> = {}
  ): Promise<PaginatedResult<ProcessedBlogPost>> {
    const result = await super.getPaginatedEntries(page, perPage, options);
    return {
      ...result,
      items: result.items.map(post => this.processPost(post))
    };
  }

  /**
   * Get a single blog post by slug with processing applied
   */
  async getPostBySlug(slug: string): Promise<ProcessedBlogPost | undefined> {
    const post = await super.getEntryBySlug(slug);
    return post ? this.processPost(post) : undefined;
  }

  /**
   * Get related blog posts
   */
  async getRelatedPosts(
    currentPost: BlogCollectionEntry,
    options: BlogListOptions & { limit?: number } = {}
  ): Promise<ProcessedBlogPost[]> {
    const related = await super.getRelatedEntries(currentPost, options);
    return related.map(post => this.processPost(post));
  }

  /**
   * Get all unique categories from blog posts
   */
  async getAllCategories(): Promise<string[]> {
    const posts = await this.getAllPosts();
    const categories = new Set<string>();
    
    posts.forEach(post => {
      if (post.data.category) {
        categories.add(post.data.category);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Get all unique tags from blog posts with counts
   */
  async getAllTags(): Promise<{name: string; count: number}[]> {
    const posts = await this.getAllPosts();
    const tagMap = new Map<string, number>();
    
    posts.forEach(post => {
      post.data.tags?.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  /**
   * Get posts by category
   */
  async getPostsByCategory(
    category: string,
    options: Omit<BlogListOptions, 'category'> = {}
  ): Promise<ProcessedBlogPost[]> {
    return this.getAllPosts({ ...options, category });
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(
    tag: string,
    options: BlogListOptions = {}
  ): Promise<ProcessedBlogPost[]> {
    return this.getAllPosts({ ...options, tags: [tag] });
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(
    limit: number = 3,
    options: Omit<BlogListOptions, 'featured' | 'limit'> = {}
  ): Promise<ProcessedBlogPost[]> {
    const posts = await this.getAllPosts({ ...options, featured: true, limit });
    return posts.slice(0, limit);
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

// Helper functions
export function getExcerpt(content: string, wordCount: number = 30): string {
  const words = content.split(/\s+/);
  const excerpt = words.slice(0, wordCount).join(' ');
  return words.length > wordCount ? `${excerpt}...` : excerpt;
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than a minute read';
  if (minutes === 1) return '1 minute read';
  return `${Math.ceil(minutes)} minutes read`;
}
