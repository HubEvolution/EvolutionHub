import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import { SECURITY_EVENTS } from '@/config/logging';

// Spy holder to assert calls from within mocked factory
const mockLogSecurityEvent = vi.fn();

vi.mock('@/server/utils/logger-factory', () => {
  return {
    loggerFactory: {
      createSecurityLogger: () => ({
        logSecurityEvent: mockLogSecurityEvent,
        // Unused in these tests, but provide no-op stubs for completeness
        logAuthSuccess: () => {},
        logAuthFailure: () => {},
        logApiAccess: () => {},
        logApiError: () => {},
      }),
    },
  };
});

function makeContext(urlPath: string, method: string, headers?: Record<string, string>, clientIp?: string) {
  const url = `http://localhost${urlPath}`;
  const request = new Request(url, {
    method,
    headers: headers || {},
  });
  return {
    request,
    clientAddress: clientIp || '127.0.0.1',
  } as any; // Minimal APIContext shape for our helpers
}

describe('Security logging for deprecated endpoints (response helpers)', () => {
  beforeEach(() => {
    mockLogSecurityEvent.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createDeprecatedGoneHtml()', () => {
    it('logs USER_EVENT with reason deprecated_endpoint_access for GET /api/auth/logout', async () => {
      const ctx = makeContext('/api/auth/logout', 'GET', {
        'user-agent': 'Vitest UA',
        referer: 'http://localhost/de/some-page',
      }, '203.0.113.5');

      const resp = createDeprecatedGoneHtml(ctx);

      expect(resp.status).toBe(410);
      expect(resp.headers.get('Cache-Control')).toBe('no-store');
      expect(resp.headers.get('Content-Type') || '').toContain('text/html');

      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
      const [type, details, context] = mockLogSecurityEvent.mock.calls[0];
      expect(type).toBe(SECURITY_EVENTS.USER_EVENT);
      expect(details).toMatchObject({
        reason: 'deprecated_endpoint_access',
        endpoint: '/api/auth/logout',
        method: 'GET',
      });
      expect(context).toMatchObject({
        ipAddress: '203.0.113.5',
        userAgent: 'Vitest UA',
      });
    });

    it('logs with correct method for POST /api/auth/logout', async () => {
      const ctx = makeContext('/api/auth/logout', 'POST', {
        'user-agent': 'Vitest UA 2',
      }, '198.51.100.10');

      const resp = createDeprecatedGoneHtml(ctx);

      expect(resp.status).toBe(410);
      expect(resp.headers.get('Cache-Control')).toBe('no-store');

      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
      const [type, details, context] = mockLogSecurityEvent.mock.calls[0];
      expect(type).toBe(SECURITY_EVENTS.USER_EVENT);
      expect(details).toMatchObject({
        reason: 'deprecated_endpoint_access',
        endpoint: '/api/auth/logout',
        method: 'POST',
      });
      expect(context).toMatchObject({
        ipAddress: '198.51.100.10',
        userAgent: 'Vitest UA 2',
      });
    });

    it('logs for GET /api/auth/verify-email', async () => {
      const ctx = makeContext('/api/auth/verify-email', 'GET', {
        'user-agent': 'Vitest Verify',
      }, '192.0.2.55');

      const resp = createDeprecatedGoneHtml(ctx);

      expect(resp.status).toBe(410);
      expect(resp.headers.get('Cache-Control')).toBe('no-store');

      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
      const [type, details, context] = mockLogSecurityEvent.mock.calls[0];
      expect(type).toBe(SECURITY_EVENTS.USER_EVENT);
      expect(details).toMatchObject({
        reason: 'deprecated_endpoint_access',
        endpoint: '/api/auth/verify-email',
        method: 'GET',
      });
      expect(context).toMatchObject({
        ipAddress: '192.0.2.55',
        userAgent: 'Vitest Verify',
      });
    });
  });

  describe('createDeprecatedGoneJson()', () => {
    it('logs with details for PUT /api/auth/logout', async () => {
      const ctx = makeContext('/api/auth/logout', 'PUT', {
        'user-agent': 'Vitest JSON',
      }, '203.0.113.99');

      const extra = { attemptedMethod: 'PUT' } as const;
      const resp = createDeprecatedGoneJson(ctx, undefined, extra);

      expect(resp.status).toBe(410);
      expect(resp.headers.get('Cache-Control')).toBe('no-store');
      expect(resp.headers.get('Content-Type') || '').toContain('application/json');

      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
      const [type, details, context] = mockLogSecurityEvent.mock.calls[0];
      expect(type).toBe(SECURITY_EVENTS.USER_EVENT);
      expect(details).toMatchObject({
        reason: 'deprecated_endpoint_access',
        endpoint: '/api/auth/logout',
        method: 'PUT',
        details: extra,
      });
      expect(context).toMatchObject({
        ipAddress: '203.0.113.99',
        userAgent: 'Vitest JSON',
      });
    });

    it('logs for DELETE /api/auth/verify-email', async () => {
      const ctx = makeContext('/api/auth/verify-email', 'DELETE', {
        'user-agent': 'Vitest JSON 2',
      }, '198.51.100.77');

      const resp = createDeprecatedGoneJson(ctx);

      expect(resp.status).toBe(410);
      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
      const [type, details, context] = mockLogSecurityEvent.mock.calls[0];
      expect(type).toBe(SECURITY_EVENTS.USER_EVENT);
      expect(details).toMatchObject({
        reason: 'deprecated_endpoint_access',
        endpoint: '/api/auth/verify-email',
        method: 'DELETE',
      });
      expect(context).toMatchObject({
        ipAddress: '198.51.100.77',
        userAgent: 'Vitest JSON 2',
      });
    });

    it('logs for HEAD /api/auth/logout (JSON 410)', async () => {
      const ctx = makeContext('/api/auth/logout', 'HEAD', {
        'user-agent': 'Vitest JSON HEAD',
      }, '203.0.113.200');

      const extra = { attemptedMethod: 'HEAD' } as const;
      const resp = createDeprecatedGoneJson(ctx, undefined, extra);

      expect(resp.status).toBe(410);
      expect(resp.headers.get('Cache-Control')).toBe('no-store');
      expect(resp.headers.get('Content-Type') || '').toContain('application/json');

      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
      const [type, details, context] = mockLogSecurityEvent.mock.calls[0];
      expect(type).toBe(SECURITY_EVENTS.USER_EVENT);
      expect(details).toMatchObject({
        reason: 'deprecated_endpoint_access',
        endpoint: '/api/auth/logout',
        method: 'HEAD',
        details: extra,
      });
      expect(context).toMatchObject({
        ipAddress: '203.0.113.200',
        userAgent: 'Vitest JSON HEAD',
      });
    });

    it('logs for HEAD /api/auth/verify-email (JSON 410)', async () => {
      const ctx = makeContext('/api/auth/verify-email', 'HEAD', {
        'user-agent': 'Vitest JSON HEAD 2',
      }, '198.51.100.201');

      const extra = { attemptedMethod: 'HEAD' } as const;
      const resp = createDeprecatedGoneJson(ctx, undefined, extra);

      expect(resp.status).toBe(410);
      expect(resp.headers.get('Cache-Control')).toBe('no-store');
      expect(resp.headers.get('Content-Type') || '').toContain('application/json');

      expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
      const [type, details, context] = mockLogSecurityEvent.mock.calls[0];
      expect(type).toBe(SECURITY_EVENTS.USER_EVENT);
      expect(details).toMatchObject({
        reason: 'deprecated_endpoint_access',
        endpoint: '/api/auth/verify-email',
        method: 'HEAD',
        details: extra,
      });
      expect(context).toMatchObject({
        ipAddress: '198.51.100.201',
        userAgent: 'Vitest JSON HEAD 2',
      });
    });
  });
});
