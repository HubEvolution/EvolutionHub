"use strict";
/**
 * Client-side logger utility
 * Sends logs to the debug panel via /api/debug/client-log
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientLogger = void 0;
class ClientLogger {
    constructor() {
        this.queue = [];
        this.flushTimer = null;
        this.FLUSH_INTERVAL_MS = 1000; // 1s
        this.MAX_BATCH = 20;
    }
    scheduleFlush() {
        if (this.flushTimer != null)
            return;
        this.flushTimer = window.setTimeout(() => {
            this.flushTimer = null;
            void this.flush();
        }, this.FLUSH_INTERVAL_MS);
    }
    async flush() {
        if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') {
            this.queue = [];
            return;
        }
        if (this.queue.length === 0)
            return;
        const entries = this.queue.splice(0, this.MAX_BATCH);
        try {
            await fetch('/api/debug/client-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Debug-Log': '1' },
                body: JSON.stringify({ entries }),
                keepalive: true,
            });
        }
        catch {
            // Drop on failure; avoid loops/noise
        }
        // If more remain, schedule next flush soon
        if (this.queue.length > 0)
            this.scheduleFlush();
    }
    enqueue(level, message, context) {
        if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true')
            return;
        this.queue.push({ level, message, context });
        if (this.queue.length >= this.MAX_BATCH) {
            void this.flush();
        }
        else {
            this.scheduleFlush();
        }
    }
    info(message, context) {
        this.enqueue('info', message, context);
    }
    warn(message, context) {
        this.enqueue('warn', message, context);
    }
    error(message, context) {
        this.enqueue('error', message, context);
    }
    debug(message, context) {
        this.enqueue('debug', message, context);
    }
    log(message, context) {
        this.enqueue('log', message, context);
    }
}
exports.clientLogger = new ClientLogger();
