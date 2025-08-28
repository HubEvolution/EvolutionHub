/**
 * Logger-Interface-Definitionen für Evolution Hub
 * Zentralisierte Typen für alle Logging-Komponenten
 */

import { LogContext, LogLevelType, SecurityEventType } from '../config/logging';

/**
 * Basis-Logger Interface
 */
export interface Logger {
  log(level: LogLevelType, message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/**
 * Erweiterte Logger-Funktionen
 */
export interface ExtendedLogger extends Logger {
  createChildLogger(context: Partial<LogContext>): ExtendedLogger;
  setLogLevel(level: LogLevelType): void;
  isLogLevelEnabled(level: LogLevelType): boolean;
  flush(): Promise<void>;
}

/**
 * Security-Logger Interface
 */
export interface SecurityLogger {
  logSecurityEvent(
    type: SecurityEventType,
    details: Record<string, any>,
    context?: Partial<LogContext>
  ): void;
  
  logAuthSuccess(details: Record<string, any>, context?: Partial<LogContext>): void;
  logAuthFailure(details: Record<string, any>, context?: Partial<LogContext>): void;
  logApiAccess(details: Record<string, any>, context?: Partial<LogContext>): void;
  logApiError(details: Record<string, any>, context?: Partial<LogContext>): void;
}

/**
 * WebSocket-Logger Interface
 */
export interface WebSocketLogger {
  broadcast(message: string): void;
  sendToClient(clientId: string, message: string): void;
  getConnectedClients(): string[];
  close(): void;
}

/**
 * Buffer-Logger Interface
 */
export interface BufferLogger {
  add(entry: LogEntry): void;
  flush(): Promise<void>;
  clear(): void;
  getSize(): number;
  isFull(): boolean;
}

/**
 * Log-Eintrag Interface
 */
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevelType;
  message: string;
  context?: LogContext;
  source?: string;
  stackTrace?: string;
}

/**
 * Logger-Konfiguration Interface
 */
export interface LoggerConfig {
  level: LogLevelType;
  enableConsole: boolean;
  enableWebSocket: boolean;
  enableBuffer: boolean;
  enableRedis: boolean;
  bufferSize: number;
  flushInterval: number;
}

/**
 * Logger-Factory Interface
 */
export interface LoggerFactory {
  createLogger(name: string, config?: Partial<LoggerConfig>): ExtendedLogger;
  createSecurityLogger(config?: Partial<LoggerConfig>): SecurityLogger;
  createWebSocketLogger(port: number): WebSocketLogger;
  createBufferLogger(config?: Partial<LoggerConfig>): BufferLogger;
}

/**
 * Umgebungs-Detektion Interface
 */
export interface EnvironmentDetector {
  isDevelopment(): boolean;
  isProduction(): boolean;
  isWrangler(): boolean;
  isAstroDev(): boolean;
  getEnvironmentName(): string;
}

/**
 * Log-Transport Interface
 */
export interface LogTransport {
  name: string;
  send(entry: LogEntry): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Log-Formatter Interface
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
  formatJson(entry: LogEntry): string;
  formatPretty(entry: LogEntry): string;
}

/**
 * Log-Filter Interface
 */
export interface LogFilter {
  shouldLog(entry: LogEntry): boolean;
  filterSensitiveData(data: any): any;
}

/**
 * Performance-Monitor Interface
 */
export interface PerformanceMonitor {
  startTimer(label: string): () => number;
  recordMetric(name: string, value: number): void;
  getMetrics(): Record<string, number>;
}

/**
 * Error-Handler Interface
 */
export interface ErrorHandler {
  handle(error: Error, context?: LogContext): void;
  formatError(error: Error): string;
  extractStackTrace(error: Error): string;
}

/**
 * Logger-Manager Interface
 */
export interface LoggerManager {
  getLogger(name: string): ExtendedLogger;
  getSecurityLogger(): SecurityLogger;
  getWebSocketLogger(): WebSocketLogger;
  getBufferLogger(): BufferLogger;
  configure(config: Partial<LoggerConfig>): void;
  shutdown(): Promise<void>;
}

