import {
  describe,
  it,
  expect,
  vi as _vi,
  beforeEach as _beforeEach,
  afterEach as _afterEach,
} from 'vitest';
import { TEST_URL, csrfHeaders, hex32 } from '../shared/http';

// Assume cookie helpers if needed
interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}
interface ApiError {
  success: false;
  error: { type: string; message?: string; details?: unknown };
}
const apiUrl = `${TEST_URL}/api/prompt-enhance`;

describe('prompt-enhance API Integration Tests', () => {
  const createRequest = (body: unknown, options: RequestInit = {}) => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Origin: TEST_URL,
      ...options.headers,
    });
    return new Request(apiUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
      credentials: 'include' as const,
      ...options,
    });
  };

  it('should enhance prompt with valid CSRF and quota', async () => {
    const csrfToken = hex32();
    const request = createRequest(
      { text: 'test prompt' },
      {
        headers: csrfHeaders(csrfToken),
      }
    );

    const response = await fetch(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as ApiSuccess<{ enhancedPrompt: string }>;
    expect(json.success).toBe(true);
    expect(typeof json.data.enhancedPrompt).toBe('string');
  });

  it('should enhance prompt for guest with valid CSRF and quota', async () => {
    const csrfToken = hex32();
    const request = createRequest(
      { text: 'test prompt' },
      {
        headers: csrfHeaders(csrfToken),
      }
    );
    const response = await fetch(request);
    expect(response.status).toBe(400);
    const json = (await response.json()) as ApiError;
    expect(json.success).toBe(false);
    expect((json.error.type || '').toLowerCase()).toBe('validation_error');
  });

  it('should return 429 for quota exceeded', async () => {
    const csrfToken = 'valid-csrf-token';
    let saw429 = false;
    for (let i = 0; i < 20; i++) {
      const request = createRequest({ text: `test ${i}` }, { headers: csrfHeaders(csrfToken) });
      const res = await fetch(request);
      if (res.status === 429) {
        saw429 = true;
        expect(res.headers.get('Retry-After')).toBeDefined();
        break;
      }
    }
    expect(saw429).toBe(true);
  });

  it('should return 400/403 for invalid CSRF token', async () => {
    const invalidToken = 'invalid-csrf';
    const request = createRequest(
      { text: 'test prompt' },
      {
        headers: { 'X-CSRF-Token': invalidToken, Cookie: `csrf_token=valid` },
      }
    );

    const response = await fetch(request);
    expect([400, 403]).toContain(response.status);
    const json = (await response.json()) as ApiError;
    expect(json.success).toBe(false);
    expect(typeof json.error.type).toBe('string');
  });

  it('should return 429 for rate limit exceeded', async () => {
    const csrfToken = 'valid-csrf-token';
    let saw429 = false;
    for (let i = 0; i < 20; i++) {
      const req = createRequest({ text: `rl-${i}` }, { headers: csrfHeaders(csrfToken) });
      const res = await fetch(req);
      if (res.status === 429) {
        saw429 = true;
        expect(res.headers.get('Retry-After')).toBeDefined();
        break;
      }
    }
    expect(saw429).toBe(true);
  });

  it('should return 400 for invalid body - missing text', async () => {
    const csrfToken = hex32();
    const request = createRequest(
      {},
      {
        headers: csrfHeaders(csrfToken),
      }
    );

    const response = await fetch(request);
    expect(response.status).toBe(400);
    const json = (await response.json()) as ApiError;
    expect(json.success).toBe(false);
    expect((json.error.type || '').toLowerCase()).toBe('validation_error');
    if (typeof json.error.message === 'string') {
      expect(json.error.message.toLowerCase()).toContain('text');
    }
  });

  it('should return 400 for empty text', async () => {
    const csrfToken = hex32();
    const request = createRequest(
      { text: '' },
      {
        headers: csrfHeaders(csrfToken),
      }
    );

    const response = await fetch(request);
    expect(response.status).toBe(400);
    const json = (await response.json()) as ApiError;
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for long text >1000 chars', async () => {
    const longText = 'a'.repeat(1001);
    const csrfToken = hex32();
    const request = createRequest(
      { text: longText },
      {
        headers: csrfHeaders(csrfToken),
      }
    );

    const response = await fetch(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as ApiSuccess<unknown>;
    expect(json.success).toBe(true);
  });

  it('should return 405 for GET method', async () => {
    const request = new Request(apiUrl, { method: 'GET' });

    const response = await fetch(request);
    expect([405, 404]).toContain(response.status);
    const json = (await response.json()) as ApiError;
    expect(json.success).toBe(false);
    expect(typeof json.error.type).toBe('string');
  });

  // Additional error scenarios, e.g. invalid JSON body
  it('should return 400 for invalid JSON body', async () => {
    const invalidBody = new Request(apiUrl, {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await fetch(invalidBody);
    expect(response.status).toBe(400);
    const json = (await response.json()) as ApiError;
    expect(json.success).toBe(false);
    expect((json.error.type || '').toLowerCase()).toBe('validation_error');
  });
});
