import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loggerFactory } from '@/server/utils/logger-factory';

describe('logger transports smoke', () => {
  const OLD_ENV = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...OLD_ENV };
    // Default to HTTP transport for the smoke test
    process.env.LOG_TRANSPORTS = 'http';
    process.env.LOG_HTTP_ENDPOINT = 'https://siem.local/ingest';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  it('sends logs via HTTP transport and redacts sensitive keys', async () => {
    const log = loggerFactory.createLogger('smoke');
    log.info('user_login', {
      userId: 'u_123',
      token: 'topsecret',
      nested: { password: 'hidden', deep: { apiKey: 'ABCD' } },
    });

    // let microtask queue flush
    await new Promise((r) => setTimeout(r, 0));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const call = (globalThis.fetch as any).mock.calls[0];
    expect(call[0]).toBe('https://siem.local/ingest');
    const opts = call[1];
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    // Validate basic structure
    expect(body).toHaveProperty('level', 'info');
    expect(body).toHaveProperty('message', 'user_login');
    expect(body).toHaveProperty('context');
    // Redaction
    expect(body.context.token).toBe('[FILTERED]');
    expect(body.context.nested.password).toBe('[FILTERED]');
    expect(body.context.nested.deep.apiKey).toBe('[FILTERED]');
  });

  it('routes SecurityLogger through transport with redaction', async () => {
    process.env.LOG_TRANSPORTS = 'http';
    const sec = loggerFactory.createSecurityLogger();
    sec.logAuthFailure({ reason: 'invalid_password', password: '12345' }, { userId: 'u_9' });
    await new Promise((r) => setTimeout(r, 0));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.message).toBe('AUTH_FAILURE');
    expect(body.level).toBe('error');
    expect(body.context.details.password).toBe('[FILTERED]');
  });

  afterAll(() => {
    process.env = OLD_ENV;
    globalThis.fetch = originalFetch as any;
  });
});
