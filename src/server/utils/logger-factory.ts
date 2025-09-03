/**
 * Logger-Factory für Evolution Hub
 * Zentrale Verwaltung und Erstellung aller Logger-Typen
 */

import {
  LOG_CONFIG,
  LOG_LEVELS,
  LogUtils,
  type LogLevelType,
  type LogContext
} from '../../config/logging';
import {
  type ExtendedLogger,
  type SecurityLogger,
  type WebSocketLogger,
  type BufferLogger,
  type LoggerConfig,
  type LoggerFactory as LoggerFactoryInterface,
  type EnvironmentDetector,
  type LoggerManager
} from '../../types/logger';
import { log } from '@/server/utils/logger';

/**
 * Umgebungs-Detektor Implementierung
 */
class EnvironmentDetectorImpl implements EnvironmentDetector {
  isDevelopment(): boolean {
    return LOG_CONFIG.environment.isDevelopment();
  }

  isProduction(): boolean {
    return LOG_CONFIG.environment.isProduction();
  }

  isWrangler(): boolean {
    return LOG_CONFIG.environment.isWrangler();
  }

  isAstroDev(): boolean {
    return LOG_CONFIG.environment.isAstroDev();
  }

  getEnvironmentName(): string {
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
class ConsoleLogger implements ExtendedLogger {
  private context: Partial<LogContext> = {};

  constructor(context: Partial<LogContext> = {}) {
    this.context = context;
  }

  log(level: LogLevelType, message: string, context?: LogContext): void {
    if (!LogUtils.isLogLevelEnabled(level)) return;

    const timestamp = new Date().toISOString();
    const ctx = LogUtils.createLogContext({ ...this.context, ...context });
    const sanitizedContext = LogUtils.sanitizeObject(ctx);

    const consoleMethod = level === LOG_LEVELS.LOG ? 'log' : level;
    (console as any)[consoleMethod](
      `[${timestamp}] [${level.toUpperCase()}] ${message}`,
      sanitizedContext
    );
  }

  debug(message: string, context?: LogContext): void {
    this.log(LOG_LEVELS.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LOG_LEVELS.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LOG_LEVELS.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LOG_LEVELS.ERROR, message, context);
  }

  createChildLogger(context: Partial<LogContext>): ExtendedLogger {
    return new ConsoleLogger({ ...this.context, ...context });
  }

  setLogLevel(_level: LogLevelType): void {
    // LogLevel wird nicht verwendet, da LogUtils.isLogLevelEnabled verwendet wird
  }

  isLogLevelEnabled(level: LogLevelType): boolean {
    return LogUtils.isLogLevelEnabled(level);
  }

  async flush(): Promise<void> {
    // Konsolen-Logger braucht kein Flush
  }
}

/**
 * Logger-Factory Implementierung
 */
class LoggerFactoryImpl implements LoggerFactoryInterface {
  private environmentDetector = new EnvironmentDetectorImpl();

  createLogger(name: string, _config?: Partial<LoggerConfig>): ExtendedLogger {
    // Config wird für spätere Implementierung gespeichert
    // Für Entwicklung: Konsolen-Logger mit zusätzlichem Context
    if (this.environmentDetector.isDevelopment()) {
      return new ConsoleLogger({ resource: name });
    }

    // Für Produktion: Erweiterter Logger (falls verfügbar)
    // Hier könnte später der vollständige Logger integriert werden
    return new ConsoleLogger({ resource: name });
  }

  createSecurityLogger(_config?: Partial<LoggerConfig>): SecurityLogger {
    // Config wird für spätere Implementierung gespeichert
    // Implementierung über zentrale Log-Pipeline
    return {
      logSecurityEvent: (type, details, context) => {
        log('info', 'SECURITY_EVENT', { type, details, ...(context || {}), timestamp: Date.now() });
      },
      logAuthSuccess: (details, context) => {
        log('info', 'AUTH_SUCCESS', { securityEventType: 'AUTH_SUCCESS', details, ...(context || {}), timestamp: Date.now() });
      },
      logAuthFailure: (details, context) => {
        log('error', 'AUTH_FAILURE', { securityEventType: 'AUTH_FAILURE', details, ...(context || {}), timestamp: Date.now() });
      },
      logApiAccess: (details, context) => {
        log('info', 'API_ACCESS', { securityEventType: 'API_ACCESS', details, ...(context || {}), timestamp: Date.now() });
      },
      logApiError: (details, context) => {
        log('error', 'API_ERROR', { securityEventType: 'API_ERROR', details, ...(context || {}), timestamp: Date.now() });
      }
    };
  }

  createWebSocketLogger(_port: number): WebSocketLogger {
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
      }
    };
  }

  createBufferLogger(_config?: Partial<LoggerConfig>): BufferLogger {
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
      isFull: () => false
    };
  }
}

/**
 * Logger-Manager Implementierung
 */
class LoggerManagerImpl implements LoggerManager {
  private factory = new LoggerFactoryImpl();
  private loggers = new Map<string, ExtendedLogger>();
  private securityLogger?: SecurityLogger;
  private webSocketLogger?: WebSocketLogger;
  private bufferLogger?: BufferLogger;

  getLogger(name: string): ExtendedLogger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, this.factory.createLogger(name));
    }
    return this.loggers.get(name)!;
  }

  getSecurityLogger(): SecurityLogger {
    if (!this.securityLogger) {
      this.securityLogger = this.factory.createSecurityLogger();
    }
    return this.securityLogger;
  }

  getWebSocketLogger(): WebSocketLogger {
    if (!this.webSocketLogger) {
      this.webSocketLogger = this.factory.createWebSocketLogger(8081);
    }
    return this.webSocketLogger;
  }

  getBufferLogger(): BufferLogger {
    if (!this.bufferLogger) {
      this.bufferLogger = this.factory.createBufferLogger();
    }
    return this.bufferLogger;
  }

  configure(config: Partial<LoggerConfig>): void {
    // Konfiguration anwenden
    console.log('[LoggerManager] Applying configuration:', config);
  }

  async shutdown(): Promise<void> {
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
export const loggerFactory = {
  createLogger: (name: string, _config?: Partial<LoggerConfig>) =>
    loggerManager.getLogger(name),

  createSecurityLogger: (_config?: Partial<LoggerConfig>) =>
    loggerManager.getSecurityLogger(),

  createWebSocketLogger: (_port: number) =>
    loggerManager.getWebSocketLogger(),

  createBufferLogger: (_config?: Partial<LoggerConfig>) =>
    loggerManager.getBufferLogger(),

  getManager: () => loggerManager,

  shutdown: () => loggerManager.shutdown()
};

/**
 * Export der Environment-Detektor Instanz
 */
export const environmentDetector = new EnvironmentDetectorImpl();