import type { ExtendedLogger } from '@/types/logger';
import type { LogContext, LogLevelType } from '@/config/logging';

type SafeLogMethod = (message: string, context?: LogContext) => void;

type SafeLogger = Record<LogLevelType, SafeLogMethod> & {
  log?: SafeLogMethod;
};

function isExtendedLogger(log: unknown): log is ExtendedLogger {
  return Boolean(
    log &&
      typeof log === 'object' &&
      'info' in log &&
      'warn' in log &&
      'error' in log &&
      'debug' in log
  );
}

function safeMethod(logger: SafeLogger | undefined, level: LogLevelType): SafeLogMethod | null {
  if (!logger) return null;
  if (typeof logger[level] === 'function') {
    return logger[level].bind(logger);
  }
  if (typeof logger.log === 'function') {
    return logger.log.bind(logger, level);
  }
  return null;
}

export function logWithFallback(
  logger: ExtendedLogger | undefined,
  level: LogLevelType,
  message: string,
  context?: LogContext
): void {
  try {
    const candidate = isExtendedLogger(logger) ? (logger as unknown as SafeLogger) : undefined;
    const method = safeMethod(candidate, level);
    if (method) {
      method(message, context);
    }
  } catch {
    // intentionally swallow logging errors
  }
}

export const loggerHelpers = {
  info(logger: ExtendedLogger | undefined, message: string, context?: LogContext): void {
    logWithFallback(logger, 'info', message, context);
  },
  warn(logger: ExtendedLogger | undefined, message: string, context?: LogContext): void {
    logWithFallback(logger, 'warn', message, context);
  },
  error(logger: ExtendedLogger | undefined, message: string, context?: LogContext): void {
    logWithFallback(logger, 'error', message, context);
  },
  debug(logger: ExtendedLogger | undefined, message: string, context?: LogContext): void {
    logWithFallback(logger, 'debug', message, context);
  },
};
