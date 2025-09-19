import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  body: text('body').notNull(),
  lang: text('lang', { enum: ['de', 'en'] }).notNull(),
  category: text('category'),
  tags: text('tags', { mode: 'json' }).$type<string[] | null>(),
  pubDate: integer('pub_date', { mode: 'timestamp' }).notNull(),
  updatedDate: integer('updated_date', { mode: 'timestamp' }),
  author: text('author'),
  description: text('description'),
  featured: integer('featured', { mode: 'boolean' }).default(false),
  draft: integer('draft', { mode: 'boolean' }).default(false),
});