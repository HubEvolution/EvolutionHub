/**
 * Integration-Tests für API-Middleware (Rate-Limiting und Auth)
 * 
 * Diese Tests decken withAuthApiMiddleware ab, inkl. Rate-Limiting (429), Auth-Integration (401), 
 * Security-Headers, Error-Handling. Mocks: validateSession (success/fail), rate-limiter (allow/block), 
 * MSW für Request-Interception, logger. Fokus: Kombinierte Middleware-Effekte auf API-Handler.
 * 
 * @module rate-limit.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '../../../src/lib/api-middleware';
import { validateSession } from '../../../src/lib/auth-v2';
import { createRateLimiter } from '../../../src/lib/rate-limiter';
import type { APIContext } from 'astro';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { logApiAccess } from '@/lib/security-logger';

// Setup MSW Server für Integration
const server = setupServer();

// Mocks
vi.mock('../../../src/lib/auth-v2', () => ({
  validateSession: vi.fn(),
}));

vi.mock('@/lib/security-logger', () => ({
  logApiAccess: vi.fn(),
}));

const mockValidateSession = vi.mocked(validateSession);
const mockLogApiAccess = vi.mocked(logApiAccess);

const mockHandler = async (context: APIContext) => createApiSuccess({ message: 'Success' });

const createMockContext = (sessionId?: string, rateLimited = false): APIContext => ({
  request: new Request('http://test/api/test'),
  cookies: { get: vi.fn(() => ({ value: sessionId })) },
  locals: { sessionId },
  clientAddress: '127.0.0.1',
} as any);

beforeEach(() => {
  vi.clearAllMocks();
  server.resetHandlers();
  mockValidateSession.mockResolvedValue({ session: { id: 'sess1', userId: 'user1' }, user: { id: 'user1' } });
});

describe('withAuthApiMiddleware Integration Tests', () => {
  it('sollte API-Handler mit gültiger Auth und Rate-Limit erlauben', async () => {
    const context = createMockContext('valid-session');
    const middleware = withAuthApiMiddleware(mockHandler);

    const response = await middleware(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Success');
    expect(mockValidateSession).toHaveBeenCalledWith(expect.any(Object), 'valid-session');
    expect(mockLogApiAccess).toHaveBeenCalledWith('user1', '127.0.0.1', expect.any(Object));
  });

  it('sollte 401 bei ungültiger Auth zurückgeben', async () => {
    mockValidateSession.mockResolvedValue({ session: null, user: null });
    const context = createMockContext('invalid-session');
    const middleware = withAuthApiMiddleware(mockHandler);

    const response = await middleware(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
    expect(mockValidateSession).toHaveBeenCalledWith(expect.any(Object), 'invalid-session');
  });

  it('sollte 429 bei Rate-Limit-Überschreitung zurückgeben (integriert mit rate-limiter)', async () => {
    const mockContext = createMockContext('valid-session');
    vi.spyOn(mockContext, 'clientAddress', 'get').mockReturnValue('limited-ip');

    // Mock rate-limiter to block
    const mockLimiter = createRateLimiter({ maxRequests: 1, windowMs: 1000, name: 'test' });
    // Simulate multiple calls to trigger limit (for test, mock internal store)
    // Since in-memory, we can call multiple times
    await mockLimiter(mockContext); // First call
    await mockLimiter(mockContext); // Second call - should block

    const middleware = withAuthApiMiddleware(mockHandler, { rateLimiter: mockLimiter });
    const response = await middleware(mockContext);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();
    const body = await response.json();
    expect(body.error).toBe('Rate limit exceeded');
    expect(mockLogApiAccess).toHaveBeenCalledWith(expect.any(String), 'limited-ip', expect.objectContaining({ rateLimitExceeded: true }));
  });

  it('sollte Security-Headers in Response setzen', async () => {
    const context = createMockContext('valid-session');
    const middleware = withAuthApiMiddleware(mockHandler);

    const response = await middleware(context);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    // CSP would be set if defined
  });

  it('sollte onError-Callback bei Handler-Fehler aufrufen und 500 zurückgeben', async () => {
    const errorHandler = vi.fn().mockReturnValue(createApiError('server_error', 'Handler Error'));
    const failingHandler = async () => { throw new Error('Test Error'); };
    const middleware = withAuthApiMiddleware(failingHandler, { onError: errorHandler });

    const context = createMockContext('valid-session');
    const response = await middleware(context);

    expect(errorHandler).toHaveBeenCalledWith(context, new Error('Test Error'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Handler Error');
  });

  it('sollte logMetadata in Logging einfügen', async () => {
    const context = createMockContext('valid-session');
    const middleware = withAuthApiMiddleware(mockHandler, { logMetadata: { test: 'value' } });

    await middleware(context);

    expect(mockLogApiAccess).toHaveBeenCalledWith('user1', '127.0.0.1', expect.objectContaining({ test: 'value' }));
  });

  it('sollte Rate-Limiting mit custom Limiter anwenden', async () => {
    const customLimiter = createRateLimiter({ maxRequests: 1, windowMs: 1, name: 'custom' });
    const context = createMockContext('valid-session');
    const middleware = withAuthApiMiddleware(mockHandler, { rateLimiter: customLimiter });

    // First call
    await middleware(context);
    // Second call - limit exceeded
    const response = await middleware(context);

    expect(response.status).toBe(429);
  });

  it('sollte bei fehlendem Rate-Limiter default verwenden', async () => {
    const context = createMockContext('valid-session');
    const middleware = withAuthApiMiddleware(mockHandler); // Default apiRateLimiter

    const response = await middleware(context);

    expect(response.status).toBe(200); // First call allowed
  });
});