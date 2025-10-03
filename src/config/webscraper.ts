/**
 * Webscraper Tool Configuration
 * Keep aligned with environment variables; provide sane defaults for dev.
 */

export type OwnerType = 'user' | 'guest';

export interface WebscraperConfig {
  timeout: number;
  maxSizeBytes: number;
  userAgent: string;
  guestLimit: number;
  userLimit: number;
  maxUrlLength: number;
  respectRobotsTxt: boolean;
}

export const WEBSCRAPER_CONFIG: Readonly<WebscraperConfig> = Object.freeze({
  timeout: Number(import.meta.env.WEBSCRAPER_TIMEOUT || 10000), // 10s
  maxSizeBytes: Number(import.meta.env.WEBSCRAPER_MAX_SIZE || 5 * 1024 * 1024), // 5MB
  userAgent:
    String(import.meta.env.WEBSCRAPER_USER_AGENT) ||
    'EvolutionHub-Scraper/1.0 (+https://hub-evolution.com)',
  guestLimit: Number(import.meta.env.WEBSCRAPER_GUEST_LIMIT || 5),
  userLimit: Number(import.meta.env.WEBSCRAPER_USER_LIMIT || 20),
  maxUrlLength: Number(import.meta.env.WEBSCRAPER_MAX_URL_LENGTH || 2048),
  respectRobotsTxt: (import.meta.env.WEBSCRAPER_RESPECT_ROBOTS || 'true') !== 'false',
});

// Allowed schemes for URL validation
export const ALLOWED_SCHEMES = ['http:', 'https:'] as const;

// Blocked domains (to prevent abuse)
export const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'internal',
  'local',
] as const;

// Content extraction limits
export const EXTRACTION_LIMITS = Object.freeze({
  titleMaxLength: 500,
  descriptionMaxLength: 1000,
  textMaxLength: 10000, // First 10k chars of body text
  linksMax: 100, // Max number of links to extract
  metaTagsMax: 50, // Max number of meta tags
});

/**
 * Resolve the effective daily limit for an owner based on type.
 */
export function getWebscraperLimitFor(ownerType: OwnerType): number {
  return ownerType === 'guest' ? WEBSCRAPER_CONFIG.guestLimit : WEBSCRAPER_CONFIG.userLimit;
}
