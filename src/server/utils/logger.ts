import { WebSocket, WebSocketServer } from 'ws';
import { createClient } from 'redis';

// Module-level variable to hold the WebSocket server instance
let wssInstance: WebSocketServer | null = null;

// Module-level log buffer for SSE/Polling in Cloudflare environments
let logBuffer: string[] = [];
const MAX_LOG_BUFFER_SIZE = 100; // Keep last 100 logs for SSE

// Redis clients and buffer (separate pub/sub connections per node-redis best practices)
let redisPubClient: any = null;
let redisSubClient: any = null;
let redisInitializing = false;
const redisBuffer: string[] = [];
const MAX_REDIS_BUFFER = 1000;

// Environment detection
function isAstroDevEnvironment(): boolean {
  // Check if we're in standard Node.js Astro dev environment
  if (typeof process !== 'undefined') {
    const isDev = process.env.NODE_ENV === 'development' || process.env.MODE === 'development';
    const isNotWrangler = !process.env.WRANGLER_REMOTE && !process.env.CF_PAGES;
    return isDev && isNotWrangler;
  }
  return false;
}

function isWranglerEnvironment(): boolean {
  // Check if we're in Wrangler/Cloudflare environment
  if (typeof process !== 'undefined') {
    return !!(process.env.WRANGLER_REMOTE || process.env.CF_PAGES || process.env.CLOUDFLARE_ENVIRONMENT);
  }
  return true; // Default to Wrangler if no process object (Edge Runtime)
}

/**
 * Initializes the logger with a WebSocket server instance.
 * This function should be called once when the WebSocket server is started.
 * @param wss The WebSocket server instance.
 */
export function initializeLogger(wss: WebSocketServer): void {
    console.log('Initializing logger with WebSocket server.');
    wssInstance = wss;
    
    // Initialize Redis if URL is provided
    if (process.env.REDIS_URL) {
        initializeRedis().catch(console.error);
    }
}

/**
 * Initializes the Redis client connection
 */
async function initializeRedis() {
    if ((redisPubClient && redisSubClient) || redisInitializing) return;
    redisInitializing = true;
    
    try {
        console.log('Initializing Redis client...');
        // Publisher client
        redisPubClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 5) {
                        console.error('Max Redis reconnection attempts reached (pub)');
                        return new Error('Max retries reached');
                    }
                    const delay = Math.min(retries * 100, 5000);
                    console.log(`Retrying Redis PUB connection in ${delay}ms...`);
                    return delay;
                }
            }
        });
        redisPubClient.on('error', (err: Error) => {
            console.error('Redis PUB Client Error:', err);
        });
        await redisPubClient.connect();

        // Subscriber client
        redisSubClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 5) {
                        console.error('Max Redis reconnection attempts reached (sub)');
                        return new Error('Max retries reached');
                    }
                    const delay = Math.min(retries * 100, 5000);
                    console.log(`Retrying Redis SUB connection in ${delay}ms...`);
                    return delay;
                }
            }
        });
        redisSubClient.on('error', (err: Error) => {
            console.error('Redis SUB Client Error:', err);
        });
        await redisSubClient.connect();
        console.log('✅ Redis Clients connected successfully (pub & sub)');
        
        // Subscribe to logs channel using subscriber client
        await redisSubClient.subscribe('logs', (message: string) => {
            // Broadcast to WebSocket clients if available
            if (wssInstance) {
                wssInstance.clients.forEach((client: WebSocket) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        });
        
        // Flush any buffered logs
        await flushRedisBuffer();
    } catch (error) {
        console.error('Failed to initialize Redis:', error);
    } finally {
        redisInitializing = false;
    }
}

/**
 * Flushes the Redis buffer by sending all buffered logs
 */
async function flushRedisBuffer() {
    while (redisBuffer.length > 0 && redisPubClient?.isReady) {
        const logEntry = redisBuffer.shift();
        try {
            await redisPubClient.publish('logs', logEntry!);
        } catch (error) {
            console.error('Error publishing to Redis:', error);
            if (logEntry) redisBuffer.unshift(logEntry);
            break;
        }
    }
}

/**
 * Adds a log entry to the Redis buffer
 */
function addToRedisBuffer(logEntry: string) {
    redisBuffer.push(logEntry);
    if (redisBuffer.length > MAX_REDIS_BUFFER) {
        redisBuffer.shift(); // Remove oldest entry if buffer is full
    }
}

/**
 * Global logging function for the application.
 * Supports different log levels and optional context objects.
 * Logs are broadcast to connected WebSocket clients.
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
            // Safely stringify the context object to avoid errors with circular references or large objects
            const contextString = JSON.stringify(contextObject, (_key, value) => {
                // Handle potential circular references or large objects during stringification
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
            // Do not add error string to logEntry itself to avoid polluting the broadcasted message
        }
    }

    // Environment-adaptive log broadcasting
    if (isAstroDevEnvironment()) {
        // WebSocket broadcasting for standard Astro dev
        if (wssInstance && wssInstance.clients) {
            wssInstance.clients.forEach((client: WebSocket) => {
                if (client.readyState === WebSocket.OPEN) {
                    try {
                        client.send(logEntry);
                    } catch (error) {
                        console.error('Failed to send log entry to WebSocket client:', error);
                    }
                }
            });
        }
    } else if (isWranglerEnvironment()) {
        // Log buffer for SSE streaming in Wrangler/Cloudflare
        logBuffer.push(logEntry);
        
        // Maintain buffer size limit
        if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
            logBuffer = logBuffer.slice(-MAX_LOG_BUFFER_SIZE);
        }
    }

    // Log to console as before
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

    // Publish to Redis if configured
    if (process.env.REDIS_URL) {
        const redisLogEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            context: contextObject || {}
        });

        if (redisPubClient?.isReady) {
            // Fire-and-forget publish; errors handled in catch
            redisPubClient
                .publish('logs', redisLogEntry)
                .then(() => {
                    // Try to flush any buffered logs
                    flushRedisBuffer().catch((err: any) => {
                        console.error('Error flushing Redis buffer:', err);
                    });
                })
                .catch((error: any) => {
                    console.error('Error publishing to Redis:', error);
                    addToRedisBuffer(redisLogEntry);
                });
        } else {
            addToRedisBuffer(redisLogEntry);
            // Lazy initialization on first log if not already initializing
            if (!redisPubClient && !redisInitializing) {
                initializeRedis().catch(console.error);
            }
        }
    }
};

/**
 * Export functions for SSE/Polling access to log buffer
 */
export function getLogBuffer(): string[] {
    return [...logBuffer]; // Return copy to prevent external modifications
}

export function clearLogBuffer(): void {
    logBuffer = [];
}

export function getEnvironmentInfo() {
    return {
        isAstroDevEnvironment: isAstroDevEnvironment(),
        isWranglerEnvironment: isWranglerEnvironment(),
        hasWebSocketServer: !!wssInstance,
        logBufferSize: logBuffer.length
    };
}