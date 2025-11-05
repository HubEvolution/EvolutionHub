"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = void 0;
exports.createContentService = createContentService;
const astro_content_1 = require("astro:content");
/**
 * Base content service for handling common content operations
 */
class ContentService {
    constructor(collectionName, defaultOptions = {}) {
        this.collectionName = collectionName;
        this.defaultOptions = {
            limit: 10,
            offset: 0,
            includeDrafts: import.meta.env.DEV,
            ...defaultOptions,
        };
    }
    /**
     * Get all entries with optional filtering and sorting
     */
    async getAllEntries(options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const { limit, offset, includeDrafts, ...filters } = mergedOptions;
        let entries = await (0, astro_content_1.getCollection)(this.collectionName, (entry) => {
            // Filter out drafts unless explicitly included
            if (entry.data.draft && !includeDrafts) {
                return false;
            }
            // Apply additional filters
            return Object.entries(filters).every(([key, value]) => {
                if (value === undefined)
                    return true;
                const entryData = entry.data;
                const entryValue = entryData[key];
                if (entryValue === undefined)
                    return true;
                // Handle array values (e.g., tags)
                if (Array.isArray(entryValue)) {
                    return entryValue.includes(value);
                }
                // Handle direct comparison
                return entryValue === value;
            });
        });
        // Sort by updatedDate ?? pubDate in descending order (newest first)
        entries = entries.sort((a, b) => {
            const dateA = new Date((a.data.updatedDate ?? a.data.pubDate)).getTime();
            const dateB = new Date((b.data.updatedDate ?? b.data.pubDate)).getTime();
            return dateB - dateA; // newest first by updatedDate fallback to pubDate
        });
        // Apply pagination
        if (offset !== undefined) {
            entries = entries.slice(offset, (offset || 0) + (limit || entries.length));
        }
        return entries;
    }
    /**
     * Get a paginated result of entries
     */
    async getPaginatedEntries(page = 1, perPage = 10, options = {}) {
        const offset = (page - 1) * perPage;
        const allEntries = await this.getAllEntries({
            ...options,
            limit: perPage,
            offset,
        });
        const total = await this.getTotalCount(options);
        const totalPages = Math.ceil(total / perPage);
        return {
            items: allEntries,
            total,
            page,
            perPage,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
        };
    }
    /**
     * Get the total count of entries matching the filters
     */
    async getTotalCount(filters = {}) {
        const entries = await this.getAllEntries({
            ...filters,
            limit: undefined,
            offset: undefined,
        });
        return entries.length;
    }
    /**
     * Get a single entry by slug
     */
    async getEntryBySlug(slug) {
        const entries = await (0, astro_content_1.getCollection)(this.collectionName, (entry) => entry.slug === slug && (!entry.data.draft || this.defaultOptions.includeDrafts));
        return entries[0];
    }
    /**
     * Get related entries based on tags or categories
     */
    async getRelatedEntries(currentEntry, { limit = 3, ...filters } = {}) {
        const current = currentEntry;
        const currentData = current.data;
        const { tags = [], category } = currentData;
        const allEntries = await this.getAllEntries(filters);
        const allCE = allEntries;
        // Score entries based on tag matches, excluding the current entry
        const scoredEntries = allCE
            .filter((entry) => entry.id !== current.id)
            .map((entry) => {
            const entryData = entry.data;
            const entryTags = entryData.tags || [];
            const tagMatches = entryTags.filter((tag) => tags.includes(tag)).length;
            const categoryMatch = entryData.category === category ? 1 : 0;
            return {
                entry,
                score: tagMatches * 2 + categoryMatch, // Weight tags more than category
            };
        });
        // Sort by score (descending) and take the top N
        return scoredEntries
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((item) => item.entry);
    }
}
exports.ContentService = ContentService;
/**
 * Helper function to get a content service instance
 */
function createContentService(collectionName, options = {}) {
    return new ContentService(collectionName, options);
}
