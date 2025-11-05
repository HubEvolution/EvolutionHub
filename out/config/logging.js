"use strict";
/**
 * Zentrale Logging-Konfiguration für Evolution Hub
 * Definiert alle Logging-bezogenen Einstellungen an einem Ort
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogUtils = exports.SECURITY_EVENTS = exports.LOG_CONFIG = exports.LOG_LEVELS = void 0;
exports.LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    LOG: 'log',
};
/**
 * Umgebungsabhängige Logging-Konfiguration
 */
exports.LOG_CONFIG = {
    // Log-Level pro Umgebung
    levels: {
        development: exports.LOG_LEVELS.DEBUG,
        staging: exports.LOG_LEVELS.INFO,
        production: exports.LOG_LEVELS.WARN,
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
exports.SECURITY_EVENTS = {
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
};
/**
 * Hilfsfunktionen für Logging-Konfiguration
 */
exports.LogUtils = {
    /**
     * Gibt den aktuellen Log-Level basierend auf der Umgebung zurück
     */
    getCurrentLogLevel() {
        const env = process.env.NODE_ENV || 'development';
        return exports.LOG_CONFIG.levels[env] || exports.LOG_LEVELS.INFO;
    },
    /**
     * Prüft ob ein Log-Level aktiviert ist
     */
    isLogLevelEnabled(level) {
        const currentLevel = this.getCurrentLogLevel();
        const levels = [
            exports.LOG_LEVELS.DEBUG,
            exports.LOG_LEVELS.INFO,
            exports.LOG_LEVELS.WARN,
            exports.LOG_LEVELS.ERROR,
            exports.LOG_LEVELS.LOG,
        ];
        return levels.indexOf(level) >= levels.indexOf(currentLevel);
    },
    /**
     * Filtert sensible Daten aus Objekten
     */
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null)
            return obj;
        const sanitized = { ...obj };
        const sensitiveKeys = exports.LOG_CONFIG.filters.sensitiveKeys;
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
    createLogContext(context = {}) {
        return {
            timestamp: new Date(),
            ...context,
        };
    },
};
