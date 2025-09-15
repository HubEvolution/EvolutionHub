// Note: keep types local to avoid unused imports

/**
 * Represents a category with its associated count of blog posts.
 */
export interface CategoryWithCount {
  /** The name of the category. */
  name: string;
  /** The number of blog posts in this category. */
  count: number;
}

/**
 * Represents a tag with its associated count of blog posts or other items.
 */
export interface TagWithCount {
  /** The name of the tag. */
  name: string;
  /** The number of items associated with this tag. */
  count: number;
}