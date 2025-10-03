/**
 * TypeScript-Typdefinitionen für Performance & Skalierung
 * Kommentar-Pagination, Caching und Optimierungen
 */

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'likes' | 'replies';
  sortOrder?: 'asc' | 'desc';
  includeReplies?: boolean;
  maxDepth?: number;
}

export interface PaginatedComments {
  comments: CommentWithReplies[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata: {
    queryTime: number;
    cacheHit: boolean;
    cacheKey?: string;
  };
}

export interface CommentWithReplies {
  id: string;
  content: string;
  postId?: string;
  authorId: number;
  parentId?: string;
  status: string;
  likes: number;
  dislikes: number;
  createdAt: number;
  updatedAt?: number;
  author?: {
    id: number;
    name?: string;
    avatar?: string;
  };
  replies?: CommentWithReplies[];
  depth: number;
  isLiked?: boolean;
  isDisliked?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  maxSize: number;
  entries: number;
}

export interface PerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  databaseTime: number;
  cacheTime?: number;
  totalTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  batchSize?: number;
}

export interface CommentFilter {
  status?: string[];
  authorId?: number[];
  dateFrom?: number;
  dateTo?: number;
  hasReplies?: boolean;
  minLikes?: number;
  search?: string;
}

export interface CommentSearchOptions {
  query: string;
  filters?: CommentFilter;
  pagination?: PaginationOptions;
  highlight?: boolean;
}

export interface SearchResult {
  comments: CommentWithReplies[];
  highlights: Record<string, string[]>;
  total: number;
  searchTime: number;
}

export interface CDNConfig {
  enabled: boolean;
  baseUrl?: string;
  fallbackUrl?: string;
  cacheHeaders?: Record<string, string>;
  compression?: boolean;
  optimization?: {
    imageResize?: boolean;
    imageFormat?: 'webp' | 'avif' | 'original';
    lazyLoading?: boolean;
  };
}

export interface PerformanceConfig {
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'memory' | 'redis' | 'hybrid';
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
    maxDepth: number;
  };
  lazyLoading: LazyLoadOptions;
  cdn: CDNConfig;
  database: {
    queryTimeout: number;
    connectionPool: number;
    slowQueryThreshold: number;
  };
}

export interface OptimizationSuggestion {
  type: 'index' | 'cache' | 'query' | 'cdn' | 'pagination';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: 'minimal' | 'moderate' | 'significant' | 'major';
  effort: 'low' | 'medium' | 'high';
  details?: Record<string, unknown>;
}

export interface PerformanceReport {
  period: {
    start: number;
    end: number;
  };
  metrics: {
    averageQueryTime: number;
    cacheHitRate: number;
    totalRequests: number;
    errorRate: number;
    throughput: number;
  };
  suggestions: OptimizationSuggestion[];
  trends: {
    queryTime: number[];
    cacheHitRate: number[];
    requestVolume: number[];
  };
}

export interface LoadTestResult {
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  memoryUsage: number[];
  cpuUsage: number[];
}

export interface ScalabilityMetrics {
  concurrentUsers: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}
