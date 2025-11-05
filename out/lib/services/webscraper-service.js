"use strict";
/**
 * Webscraper Service
 *
 * Core service for URL-based content extraction with robots.txt compliance.
 * Implements modular pipeline: validate, fetch, parse, extract.
 * Tracks usage via KV for guests/users with daily quotas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebscraperService = void 0;
const logger_factory_1 = require("@/server/utils/logger-factory");
const cheerio = require("cheerio");
const webscraper_1 = require("@/config/webscraper");
class WebscraperService {
    constructor(env) {
        this.env = env;
        this.log = logger_factory_1.loggerFactory.createLogger('webscraper-service');
        this.publicFlag = this.env.PUBLIC_WEBSCRAPER_V1 !== 'false';
    }
    // Safe logger helpers
    logInfo(event, data) {
        try {
            void (this.log?.info ? this.log.info(event, data) : this.log?.log?.(event, data));
        }
        catch {
            // Ignore logging failures
        }
    }
    logWarn(event, data) {
        try {
            void (this.log?.warn ? this.log.warn(event, data) : this.log?.info?.(event, data));
        }
        catch {
            // Ignore logging failures
        }
    }
    logError(event, data) {
        try {
            void (this.log?.error ? this.log.error(event, data) : this.log?.info?.(event, data));
        }
        catch {
            // Ignore logging failures
        }
    }
    /**
     * Validate URL format and security
     */
    validateUrl(url) {
        if (!url || url.length > webscraper_1.WEBSCRAPER_CONFIG.maxUrlLength) {
            return { valid: false, error: 'URL too long or empty' };
        }
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        }
        catch {
            return { valid: false, error: 'Invalid URL format' };
        }
        if (!webscraper_1.ALLOWED_SCHEMES.includes(parsedUrl.protocol)) {
            return { valid: false, error: 'Only HTTP/HTTPS URLs are allowed' };
        }
        const hostname = parsedUrl.hostname.toLowerCase();
        // Block IP-literal hosts (IPv4/IPv6) and enforce port allowlist (80/443)
        const isIPv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
        const isIPv6Like = hostname.includes(':'); // WHATWG URL strips brackets from hostname
        if (isIPv4 || isIPv6Like) {
            return { valid: false, error: 'IP literal hosts are not allowed' };
        }
        const port = parsedUrl.port;
        if (port && port !== '80' && port !== '443') {
            return { valid: false, error: 'Only ports 80/443 are allowed' };
        }
        // Block self-scraping of our own domains to avoid recursive fetches
        const isOwnDomain = hostname === 'hub-evolution.com' || hostname.endsWith('.hub-evolution.com');
        if (isOwnDomain) {
            return { valid: false, error: 'Self-scraping this site is not supported' };
        }
        if (webscraper_1.BLOCKED_DOMAINS.some((blocked) => hostname.includes(blocked))) {
            return { valid: false, error: 'URL domain is blocked' };
        }
        return { valid: true };
    }
    /**
     * Check robots.txt compliance
     */
    async checkRobotsTxt(url) {
        if (!webscraper_1.WEBSCRAPER_CONFIG.respectRobotsTxt) {
            return true;
        }
        try {
            const parsedUrl = new URL(url);
            const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for robots.txt
            const response = await fetch(robotsUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': webscraper_1.WEBSCRAPER_CONFIG.userAgent,
                },
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                // If robots.txt doesn't exist, allow scraping
                return true;
            }
            const robotsTxt = await response.text();
            const rules = this.parseRobotsTxt(robotsTxt);
            // Check if our user agent or * is disallowed for this path
            const path = parsedUrl.pathname || '/';
            const ourRule = rules.find((r) => r.userAgent.toLowerCase() === 'evolutionhub-scraper') ||
                rules.find((r) => r.userAgent === '*');
            if (ourRule) {
                // Check if path is explicitly disallowed
                const isDisallowed = ourRule.disallow.some((pattern) => {
                    if (pattern === '/')
                        return true; // Disallow all
                    return path.startsWith(pattern);
                });
                if (isDisallowed) {
                    // Check if it's explicitly allowed (allow overrides disallow)
                    const isAllowed = ourRule.allow.some((pattern) => path.startsWith(pattern));
                    return isAllowed;
                }
            }
            return true;
        }
        catch (error) {
            this.logWarn('robots_txt_check_failed', {
                url,
                error: error.message,
            });
            // On error, allow scraping (fail open)
            return true;
        }
    }
    /**
     * Parse robots.txt content
     */
    parseRobotsTxt(content) {
        const rules = [];
        let currentRule = null;
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const [key, ...valueParts] = trimmed.split(':');
            const value = valueParts.join(':').trim();
            if (key.toLowerCase() === 'user-agent') {
                if (currentRule && currentRule.userAgent) {
                    rules.push(currentRule);
                }
                currentRule = { userAgent: value, allow: [], disallow: [] };
            }
            else if (currentRule) {
                if (key.toLowerCase() === 'disallow' && value) {
                    currentRule.disallow = currentRule.disallow || [];
                    currentRule.disallow.push(value);
                }
                else if (key.toLowerCase() === 'allow' && value) {
                    currentRule.allow = currentRule.allow || [];
                    currentRule.allow.push(value);
                }
                else if (key.toLowerCase() === 'crawl-delay') {
                    currentRule.crawlDelay = parseInt(value, 10) || undefined;
                }
            }
        }
        if (currentRule && currentRule.userAgent) {
            rules.push(currentRule);
        }
        return rules;
    }
    /**
     * Fetch HTML content from URL
     */
    async fetchHtml(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), webscraper_1.WEBSCRAPER_CONFIG.timeout);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': webscraper_1.WEBSCRAPER_CONFIG.userAgent,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
                },
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
                throw new Error('Content-Type is not HTML');
            }
            const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
            if (contentLength > webscraper_1.WEBSCRAPER_CONFIG.maxSizeBytes) {
                throw new Error('Content too large');
            }
            const html = await response.text();
            if (html.length > webscraper_1.WEBSCRAPER_CONFIG.maxSizeBytes) {
                throw new Error('Content exceeds size limit');
            }
            return html;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    /**
     * Parse and extract content from HTML
     */
    parseContent(html, url) {
        const $ = cheerio.load(html);
        // Extract title
        const title = $('title').first().text().trim().slice(0, webscraper_1.EXTRACTION_LIMITS.titleMaxLength) ||
            'Untitled Page';
        // Extract meta description
        const description = $('meta[name="description"]')
            .attr('content')
            ?.trim()
            .slice(0, webscraper_1.EXTRACTION_LIMITS.descriptionMaxLength) ||
            $('meta[property="og:description"]')
                .attr('content')
                ?.trim()
                .slice(0, webscraper_1.EXTRACTION_LIMITS.descriptionMaxLength) ||
            undefined;
        // Extract metadata
        const metadata = {
            author: $('meta[name="author"]').attr('content')?.trim(),
            publishDate: $('meta[property="article:published_time"]').attr('content')?.trim(),
            language: $('html').attr('lang')?.trim() ||
                $('meta[http-equiv="content-language"]').attr('content')?.trim(),
            charset: $('meta[charset]').attr('charset')?.trim() || 'UTF-8',
            ogImage: $('meta[property="og:image"]').attr('content')?.trim(),
            ogTitle: $('meta[property="og:title"]').attr('content')?.trim(),
            ogDescription: $('meta[property="og:description"]').attr('content')?.trim(),
            twitterCard: $('meta[name="twitter:card"]').attr('content')?.trim(),
            canonical: $('link[rel="canonical"]').attr('href')?.trim(),
        };
        // Extract body text (prioritize article, main, body)
        let text = '';
        const textElements = $('article, main, body')
            .first()
            .find('p, h1, h2, h3, h4, h5, h6, li')
            .map((_, el) => $(el).text().trim())
            .get()
            .filter((t) => t.length > 0);
        text = textElements.join(' ').slice(0, webscraper_1.EXTRACTION_LIMITS.textMaxLength);
        // Extract links
        const links = $('a[href]')
            .map((_, el) => {
            const href = $(el).attr('href');
            if (!href)
                return null;
            try {
                return new URL(href, url).href;
            }
            catch {
                return null;
            }
        })
            .get()
            .filter((link) => link !== null)
            .slice(0, webscraper_1.EXTRACTION_LIMITS.linksMax);
        // Extract images
        const images = $('img[src]')
            .map((_, el) => {
            const src = $(el).attr('src');
            if (!src)
                return null;
            try {
                return new URL(src, url).href;
            }
            catch {
                return null;
            }
        })
            .get()
            .filter((img) => img !== null)
            .slice(0, webscraper_1.EXTRACTION_LIMITS.linksMax);
        return {
            url,
            title,
            description,
            text,
            metadata,
            links: [...new Set(links)], // Deduplicate
            images: [...new Set(images)], // Deduplicate
            scrapedAt: new Date().toISOString(),
            robotsTxtAllowed: true, // Will be set by scrape method
        };
    }
    /**
     * Get usage from KV
     */
    async getUsage(ownerType, ownerId, limit) {
        const kv = this.env.KV_WEBSCRAPER;
        if (!kv)
            return { used: 0, limit, resetAt: null };
        const key = `webscraper:usage:${ownerType}:${ownerId}`;
        const raw = await kv.get(key);
        if (!raw)
            return { used: 0, limit, resetAt: null };
        try {
            const parsed = JSON.parse(raw);
            return { used: parsed.count || 0, limit, resetAt: parsed.resetAt || null };
        }
        catch {
            return { used: 0, limit, resetAt: null };
        }
    }
    /**
     * Increment usage in KV
     */
    async incrementUsage(ownerType, ownerId, limit) {
        const kv = this.env.KV_WEBSCRAPER;
        if (!kv)
            return { used: 1, limit, resetAt: null };
        const key = `webscraper:usage:${ownerType}:${ownerId}`;
        const now = Date.now();
        const windowMs = 24 * 60 * 60 * 1000; // 24h
        const resetAt = now + windowMs;
        const raw = await kv.get(key);
        let count = 0;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                count = parsed.count || 0;
            }
            catch {
                count = 0;
            }
        }
        count += 1;
        const value = JSON.stringify({ count, resetAt });
        const expiration = Math.floor(resetAt / 1000);
        await kv.put(key, value, { expiration });
        return { used: count, limit, resetAt };
    }
    /**
     * Main scrape method
     */
    async scrape(input, ownerType = 'guest', ownerId, limitOverride) {
        if (!this.publicFlag) {
            const err = new Error('feature_not_enabled');
            err.code = 'feature_disabled';
            this.logWarn('scrape_blocked_by_flag', { ownerType, ownerId: ownerId.slice(-4) });
            throw err;
        }
        const startTime = Date.now();
        const reqId = `scrape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const envGuest = parseInt(this.env.WEBSCRAPER_GUEST_LIMIT || '5', 10);
        const envUser = parseInt(this.env.WEBSCRAPER_USER_LIMIT || '20', 10);
        const limit = typeof limitOverride === 'number' ? limitOverride : ownerType === 'user' ? envUser : envGuest;
        this.logInfo('scrape_requested', {
            reqId,
            hostname: (() => {
                try {
                    return new URL(input.url).hostname;
                }
                catch {
                    return 'invalid-host';
                }
            })(),
            ownerType,
            ownerId: ownerId.slice(-4),
        });
        // Validate URL
        const validation = this.validateUrl(input.url);
        if (!validation.valid) {
            const err = new Error(validation.error);
            err.code = 'validation_error';
            this.logError('scrape_failed', {
                reqId,
                errorKind: 'validation_error',
                url: input.url,
                error: validation.error,
            });
            throw err;
        }
        // Quota check
        const currentUsage = await this.getUsage(ownerType, ownerId, limit);
        if (currentUsage.used >= currentUsage.limit) {
            const err = new Error(`Quota exceeded. Used ${currentUsage.used}/${limit}`);
            err.code = 'quota_exceeded';
            err.details = currentUsage;
            this.logError('scrape_failed', {
                reqId,
                errorKind: 'quota_exceeded',
                url: input.url,
                ownerType,
                ownerId: ownerId.slice(-4),
            });
            throw err;
        }
        // Check robots.txt
        const robotsAllowed = await this.checkRobotsTxt(input.url);
        if (!robotsAllowed) {
            const err = new Error('robots.txt disallows scraping this URL');
            err.code = 'robots_txt_blocked';
            this.logError('scrape_failed', {
                reqId,
                errorKind: 'robots_txt_blocked',
                url: input.url,
            });
            throw err;
        }
        // Fetch HTML
        let html;
        try {
            html = await this.fetchHtml(input.url);
        }
        catch (error) {
            const err = new Error(`Fetch failed: ${error.message}`);
            err.code = 'fetch_error';
            this.logError('scrape_failed', {
                reqId,
                errorKind: 'fetch_error',
                url: input.url,
                error: error.message,
            });
            throw err;
        }
        // Parse content
        let result;
        try {
            result = this.parseContent(html, input.url);
            result.robotsTxtAllowed = robotsAllowed;
        }
        catch (error) {
            const err = new Error(`Parse failed: ${error.message}`);
            err.code = 'parse_error';
            this.logError('scrape_failed', {
                reqId,
                errorKind: 'parse_error',
                url: input.url,
                error: error.message,
            });
            throw err;
        }
        // Increment usage
        const usage = await this.incrementUsage(ownerType, ownerId, limit);
        const latency = Date.now() - startTime;
        this.logInfo('scrape_completed', {
            reqId,
            latency,
            url: input.url,
            titleLength: result.title.length,
            textLength: result.text.length,
            linksCount: result.links.length,
            imagesCount: result.images.length,
        });
        return { result, usage };
    }
    /**
     * Public accessor for current usage without incrementing.
     */
    async getUsagePublic(ownerType, ownerId, limit) {
        return this.getUsage(ownerType, ownerId, limit);
    }
}
exports.WebscraperService = WebscraperService;
