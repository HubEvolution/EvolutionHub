// Types for parsing and processing blog content from the 'blog' collection.
// These types are used by the BlogService to enrich blog post data.

/**
 * Author information for a blog post.
 */
export interface AuthorInfo {
  name: string;
  avatar?: string;
  bio?: string;
  twitter?: string;
}

/**
 * Image metadata from Astro's image() schema helper.
 */
export interface ImageData {
  src: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Represents the metadata associated with a blog post.
 * Matches the schema defined in src/content/config.ts
 */
export interface BlogPostData {
  /** The title of the blog post. */
  title: string;
  /** The publication date of the blog post. */
  pubDate: Date;
  /** The last updated date of the blog post, if available. */
  updatedDate?: Date;
  /** The category the blog post belongs to. */
  category: string;
  /** An array of tags associated with the blog post. */
  tags: string[];
  /** Indicates if the blog post is featured. */
  featured: boolean;
  /** Indicates if the blog post is a draft, typically relevant in development environments. */
  draft: boolean;
  /** A short description or excerpt for meta tags or previews. */
  description: string;
  /** Author information - can be string or object. */
  author: string | AuthorInfo;
  /** The image for the blog post. */
  image?: ImageData;
  /** Alt text for the image. */
  imageAlt?: string;
  /** The language of the blog post, optional for locale-specific filtering. */
  lang?: 'de' | 'en';
}

/**
 * Represents a complete blog post as retrieved from the content collection.
 * This includes standard Astro content entry properties.
 */
export interface BlogPost {
  /** Unique identifier for the content entry. */
  id: string;
  /** The slug used to identify the blog post in URLs. */
  slug: string;
  /** The main content of the blog post, usually in Markdown. */
  body: string;
  /** The metadata associated with the blog post. */
  data: BlogPostData;
}

/**
 * Options for filtering and paginating blog posts.
 */
export interface BlogListOptions {
  /** Filter posts belonging to a specific category. */
  category?: string;
  /** Filter posts associated with a specific tag. */
  tag?: string;
  /** Filter posts matching a search query. */
  search?: string;
  /** Include posts marked as featured. */
  featured?: boolean;
  /** The maximum number of posts to return. */
  limit?: number;
  /** The number of posts to skip for pagination. */
  offset?: number;
  /** Optional language filter for locale-specific posts. */
  lang?: 'de' | 'en';
  /** Include posts marked as drafts, typically for development environments. */
  includeDrafts?: boolean;
}

/**
 * Represents the base properties of a content collection entry.
 * This is a more generic type that might be returned by Astro's `getCollection`.
 */
interface BlogCollectionEntryBase {
  id: string;
  slug: string;
  body: string;
  data: Record<string, unknown>; // Placeholder, specific data is defined in BlogPostData
}

/**
 * Represents a blog post after it has been processed with additional data.
 * This includes calculated fields like reading time and formatted dates.
 */
export interface ProcessedBlogPost extends BlogCollectionEntryBase {
  /** Calculated reading time information for the post. */
  readingTime: { text: string; minutes: number; time: number; words: number };
  /** The publication date formatted as a string. */
  formattedPubDate: string;
  /** The last updated date formatted as a string, if available. */
  formattedUpdatedDate?: string;
  /** The URL of the blog post. */
  url: string;
}

/**
 * Represents a paginated result set containing a list of items.
 * @template T The type of items in the paginated list.
 */
export interface PaginatedResult<T> {
  /** The array of items for the current page. */
  items: T[];
  /** The total number of items across all pages. */
  total: number;
  /** The current page number. */
  page: number;
  /** The total number of pages available. */
  totalPages: number;
}

export {}; // Make this file a module