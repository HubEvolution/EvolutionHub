/**
 * TypeScript types and interfaces for Webscraper Tool
 */

export type ScrapingStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface ScrapingJob {
  id: string;
  userId?: string;
  url: string;
  status: ScrapingStatus;
  result?: ScrapingResult;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapingResult {
  url: string;
  title: string;
  description?: string;
  text: string;
  metadata: {
    author?: string;
    publishDate?: string;
    language?: string;
    charset?: string;
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: string;
    canonical?: string;
  };
  links: string[];
  images: string[];
  scrapedAt: string;
  robotsTxtAllowed: boolean;
}

export interface ScrapingConfig {
  url: string;
  timeout?: number;
  maxSizeBytes?: number;
  respectRobotsTxt?: boolean;
  selector?: string;
  format?: 'text' | 'html' | 'json';
  maxDepth?: number;
}

export interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

export interface ScrapeInput {
  url: string;
  options?: Partial<ScrapingConfig>;
}

export interface ScrapeResult {
  result: ScrapingResult;
  usage: UsageInfo;
}

export interface RobotsTxtRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}
