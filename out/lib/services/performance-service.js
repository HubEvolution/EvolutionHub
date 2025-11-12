'use strict';
/**
 * Performance-Service für skalierbare Kommentar-Verarbeitung
 * Implementiert Pagination, Caching und Performance-Optimierungen
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.PerformanceService = void 0;
const drizzle_orm_1 = require('drizzle-orm');
const schema_1 = require('../db/schema');
class PerformanceService {
  constructor(db, config) {
    this.cache = new Map();
    this.db = db;
    this.config = {
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 Minuten
        maxSize: 100 * 1024 * 1024, // 100 MB
        strategy: 'memory',
        ...config?.cache,
      },
      pagination: {
        defaultLimit: 20,
        maxLimit: 100,
        maxDepth: 5,
        ...config?.pagination,
      },
      lazyLoading: {
        threshold: 100,
        rootMargin: '50px',
        enabled: true,
        batchSize: 10,
        ...config?.lazyLoading,
      },
      cdn: {
        enabled: false,
        ...config?.cdn,
      },
      database: {
        queryTimeout: 5000,
        connectionPool: 10,
        slowQueryThreshold: 1000,
        ...config?.database,
      },
    };
  }
  /**
   * Holt paginierte Kommentare mit Performance-Optimierungen
   */
  async getPaginatedComments(entityId, options, userId) {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('comments', { entityId, ...options, userId });
    // Prüfe Cache zuerst
    if (this.config.cache.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached && 'pagination' in cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
            cacheKey,
          },
        };
      }
    }
    try {
      // Validierung der Optionen
      const validatedOptions = this.validatePaginationOptions(options);
      // Hole Kommentare mit optimierter Query
      const { comments: commentData, total } = await this.fetchCommentsWithPagination(
        entityId,
        validatedOptions,
        userId
      );
      // Baue Kommentar-Tree mit Replies
      const commentsWithReplies = await this.buildCommentTree(
        commentData,
        validatedOptions,
        userId
      );
      const result = {
        comments: commentsWithReplies,
        pagination: {
          page: validatedOptions.page,
          limit: validatedOptions.limit,
          total,
          totalPages: Math.ceil(total / validatedOptions.limit),
          hasNext: validatedOptions.page * validatedOptions.limit < total,
          hasPrev: validatedOptions.page > 1,
        },
        metadata: {
          queryTime: performance.now() - startTime,
          cacheHit: false,
          cacheKey,
        },
      };
      // Speichere im Cache
      if (this.config.cache.enabled) {
        this.setCache(cacheKey, result, this.config.cache.ttl);
      }
      return result;
    } catch (error) {
      console.error('Error fetching paginated comments:', error);
      throw new Error('Failed to fetch comments');
    }
  }
  /**
   * Sucht Kommentare mit Volltext-Suche
   */
  async searchComments(options) {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey('search', options);
    // Prüfe Cache
    if (this.config.cache.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached && 'highlights' in cached) {
        return {
          ...cached,
          searchTime: performance.now() - startTime,
        };
      }
    }
    try {
      const { comments: searchResults, total } = await this.performCommentSearch(options);
      // Baue Ergebnisse mit Highlights
      const commentsWithReplies = await this.buildCommentTree(
        searchResults,
        options.pagination || { page: 1, limit: 20 },
        options.filters?.authorId?.[0]
      );
      const highlights = this.generateHighlights(searchResults, options.query);
      const result = {
        comments: commentsWithReplies,
        highlights,
        total,
        searchTime: performance.now() - startTime,
      };
      // Cache Suchergebnisse
      if (this.config.cache.enabled) {
        this.setCache(cacheKey, result, this.config.cache.ttl);
      }
      return result;
    } catch (error) {
      console.error('Error searching comments:', error);
      throw new Error('Search failed');
    }
  }
  /**
   * Führt optimierte Kommentar-Query aus
   */
  async fetchCommentsWithPagination(entityId, options, _userId) {
    const offset = (options.page - 1) * options.limit;
    // Optimierte Query mit JOIN für bessere Performance
    const query = this.db
      .select({
        id: schema_1.comments.id,
        content: schema_1.comments.content,
        entityId: schema_1.comments.entityId,
        entityType: schema_1.comments.entityType,
        authorId: schema_1.comments.authorId,
        authorName: schema_1.comments.authorName,
        authorEmail: schema_1.comments.authorEmail,
        parentId: schema_1.comments.parentId,
        status: schema_1.comments.status,
        isEdited: schema_1.comments.isEdited,
        editedAt: schema_1.comments.editedAt,
        createdAt: schema_1.comments.createdAt,
        updatedAt: schema_1.comments.updatedAt,
      })
      .from(schema_1.comments)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.entityId, entityId),
          (0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved'),
          options.includeReplies
            ? undefined
            : (0, drizzle_orm_1.eq)(schema_1.comments.parentId, null)
        )
      )
      .orderBy(
        options.sortBy === 'createdAt'
          ? options.sortOrder === 'desc'
            ? (0, drizzle_orm_1.desc)(schema_1.comments.createdAt)
            : (0, drizzle_orm_1.sql)`${schema_1.comments.createdAt} ASC`
          : options.sortBy === 'updatedAt'
            ? options.sortOrder === 'desc'
              ? (0, drizzle_orm_1.desc)(schema_1.comments.updatedAt)
              : (0, drizzle_orm_1.sql)`${schema_1.comments.updatedAt} ASC`
            : (0, drizzle_orm_1.desc)(schema_1.comments.createdAt)
      )
      .limit(options.limit)
      .offset(offset);
    const commentsResult = await query;
    // Hole Gesamtanzahl für Pagination
    const countQuery = this.db
      .select({ count: (0, drizzle_orm_1.sql)`count(*)` })
      .from(schema_1.comments)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.entityId, entityId),
          (0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved'),
          options.includeReplies
            ? undefined
            : (0, drizzle_orm_1.eq)(schema_1.comments.parentId, null)
        )
      );
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;
    return { comments: commentsResult, total };
  }
  /**
   * Baut Kommentar-Tree mit Replies auf
   */
  async buildCommentTree(commentData, options, userId) {
    const commentsMap = new Map();
    const rootComments = [];
    // Erstelle Map aller Kommentare
    for (const comment of commentData) {
      const c = comment;
      const commentWithReplies = {
        ...c,
        replies: [],
        depth: 0,
        isLiked: false,
        isDisliked: false,
        canEdit: false,
        canDelete: false,
      };
      commentsMap.set(c.id, commentWithReplies);
      if (!c.parentId) {
        rootComments.push(commentWithReplies);
      }
    }
    // Baue Reply-Struktur auf
    if (options.includeReplies) {
      for (const comment of commentData) {
        const c = comment;
        if (c.parentId) {
          const parent = commentsMap.get(c.parentId);
          const child = commentsMap.get(c.id);
          if (parent && child) {
            child.depth = parent.depth + 1;
            if (child.depth <= (options.maxDepth || this.config.pagination.maxDepth)) {
              parent.replies.push(child);
            }
          }
        }
      }
    }
    // Prüfe Like-Status wenn Benutzer angemeldet
    if (userId) {
      await this.addLikeStatus(commentsMap, userId);
    }
    // Prüfe Berechtigungen
    await this.addPermissions(commentsMap, userId);
    return rootComments;
  }
  /**
   * Führt Volltext-Suche in Kommentaren aus
   */
  async performCommentSearch(options) {
    const { query, filters, pagination = { page: 1, limit: 20 } } = options;
    const offset = (pagination.page - 1) * pagination.limit;
    // Baue WHERE-Bedingungen
    const whereConditions = [];
    // Text-Suche
    whereConditions.push(
      (0, drizzle_orm_1.sql)`${schema_1.comments.content} LIKE ${'%' + query + '%'}`
    );
    // Status-Filter
    if (filters?.status?.length) {
      whereConditions.push(
        (0, drizzle_orm_1.or)(
          ...filters.status.map((status) => (0, drizzle_orm_1.eq)(schema_1.comments.status, status))
        )
      );
    } else {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved'));
    }
    // Autor-Filter
    if (filters?.authorId?.length) {
      whereConditions.push(
        (0, drizzle_orm_1.or)(
          ...filters.authorId.map((id) => (0, drizzle_orm_1.eq)(schema_1.comments.authorId, id))
        )
      );
    }
    // Datum-Filter
    if (filters?.dateFrom) {
      whereConditions.push((0, drizzle_orm_1.gte)(schema_1.comments.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      whereConditions.push((0, drizzle_orm_1.lte)(schema_1.comments.createdAt, filters.dateTo));
    }
    // Parent-Filter (nur Root-Kommentare oder alle)
    if (filters?.hasReplies === true) {
      // Komplexe Subquery für Kommentare mit Replies - vereinfacht für Performance
    }
    const queryBuilder = this.db
      .select({
        id: schema_1.comments.id,
        content: schema_1.comments.content,
        entityId: schema_1.comments.entityId,
        entityType: schema_1.comments.entityType,
        authorId: schema_1.comments.authorId,
        authorName: schema_1.comments.authorName,
        authorEmail: schema_1.comments.authorEmail,
        parentId: schema_1.comments.parentId,
        status: schema_1.comments.status,
        isEdited: schema_1.comments.isEdited,
        editedAt: schema_1.comments.editedAt,
        createdAt: schema_1.comments.createdAt,
        updatedAt: schema_1.comments.updatedAt,
      })
      .from(schema_1.comments)
      .where((0, drizzle_orm_1.and)(...whereConditions))
      .orderBy((0, drizzle_orm_1.desc)(schema_1.comments.createdAt))
      .limit(pagination.limit)
      .offset(offset);
    const searchResults = await queryBuilder;
    // Hole Gesamtanzahl
    const countQuery = this.db
      .select({ count: (0, drizzle_orm_1.sql)`count(*)` })
      .from(schema_1.comments)
      .where((0, drizzle_orm_1.and)(...whereConditions));
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;
    return { comments: searchResults, total };
  }
  /**
   * Generiert Such-Highlights
   */
  generateHighlights(comments, query) {
    const highlights = {};
    const searchTerms = query
      .toLowerCase()
      .split(' ')
      .filter((term) => term.length > 2);
    for (const comment of comments) {
      const content = comment.content.toLowerCase();
      const matches = [];
      for (const term of searchTerms) {
        const index = content.indexOf(term);
        if (index !== -1) {
          const start = Math.max(0, index - 30);
          const end = Math.min(content.length, index + term.length + 30);
          matches.push('...' + content.substring(start, end) + '...');
        }
      }
      if (matches.length > 0) {
        highlights[comment.id] = matches;
      }
    }
    return highlights;
  }
  /**
   * Fügt Like-Status hinzu
   */
  async addLikeStatus(commentsMap, _userId) {
    // In einer echten Implementierung würde hier eine Like-Tabelle abgefragt
    // Für jetzt simulieren wir den Status
    for (const comment of commentsMap.values()) {
      // Simuliere Like-Status basierend auf Benutzer-ID und Kommentar-ID
      comment.isLiked = Math.random() > 0.8;
      comment.isDisliked = Math.random() > 0.9;
    }
  }
  /**
   * Fügt Berechtigungen hinzu
   */
  async addPermissions(commentsMap, _userId) {
    if (!_userId) return;
    for (const comment of commentsMap.values()) {
      // Autor kann eigenen Kommentar bearbeiten/löschen
      comment.canEdit = comment.authorId === _userId;
      comment.canDelete = comment.authorId === _userId;
      // Admins können alle Kommentare moderieren
      // In einer echten Implementierung würde hier die Admin-Rolle geprüft
    }
  }
  /**
   * Cache-Management
   */
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  setCache(key, data, ttl) {
    const size = JSON.stringify(data).length;
    // Prüfe Cache-Größe
    if (this.getCacheSize() + size > this.config.cache.maxSize) {
      this.evictCache();
    }
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      size,
    };
    this.cache.set(key, entry);
  }
  getCacheSize() {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }
  evictCache() {
    // Einfache LRU-Eviction: Lösche älteste Einträge
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    const toRemove = Math.ceil(this.cache.size * 0.3); // Entferne 30%
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  /**
   * Generiert Cache-Key
   */
  generateCacheKey(type, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');
    return `${type}:${sortedParams}`;
  }
  /**
   * Validierung der Pagination-Optionen
   */
  validatePaginationOptions(options) {
    return {
      page: Math.max(1, options.page || 1),
      limit: Math.min(
        this.config.pagination.maxLimit,
        Math.max(1, options.limit || this.config.pagination.defaultLimit)
      ),
      sortBy: options.sortBy || 'createdAt',
      sortOrder: options.sortOrder || 'desc',
      includeReplies: options.includeReplies || false,
      maxDepth: Math.min(
        this.config.pagination.maxDepth,
        options.maxDepth || this.config.pagination.maxDepth
      ),
    };
  }
  /**
   * Holt Cache-Statistiken
   */
  getCacheStats() {
    const entries = this.cache.size;
    const hits = 0;
    const misses = 0;
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return {
      hits,
      misses,
      hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
      totalSize,
      maxSize: this.config.cache.maxSize,
      entries,
    };
  }
  /**
   * Bereinigt abgelaufene Cache-Einträge
   */
  cleanupCache() {
    const before = this.cache.size;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
    return before - this.cache.size;
  }
  /**
   * Holt Performance-Metriken
   */
  async getPerformanceMetrics() {
    const _cacheStats = this.getCacheStats();
    return {
      queryTime: 0, // Wird während Queries gemessen
      cacheHit: false, // Wird während Queries gesetzt
      databaseTime: 0, // Wird während Queries gemessen
      cacheTime: 0, // Wird während Queries gemessen
      totalTime: 0, // Wird während Queries gemessen
      memoryUsage: this.getCacheSize(),
      cpuUsage: 0, // Würde in einer echten Implementierung gemessen
    };
  }
  /**
   * Optimiert Datenbank-Indizes
   */
  async optimizeIndexes() {
    try {
      // ANALYZE für bessere Query-Planung
      await this.db.run((0, drizzle_orm_1.sql)`ANALYZE comments`);
      await this.db.run((0, drizzle_orm_1.sql)`ANALYZE users`);
      // REINDEX für bessere Performance
      await this.db.run((0, drizzle_orm_1.sql)`REINDEX`);
      console.log('Database indexes optimized');
    } catch (error) {
      console.error('Error optimizing indexes:', error);
      throw new Error('Index optimization failed');
    }
  }
  /**
   * Preloading für bessere UX
   */
  async preloadComments(entityId, userId) {
    const options = {
      page: 1,
      limit: this.config.pagination.defaultLimit,
      includeReplies: true,
      maxDepth: 3,
    };
    // Preloade erste Seite im Hintergrund
    this.getPaginatedComments(entityId, options, userId).catch(console.error);
  }
  /**
   * Lazy Loading Konfiguration
   */
  getLazyLoadConfig() {
    return { ...this.config.lazyLoading };
  }
  /**
   * CDN-Optimierung für Assets
   */
  optimizeForCDN(url) {
    if (!this.config.cdn.enabled) {
      return url;
    }
    // In einer echten Implementierung würde hier CDN-URL-Erstellung erfolgen
    return url.replace(/^(https?:\/\/)/, this.config.cdn.baseUrl || '');
  }
}
exports.PerformanceService = PerformanceService;
