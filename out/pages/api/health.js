"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
/**
 * Health check endpoint for deployment verification
 * Tests connectivity to critical infrastructure: D1, KV, R2
 * Now includes basic security headers and structured logging
 */
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { locals } = context;
    const env = locals.runtime?.env;
    const startTime = Date.now();
    if (!env) {
        return (0, api_middleware_1.createApiError)('server_error', 'Runtime environment not available');
    }
    const services = {
        d1: false,
        kv: false,
        r2: false,
    };
    const errors = [];
    // Test D1 database connectivity
    try {
        const result = await env.DB?.prepare('SELECT 1 as health').first();
        services.d1 = result?.health === 1;
        if (!services.d1) {
            errors.push('D1: Query returned unexpected result');
        }
    }
    catch (err) {
        services.d1 = false;
        errors.push(`D1: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    // Test KV (SESSION) connectivity
    try {
        // Simple availability test - just check if we can call the KV API
        const testKey = '__health_check__';
        const session = env?.SESSION;
        await session?.put(testKey, 'ok', { expirationTtl: 60 });
        const result = session ? await session.get(testKey) : null;
        services.kv = result === 'ok';
        await session?.delete(testKey);
        if (!services.kv) {
            errors.push('KV: Could not read/write test key');
        }
    }
    catch (err) {
        services.kv = false;
        errors.push(`KV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    // Test R2 (AI_IMAGES) connectivity
    try {
        // Just check if we can list - don't create any objects
        const list = await env.R2_AI_IMAGES?.list({ limit: 1 });
        services.r2 = list !== undefined;
        if (!services.r2) {
            errors.push('R2: Could not list bucket');
        }
    }
    catch (err) {
        services.r2 = false;
        errors.push(`R2: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    const duration = Date.now() - startTime;
    const allHealthy = services.d1 && services.kv && services.r2;
    const status = allHealthy ? 'ok' : 'degraded';
    // Return structured response with consistent format
    return (0, api_middleware_1.createApiSuccess)({
        status,
        services,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        version: env.ENVIRONMENT || 'unknown',
        ...(errors.length > 0 && { errors }),
    });
}, {
    // Health check should have minimal rate limiting
    rateLimiter: async () => {
        const { createRateLimiter } = await Promise.resolve().then(() => require('@/lib/rate-limiter'));
        return createRateLimiter({
            maxRequests: 60, // Higher limit for health checks
            windowMs: 60 * 1000,
            name: 'healthCheck',
        });
    },
    // Disable CSRF for health checks (monitoring systems may call this)
    enforceCsrfToken: false,
    // Disable auto-logging for health checks to reduce noise
    disableAutoLogging: true,
    // Custom log metadata for health checks
    logMetadata: { action: 'health_check' },
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
