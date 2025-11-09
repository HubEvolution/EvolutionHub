/**
 * Zentrale Logging-Konfiguration für Evolution Hub
 * Definiert alle Logging-bezogenen Einstellungen an einem Ort
 */

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  LOG: 'log';
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  LOG: 'log',
} as const;

export type LogLevelType = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

/**
 * Umgebungsabhängige Logging-Konfiguration
 */
export const LOG_CONFIG = {
  // Log-Level pro Umgebung
  levels: {
    development: LOG_LEVELS.DEBUG,
    staging: LOG_LEVELS.INFO,
    production: LOG_LEVELS.WARN,
  },

  // Filter für sensible Daten
  filters: {
    sensitiveKeys: ['password', 'token', 'secret', 'apiKey', 'privateKey'],
    maxStringLength: 1000,
    maxObjectDepth: 3,
  },

  // Buffer-Konfiguration
  buffer: {
    maxSize: 1000,
    flushInterval: 30000, // 30 Sekunden
    maxRetries: 3,
  },

  // Performance-Einstellungen
  performance: {
    enableMetrics: true,
    enableStackTraces: true,
    enableMemoryMonitoring: false,
  },

  // Umgebungsdetektion
  environment: {
    isDevelopment: () => process.env.NODE_ENV === 'development',
    isProduction: () => process.env.NODE_ENV === 'production',
    isWrangler: () => typeof globalThis !== 'undefined' && 'CF_PAGES' in globalThis,
    isAstroDev: () => typeof import.meta !== 'undefined' && import.meta.env?.DEV === true,
  },
};

/**
 * Security-Event-Typen
 */
export const SECURITY_EVENTS = {
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  API_ERROR: 'API_ERROR',
  API_ACCESS: 'API_ACCESS',
  USER_EVENT: 'USER_EVENT',
  CONFIG_WARNING: 'CONFIG_WARNING',
  CONFIG_CHECK_ERROR: 'CONFIG_CHECK_ERROR',
  EMAIL_ENQUEUED: 'EMAIL_ENQUEUED',
  STAGING_LOG_ERROR: 'STAGING_LOG_ERROR',
} as const;

export type SecurityEventType = (typeof SECURITY_EVENTS)[keyof typeof SECURITY_EVENTS];

/**
 * Logging-Kontext Interface
 */
export interface LogContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  resource?: string;
  action?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Hilfsfunktionen für Logging-Konfiguration
 */
export const LogUtils = {
  /**
   * Gibt den aktuellen Log-Level basierend auf der Umgebung zurück
   */
  getCurrentLogLevel(): LogLevelType {
    const env = process.env.NODE_ENV || 'development';
    return LOG_CONFIG.levels[env as keyof typeof LOG_CONFIG.levels] || LOG_LEVELS.INFO;
  },

  /**
   * Prüft ob ein Log-Level aktiviert ist
   */
  isLogLevelEnabled(level: LogLevelType): boolean {
    const currentLevel = this.getCurrentLogLevel();
    const levels = [
      LOG_LEVELS.DEBUG,
      LOG_LEVELS.INFO,
      LOG_LEVELS.WARN,
      LOG_LEVELS.ERROR,
      LOG_LEVELS.LOG,
    ];
    return levels.indexOf(level) >= levels.indexOf(currentLevel);
  },

  /**
   * Filtert sensible Daten aus Objekten
   */
  sanitizeObject(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = { ...(obj as Record<string, unknown>) };
    const sensitiveKeys = LOG_CONFIG.filters.sensitiveKeys;

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[FILTERED]';
      }
    }

    return sanitized;
  },

  /**
   * Erstellt einen standardisierten Log-Kontext
   */
  createLogContext(context: Partial<LogContext> = {}): LogContext {
    return {
      timestamp: new Date(),
      ...context,
    };
  },
};
