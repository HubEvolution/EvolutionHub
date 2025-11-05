"use strict";
// Simplified logger for SSE-based debug panel
// No WebSocket, no Redis - only log buffer for SSE streaming
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
exports.generateRequestId = generateRequestId;
exports.getLogBuffer = getLogBuffer;
exports.clearLogBuffer = clearLogBuffer;
exports.getEnvironmentInfo = getEnvironmentInfo;
exports.registerSSEStream = registerSSEStream;
exports.unregisterSSEStream = unregisterSSEStream;
// Log buffer for SSE streaming
let logBuffer = [];
const MAX_LOG_BUFFER_SIZE = 100;
const activeSSEStreams = new Set();
// Environment detection
function isWranglerEnvironment() {
    // Always enable logging for debug panel
    // This includes local dev (wrangler dev) and all deployment environments
    return true;
}
/**
 * Generate a unique request ID for tracing
 */
function generateRequestId() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
/**
 * Global logging function for the application.
 * Supports different log levels and optional context objects.
 * Logs are stored in buffer for SSE streaming in debug panel.
 *
 * @param level - The log level ('info', 'warn', 'error', 'debug').
 * @param message - The log message.
 * @param contextObject - An optional object containing additional context.
 */
const log = (level, message, contextObject) => {
    const timestamp = new Date().toISOString();
    // Extract special context fields for structured logging
    const reqId = contextObject?.requestId ? `[${contextObject.requestId.substring(0, 8)}]` : '';
    const userId = contextObject?.userId ? `[U:${contextObject.userId}]` : '';
    const duration = contextObject?.duration ? `(${contextObject.duration}ms)` : '';
    let logEntry = `[${timestamp}] [${level.toUpperCase()}]${reqId}${userId} ${message}${duration ? ' ' + duration : ''}`;
    if (contextObject) {
        try {
            // Safely stringify the context object to avoid errors with circular references
            const contextString = JSON.stringify(contextObject, (_key, value) => {
                // Handle potential circular references or large objects
                if (value !== null && typeof value === 'object' && Object.keys(value).length === 0) {
                    return '[empty object]';
                }
                if (typeof value === 'string' && value.length > 100) {
                    return value.substring(0, 100) + '...';
                }
                return value;
            }, 2); // Use 2 spaces for indentation
            logEntry += `\nContext: ${contextString}`;
        }
        catch (error) {
            // Log error during stringification to console for debugging
            if (error instanceof Error) {
                console.error(`Error stringifying context in logger: ${error.message}`);
            }
            else {
                console.error(`Unknown error stringifying context in logger.`);
            }
        }
    }
    // Prepare JSON event payload for SSE/buffer
    const event = {
        type: 'log',
        timestamp,
        level,
        message,
        source: typeof contextObject?.source === 'string' ? contextObject.source : 'server',
        context: contextObject ? contextObject : undefined,
    };
    const eventJson = JSON.stringify(event);
    // Add to buffer for SSE streaming (JSON)
    if (isWranglerEnvironment()) {
        logBuffer.push(eventJson);
        // Maintain buffer size limit
        if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
            logBuffer = logBuffer.slice(-MAX_LOG_BUFFER_SIZE);
        }
        // Broadcast to all active SSE streams in real-time (JSON)
        broadcastLogToStreams(eventJson);
    }
    // Log to console
    switch (level) {
        case 'info':
            console.info(logEntry);
            break;
        case 'warn':
            console.warn(logEntry);
            break;
        case 'error':
            console.error(logEntry);
            break;
        case 'debug':
            console.debug(logEntry);
            break;
        default:
            console.log(logEntry);
    }
};
exports.log = log;
/**
 * Export functions for SSE access to log buffer
 */
function getLogBuffer() {
    return [...logBuffer]; // Return copy to prevent external modifications
}
function clearLogBuffer() {
    logBuffer = [];
}
function getEnvironmentInfo() {
    return {
        isWranglerEnvironment: isWranglerEnvironment(),
        logBufferSize: logBuffer.length,
        activeStreams: activeSSEStreams.size,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Register an SSE stream controller for live log broadcasting
 */
function registerSSEStream(controller) {
    // Wrap controller with alive flag; use a new object reference to avoid Set collisions
    activeSSEStreams.add({ ctrl: controller, alive: true });
}
/**
 * Unregister an SSE stream controller
 */
function unregisterSSEStream(controller) {
    // Mark matching entries dead and remove them
    for (const item of Array.from(activeSSEStreams)) {
        if (item.ctrl === controller) {
            item.alive = false;
            activeSSEStreams.delete(item);
        }
    }
}
/**
 * Broadcast a log entry to all active SSE streams
 */
function broadcastLogToStreams(logEntry) {
    const encoder = new TextEncoder();
    const sseData = `data: ${logEntry}\n\n`;
    const encodedData = encoder.encode(sseData);
    // Work on a snapshot to avoid mutation during iteration
    const snapshot = Array.from(activeSSEStreams);
    for (const item of snapshot) {
        if (!item.alive) {
            activeSSEStreams.delete(item);
            continue;
        }
        try {
            // Guard against unexpected ctrl state in dev runtime
            if (typeof item.ctrl.enqueue ===
                'function') {
                item.ctrl.enqueue(encodedData);
            }
            else {
                activeSSEStreams.delete(item);
            }
        }
        catch {
            // Stream closed or errored - remove it
            item.alive = false;
            activeSSEStreams.delete(item);
        }
    }
}
