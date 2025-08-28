// Cloudflare Workers–kompatible Logger-Implementierung (ohne ws/redis)

let logBuffer: string[] = [];
const MAX_LOG_BUFFER_SIZE = 100;

function isAstroDevEnvironment(): boolean {
  // In der Worker-Variante immer false
  return false;
}

function isWranglerEnvironment(): boolean {
  // In der Worker-Variante immer true
  return true;
}

// No-Op im Worker-Kontext
export function initializeLogger(_wss?: unknown): void {
  // keine WebSocket/Redis-Initialisierung im Worker
}

export const log = (level: string, message: string, contextObject?: Record<string, any>): void => {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (contextObject) {
    try {
      const contextString = JSON.stringify(contextObject, (key, value) => {
        if (value !== null && typeof value === 'object' && Object.keys(value).length === 0) return '[empty object]';
        if (typeof value === 'string' && value.length > 100) return value.substring(0, 100) + '...';
        return value;
      }, 2);
      logEntry += `\nContext: ${contextString}`;
    } catch (err) {
      // still log, but don't append error
      console.error('Error stringifying context in worker logger:', err);
    }
  }

  // Buffer für SSE-Auslieferung
  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
    logBuffer = logBuffer.slice(-MAX_LOG_BUFFER_SIZE);
  }

  // Console-Ausgabe
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

export function getLogBuffer(): string[] {
  return [...logBuffer];
}

export function clearLogBuffer(): void {
  logBuffer = [];
}

export function getEnvironmentInfo() {
  return {
    isAstroDevEnvironment: isAstroDevEnvironment(),
    isWranglerEnvironment: isWranglerEnvironment(),
    hasWebSocketServer: false,
    logBufferSize: logBuffer.length,
  };
}
