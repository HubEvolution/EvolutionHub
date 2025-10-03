/**
 * Client-side logger utility
 * Sends logs to the debug panel via /api/debug/client-log
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'log';

interface ClientLogContext {
  component?: string;
  action?: string;
  [key: string]: any;
}

class ClientLogger {
  private async sendLog(level: LogLevel, message: string, context?: ClientLogContext) {
    // Only send when debug panel is enabled
    if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;

    try {
      await fetch('/api/debug/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Log': '1' },
        body: JSON.stringify({ level, message, context }),
      });
    } catch (err) {
      // Silently fail - don't want to break app if logging fails
      // NOTE: DO NOT use console.warn here to avoid infinite loop with console interceptor
    }
  }

  info(message: string, context?: ClientLogContext) {
    this.sendLog('info', message, context);
  }

  warn(message: string, context?: ClientLogContext) {
    this.sendLog('warn', message, context);
  }

  error(message: string, context?: ClientLogContext) {
    this.sendLog('error', message, context);
  }

  debug(message: string, context?: ClientLogContext) {
    this.sendLog('debug', message, context);
  }

  log(message: string, context?: ClientLogContext) {
    this.sendLog('log', message, context);
  }
}

export const clientLogger = new ClientLogger();
