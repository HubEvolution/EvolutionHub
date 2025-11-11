/**
 * Logger-Factory für Evolution Hub
 * Zentrale Verwaltung und Erstellung aller Logger-Typen
 */

import {
  LOG_CONFIG,
  LOG_LEVELS,
  LogUtils,
  type LogLevelType,
  type LogContext,
} from '../../config/logging';
import {
  type ExtendedLogger,
  type SecurityLogger,
  type WebSocketLogger,
  type BufferLogger,
  type LoggerConfig,
  type LoggerFactory as LoggerFactoryInterface,
  type EnvironmentDetector,
  type LoggerManager,
} from '../../types/logger';
import { log as sseDebugLog } from '@/server/utils/logger';
import {
  ConsoleTransport,
  HttpTransport,
  AnalyticsTransport,
  R2Transport,
} from '@/server/utils/log-transports';

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
class MultiTransportLogger implements ExtendedLogger {
  private context: Partial<LogContext> = {};
  private transports: Array<{ name: string; send: (entry: any) => Promise<void> }> = [];
  private bridgeSSE: boolean;

  constructor(context: Partial<LogContext> = {}) {
    this.context = context;
    this.transports = this.resolveTransports();
    // Bridge to debug SSE in dev automatically (or if LOG_SSE_BRIDGE=1)
    const bridgeEnv =
      (typeof process !== 'undefined' && process.env.LOG_SSE_BRIDGE) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.LOG_SSE_BRIDGE) ||
      '';
    this.bridgeSSE = LOG_CONFIG.environment.isDevelopment() || String(bridgeEnv) === '1';
  }

  private resolveTransports() {
    const enabled = LOG_CONFIG.transports.getEnabled();
    const out: Array<{ name: string; send: (entry: any) => Promise<void> }> = [];

    for (const t of enabled) {
      if (t === 'console') {
        out.push(new ConsoleTransport());
      } else if (t === 'http') {
        const endpoint =
          (typeof process !== 'undefined' && process.env.LOG_HTTP_ENDPOINT) ||
          (typeof import.meta !== 'undefined' && (import.meta as any).env?.LOG_HTTP_ENDPOINT) ||
          '';
        const apiKey =
          (typeof process !== 'undefined' && process.env.LOG_HTTP_API_KEY) ||
          (typeof import.meta !== 'undefined' && (import.meta as any).env?.LOG_HTTP_API_KEY) ||
          undefined;
        if (endpoint) out.push(new HttpTransport({ endpoint, apiKey }));
      } else if (t === 'analytics') {
        const bindingName =
          (typeof process !== 'undefined' && process.env.LOG_ANALYTICS_BINDING) ||
          (typeof import.meta !== 'undefined' && (import.meta as any).env?.LOG_ANALYTICS_BINDING) ||
          undefined;
        out.push(new AnalyticsTransport(bindingName));
      } else if (t === 'r2' || t === 'logpush') {
        const bucketBinding =
          (typeof process !== 'undefined' && process.env.LOG_R2_BINDING) ||
          (typeof import.meta !== 'undefined' && (import.meta as any).env?.LOG_R2_BINDING) ||
          undefined;
        out.push(new R2Transport(bucketBinding));
      }
    }
    return out;
  }

  private toEntry(level: LogLevelType, message: string, ctx?: LogContext) {
    const merged = LogUtils.createLogContext({ ...this.context, ...ctx });
    const sanitized = LogUtils.sanitizeObject(merged) as LogContext;
    // Prefer worker crypto UUID if available
    const id = (
      globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? (globalThis.crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    ) as string;
    return {
      id,
      timestamp: new Date(),
      level,
      message,
      context: sanitized,
      source: String(this.context.resource || this.context.source || 'server'),
    };
  }

  log(level: LogLevelType, message: string, context?: LogContext): void {
    if (!LogUtils.isLogLevelEnabled(level)) return;
    const entry = this.toEntry(level, message, context);

    // console pretty for local visibility
    const timestamp = entry.timestamp.toISOString();
    const consoleMethod = level === LOG_LEVELS.LOG ? 'log' : level;
    const method: 'log' | 'debug' | 'info' | 'warn' | 'error' =
      consoleMethod === 'debug' ||
      consoleMethod === 'info' ||
      consoleMethod === 'warn' ||
      consoleMethod === 'error'
        ? consoleMethod
        : 'log';
    const fn = (console as any)[method] as (...args: unknown[]) => void;
    try {
      fn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, entry.context);
    } catch {
      /* ignore */
    }

    // Send to transports (fire-and-forget)
    for (const t of this.transports) {
      // ConsoleTransport is effectively no-op
      t.send(entry).catch(() => {});
    }

    // Bridge to SSE debug stream for dev visibility
    if (this.bridgeSSE) {
      try {
        sseDebugLog(level as any, message, { ...(entry.context || {}), source: entry.source });
      } catch {
        /* ignore */
      }
    }
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
    return new MultiTransportLogger({ ...this.context, ...context });
  }

  setLogLevel(_level: LogLevelType): void {
    // Not needed; level evaluation via LogUtils
  }

  isLogLevelEnabled(level: LogLevelType): boolean {
    return LogUtils.isLogLevelEnabled(level);
  }

  async flush(): Promise<void> {
    return;
  }
}

/**
 * Logger-Factory Implementierung
 */
class LoggerFactoryImpl implements LoggerFactoryInterface {
  private environmentDetector = new EnvironmentDetectorImpl();

  createLogger(name: string, _config?: Partial<LoggerConfig>): ExtendedLogger {
    return new MultiTransportLogger({ resource: name });
  }

  createSecurityLogger(_config?: Partial<LoggerConfig>): SecurityLogger {
    const secLogger = new MultiTransportLogger({ resource: 'security' });
    const redacted = (d: Record<string, unknown>) => LogUtils.sanitizeObject(d);
    const base = (extra?: Partial<LogContext>) => ({
      ...(extra || {}),
      timestamp: new Date(),
    });
    return {
      logSecurityEvent: (type, details, context) => {
        secLogger.info('SECURITY_EVENT', {
          ...base(context),
          type,
          details: redacted(details) as any,
        });
      },
      logAuthSuccess: (details, context) => {
        secLogger.info('AUTH_SUCCESS', {
          ...base(context),
          securityEventType: 'AUTH_SUCCESS',
          details: redacted(details) as any,
        });
      },
      logAuthFailure: (details, context) => {
        secLogger.error('AUTH_FAILURE', {
          ...base(context),
          securityEventType: 'AUTH_FAILURE',
          details: redacted(details) as any,
        });
      },
      logApiAccess: (details, context) => {
        secLogger.info('API_ACCESS', {
          ...base(context),
          securityEventType: 'API_ACCESS',
          details: redacted(details) as any,
        });
      },
      logApiError: (details, context) => {
        secLogger.error('API_ERROR', {
          ...base(context),
          securityEventType: 'API_ERROR',
          details: redacted(details) as any,
        });
      },
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
      },
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
      isFull: () => false,
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
  createLogger: (name: string, _config?: Partial<LoggerConfig>) => loggerManager.getLogger(name),

  createSecurityLogger: (_config?: Partial<LoggerConfig>) => loggerManager.getSecurityLogger(),

  createWebSocketLogger: (_port: number) => loggerManager.getWebSocketLogger(),

  createBufferLogger: (_config?: Partial<LoggerConfig>) => loggerManager.getBufferLogger(),

  getManager: () => loggerManager,

  shutdown: () => loggerManager.shutdown(),
};

/**
 * Export der Environment-Detektor Instanz
 */
export const environmentDetector = new EnvironmentDetectorImpl();
