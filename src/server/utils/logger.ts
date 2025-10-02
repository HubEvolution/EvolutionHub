// Simplified logger for SSE-based debug panel
// No WebSocket, no Redis - only log buffer for SSE streaming

// Log buffer for SSE streaming
let logBuffer: string[] = [];
const MAX_LOG_BUFFER_SIZE = 100;

// Environment detection
function isWranglerEnvironment(): boolean {
  if (typeof process !== 'undefined') {
    return !!(process.env.WRANGLER_REMOTE || process.env.CF_PAGES || process.env.CLOUDFLARE_ENVIRONMENT);
  }
  return true; // Default to Wrangler if no process object (Edge Runtime)
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
export const log = (level: string, message: string, contextObject?: Record<string, any>): void => {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

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
    } catch (error) {
      // Log error during stringification to console for debugging
      if (error instanceof Error) {
        console.error(`Error stringifying context in logger: ${error.message}`);
      } else {
        console.error(`Unknown error stringifying context in logger.`);
      }
    }
  }

  // Add to buffer for SSE streaming
  if (isWranglerEnvironment()) {
    logBuffer.push(logEntry);

    // Maintain buffer size limit
    if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
      logBuffer = logBuffer.slice(-MAX_LOG_BUFFER_SIZE);
    }
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

/**
 * Export functions for SSE access to log buffer
 */
export function getLogBuffer(): string[] {
  return [...logBuffer]; // Return copy to prevent external modifications
}

export function clearLogBuffer(): void {
  logBuffer = [];
}

export function getEnvironmentInfo() {
  return {
    isWranglerEnvironment: isWranglerEnvironment(),
    logBufferSize: logBuffer.length,
    timestamp: new Date().toISOString()
  };
}
