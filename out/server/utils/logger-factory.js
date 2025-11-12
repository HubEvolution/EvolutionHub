'use strict';
/**
 * Logger-Factory für Evolution Hub
 * Zentrale Verwaltung und Erstellung aller Logger-Typen
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.environmentDetector = exports.loggerFactory = void 0;
const logging_1 = require('../../config/logging');
const logger_1 = require('@/server/utils/logger');
/**
 * Umgebungs-Detektor Implementierung
 */
class EnvironmentDetectorImpl {
  isDevelopment() {
    return logging_1.LOG_CONFIG.environment.isDevelopment();
  }
  isProduction() {
    return logging_1.LOG_CONFIG.environment.isProduction();
  }
  isWrangler() {
    return logging_1.LOG_CONFIG.environment.isWrangler();
  }
  isAstroDev() {
    return logging_1.LOG_CONFIG.environment.isAstroDev();
  }
  getEnvironmentName() {
    if (this.isAstroDev()) return 'astro-dev';
    if (this.isWrangler()) return 'wrangler';
    if (this.isDevelopment()) return 'development';
    if (this.isProduction()) return 'production';
    return 'unknown';
  }
}
/**
 * Einfacher Konsolen-Logger für Fallback
 */
class ConsoleLogger {
  constructor(context = {}) {
    this.context = {};
    this.context = context;
  }
  log(level, message, context) {
    if (!logging_1.LogUtils.isLogLevelEnabled(level)) return;
    const timestamp = new Date().toISOString();
    const ctx = logging_1.LogUtils.createLogContext({ ...this.context, ...context });
    const sanitizedContext = logging_1.LogUtils.sanitizeObject(ctx);
    const consoleMethod = level === logging_1.LOG_LEVELS.LOG ? 'log' : level;
    const method =
      consoleMethod === 'debug' ||
      consoleMethod === 'info' ||
      consoleMethod === 'warn' ||
      consoleMethod === 'error'
        ? consoleMethod
        : 'log';
    const fn = console[method];
    fn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, sanitizedContext);
  }
  debug(message, context) {
    this.log(logging_1.LOG_LEVELS.DEBUG, message, context);
  }
  info(message, context) {
    this.log(logging_1.LOG_LEVELS.INFO, message, context);
  }
  warn(message, context) {
    this.log(logging_1.LOG_LEVELS.WARN, message, context);
  }
  error(message, context) {
    this.log(logging_1.LOG_LEVELS.ERROR, message, context);
  }
  createChildLogger(context) {
    return new ConsoleLogger({ ...this.context, ...context });
  }
  setLogLevel(_level) {
    // LogLevel wird nicht verwendet, da LogUtils.isLogLevelEnabled verwendet wird
  }
  isLogLevelEnabled(level) {
    return logging_1.LogUtils.isLogLevelEnabled(level);
  }
  async flush() {
    // Konsolen-Logger braucht kein Flush
  }
}
/**
 * Logger-Factory Implementierung
 */
class LoggerFactoryImpl {
  constructor() {
    this.environmentDetector = new EnvironmentDetectorImpl();
  }
  createLogger(name, _config) {
    // Config wird für spätere Implementierung gespeichert
    // Für Entwicklung: Konsolen-Logger mit zusätzlichem Context
    if (this.environmentDetector.isDevelopment()) {
      return new ConsoleLogger({ resource: name });
    }
    // Für Produktion: Erweiterter Logger (falls verfügbar)
    // Hier könnte später der vollständige Logger integriert werden
    return new ConsoleLogger({ resource: name });
  }
  createSecurityLogger(_config) {
    // Config wird für spätere Implementierung gespeichert
    // Implementierung über zentrale Log-Pipeline
    return {
      logSecurityEvent: (type, details, context) => {
        (0, logger_1.log)('info', 'SECURITY_EVENT', {
          type,
          details,
          ...(context || {}),
          timestamp: Date.now(),
        });
      },
      logAuthSuccess: (details, context) => {
        (0, logger_1.log)('info', 'AUTH_SUCCESS', {
          securityEventType: 'AUTH_SUCCESS',
          details,
          ...(context || {}),
          timestamp: Date.now(),
        });
      },
      logAuthFailure: (details, context) => {
        (0, logger_1.log)('error', 'AUTH_FAILURE', {
          securityEventType: 'AUTH_FAILURE',
          details,
          ...(context || {}),
          timestamp: Date.now(),
        });
      },
      logApiAccess: (details, context) => {
        (0, logger_1.log)('info', 'API_ACCESS', {
          securityEventType: 'API_ACCESS',
          details,
          ...(context || {}),
          timestamp: Date.now(),
        });
      },
      logApiError: (details, context) => {
        (0, logger_1.log)('error', 'API_ERROR', {
          securityEventType: 'API_ERROR',
          details,
          ...(context || {}),
          timestamp: Date.now(),
        });
      },
    };
  }
  createWebSocketLogger(_port) {
    // Port wird für spätere Implementierung gespeichert
    // Placeholder für WebSocket-Logger
    // Wird in Phase 2 implementiert
    return {
      broadcast: (message) => {
        console.log(`[WS] Broadcasting: ${message}`);
      },
      sendToClient: (clientId, message) => {
        console.log(`[WS] Sending to ${clientId}: ${message}`);
      },
      getConnectedClients: () => [],
      close: () => {
        console.log('[WS] Closing WebSocket server');
      },
    };
  }
  createBufferLogger(_config) {
    // Config wird für spätere Implementierung gespeichert
    // Placeholder für Buffer-Logger
    // Wird in Phase 2 implementiert
    return {
      add: (entry) => {
        console.log('[BUFFER] Adding entry:', entry);
      },
      flush: async () => {
        console.log('[BUFFER] Flushing buffer');
      },
      clear: () => {
        console.log('[BUFFER] Clearing buffer');
      },
      getSize: () => 0,
      isFull: () => false,
    };
  }
}
/**
 * Logger-Manager Implementierung
 */
class LoggerManagerImpl {
  constructor() {
    this.factory = new LoggerFactoryImpl();
    this.loggers = new Map();
  }
  getLogger(name) {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, this.factory.createLogger(name));
    }
    return this.loggers.get(name);
  }
  getSecurityLogger() {
    if (!this.securityLogger) {
      this.securityLogger = this.factory.createSecurityLogger();
    }
    return this.securityLogger;
  }
  getWebSocketLogger() {
    if (!this.webSocketLogger) {
      this.webSocketLogger = this.factory.createWebSocketLogger(8081);
    }
    return this.webSocketLogger;
  }
  getBufferLogger() {
    if (!this.bufferLogger) {
      this.bufferLogger = this.factory.createBufferLogger();
    }
    return this.bufferLogger;
  }
  configure(config) {
    // Konfiguration anwenden
    console.log('[LoggerManager] Applying configuration:', config);
  }
  async shutdown() {
    console.log('[LoggerManager] Shutting down all loggers');
    // WebSocket-Logger schließen
    if (this.webSocketLogger) {
      this.webSocketLogger.close();
    }
    // Buffer flushen
    if (this.bufferLogger) {
      await this.bufferLogger.flush();
    }
    // Logger-Map leeren
    this.loggers.clear();
    this.securityLogger = undefined;
    this.webSocketLogger = undefined;
    this.bufferLogger = undefined;
  }
}
/**
 * Singleton-Instanz des Logger-Managers
 */
const loggerManager = new LoggerManagerImpl();
/**
 * Export der Factory-Funktionen
 */
exports.loggerFactory = {
  createLogger: (name, _config) => loggerManager.getLogger(name),
  createSecurityLogger: (_config) => loggerManager.getSecurityLogger(),
  createWebSocketLogger: (_port) => loggerManager.getWebSocketLogger(),
  createBufferLogger: (_config) => loggerManager.getBufferLogger(),
  getManager: () => loggerManager,
  shutdown: () => loggerManager.shutdown(),
};
/**
 * Export der Environment-Detektor Instanz
 */
exports.environmentDetector = new EnvironmentDetectorImpl();
