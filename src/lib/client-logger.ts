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

interface QueuedEntry {
  level: LogLevel;
  message: string;
  context?: ClientLogContext;
}

class ClientLogger {
  private queue: QueuedEntry[] = [];
  private flushTimer: number | null = null;
  private readonly FLUSH_INTERVAL_MS = 1000; // 1s
  private readonly MAX_BATCH = 20;

  private scheduleFlush() {
    if (this.flushTimer != null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  private async flush() {
    if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') {
      this.queue = [];
      return;
    }
    if (this.queue.length === 0) return;
    const entries = this.queue.splice(0, this.MAX_BATCH);
    try {
      await fetch('/api/debug/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Log': '1' },
        body: JSON.stringify({ entries }),
        keepalive: true as any, // tolerated; some environments ignore it
      });
    } catch {
      // Drop on failure; avoid loops/noise
    }
    // If more remain, schedule next flush soon
    if (this.queue.length > 0) this.scheduleFlush();
  }

  private enqueue(level: LogLevel, message: string, context?: ClientLogContext) {
    if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;
    this.queue.push({ level, message, context });
    if (this.queue.length >= this.MAX_BATCH) {
      void this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  info(message: string, context?: ClientLogContext) {
    this.enqueue('info', message, context);
  }

  warn(message: string, context?: ClientLogContext) {
    this.enqueue('warn', message, context);
  }

  error(message: string, context?: ClientLogContext) {
    this.enqueue('error', message, context);
  }

  debug(message: string, context?: ClientLogContext) {
    this.enqueue('debug', message, context);
  }

  log(message: string, context?: ClientLogContext) {
    this.enqueue('log', message, context);
  }
}

export const clientLogger = new ClientLogger();
