"use strict";
/**
 * Webscraper Tool Configuration
 * Keep aligned with environment variables; provide sane defaults for dev.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACTION_LIMITS = exports.BLOCKED_DOMAINS = exports.ALLOWED_SCHEMES = exports.WEBSCRAPER_CONFIG = void 0;
exports.getWebscraperLimitFor = getWebscraperLimitFor;
exports.WEBSCRAPER_CONFIG = Object.freeze({
    timeout: Number(import.meta.env.WEBSCRAPER_TIMEOUT || 10000), // 10s
    maxSizeBytes: Number(import.meta.env.WEBSCRAPER_MAX_SIZE || 5 * 1024 * 1024), // 5MB
    userAgent: String(import.meta.env.WEBSCRAPER_USER_AGENT) ||
        'EvolutionHub-Scraper/1.0 (+https://hub-evolution.com)',
    guestLimit: Number(import.meta.env.WEBSCRAPER_GUEST_LIMIT || 5),
    userLimit: Number(import.meta.env.WEBSCRAPER_USER_LIMIT || 20),
    maxUrlLength: Number(import.meta.env.WEBSCRAPER_MAX_URL_LENGTH || 2048),
    respectRobotsTxt: (import.meta.env.WEBSCRAPER_RESPECT_ROBOTS || 'true') !== 'false',
});
// Allowed schemes for URL validation
exports.ALLOWED_SCHEMES = ['http:', 'https:'];
// Blocked domains (to prevent abuse)
exports.BLOCKED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'internal',
    'local',
];
// Content extraction limits
exports.EXTRACTION_LIMITS = Object.freeze({
    titleMaxLength: 500,
    descriptionMaxLength: 1000,
    textMaxLength: 10000, // First 10k chars of body text
    linksMax: 100, // Max number of links to extract
    metaTagsMax: 50, // Max number of meta tags
});
/**
 * Resolve the effective daily limit for an owner based on type.
 */
function getWebscraperLimitFor(ownerType) {
    return ownerType === 'guest' ? exports.WEBSCRAPER_CONFIG.guestLimit : exports.WEBSCRAPER_CONFIG.userLimit;
}
