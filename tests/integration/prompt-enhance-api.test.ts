import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TEST_URL, csrfHeaders } from '../shared/http';

// Mock the PromptEnhancerService
vi.mock('src/lib/services/prompt-enhancer-service', () => ({
  PromptEnhancerService: vi.fn(() => ({
    enhance: vi.fn()
  }))
}));

// Mock KV for quota (simple stub, no external deps)
vi.mock('upstash/kv', () => ({
  Redis: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  })),
}));

// Mock auth service to control locals.user
vi.mock('src/lib/services/auth-service', () => ({
  getUserFromSession: vi.fn()
}));

// Assume cookie helpers if needed
const apiUrl = `${TEST_URL}/api/prompt-enhance`;

describe('prompt-enhance API Integration Tests', () => {
  let enhanceMock: any;
  let kvGetMock: any;
  let getUserFromSessionMock: any;

  beforeEach(async () => {
    const svc = await import('src/lib/services/prompt-enhancer-service');
    enhanceMock = vi.mocked((svc as any).PromptEnhancerService.prototype.enhance);
    const kvModule: any = await import('upstash/kv');
    kvGetMock = kvModule.Redis().get;
    const authSvc: any = await import('src/lib/services/auth-service');
    getUserFromSessionMock = authSvc.getUserFromSession;

    // Reset mocks
    vi.clearAllMocks();
    enhanceMock.mockResolvedValue({ success: true, data: { enhancedPrompt: 'enhanced text' } });
    kvGetMock.mockResolvedValue('10'); // default quota ok
    getUserFromSessionMock.mockResolvedValue(null); // default guest
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createRequest = (body: any, options: RequestInit = {}) => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Origin: TEST_URL,
      ...options.headers
    });
    return new Request(apiUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
      credentials: 'include' as const,
      ...options
    });
  };

  it('should enhance prompt for authenticated user with valid CSRF and quota', async () => {
    // Mock auth user
    getUserFromSessionMock.mockResolvedValue({ id: 'user1', email: 'test@example.com' });

    // Mock CSRF - assume cookie and header match
    const csrfToken = 'valid-csrf-token';
    const request = createRequest({ text: 'test prompt' }, {
      headers: csrfHeaders(csrfToken)
    });

    const response = await fetch(request);
    expect(response.status).toBe(200);
    const json: any = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.enhancedPrompt).toBe('enhanced text');
    expect(enhanceMock).toHaveBeenCalledWith(expect.objectContaining({ text: 'test prompt', ownerId: 'user1' }));
  });

  it('should enhance prompt for guest with valid CSRF and quota', async () => {
    // Guest, no user
    getUserFromSessionMock.mockResolvedValue(null);

    const csrfToken = 'valid-csrf-token';
    const request = createRequest({ text: 'test prompt' }, {
      headers: csrfHeaders(csrfToken)
    });

    const response = await fetch(request);
    expect(response.status).toBe(200);
    const json: any = await response.json();
    expect(json.success).toBe(true);
    expect(enhanceMock).toHaveBeenCalledWith(expect.objectContaining({ text: 'test prompt', ownerId: expect.any(String) })); // guest id
  });

  it('should return 429 for quota exceeded', async () => {
    kvGetMock.mockResolvedValue('0'); // exceeded

    const csrfToken = 'valid-csrf-token';
    const request = createRequest({ text: 'test prompt' }, {
      headers: { 'X-CSRF-Token': csrfToken, 'Cookie': `csrf_token=${csrfToken}` }
    });

    const response = await fetch(request);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('QUOTA_EXCEEDED');
  });

  it('should return 400 for invalid CSRF token', async () => {
    const invalidToken = 'invalid-csrf';
    const request = createRequest({ text: 'test prompt' }, {
      headers: { 'X-CSRF-Token': invalidToken, 'Cookie': `csrf_token=valid` }
    });

    const response = await fetch(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('CSRF_INVALID');
  });

  it('should return 429 for rate limit exceeded', async () => {
    // Mock rate limiter to exceed - but since it's integration, multiple calls
    // Assume rate limiter uses KV or something, but for test, make multiple requests
    // This might require mocking the rate limiter KV separately, but for simplicity, assume mock allows first, then exceed
    // vi.mock('src/lib/rate-limiter')

    vi.mock('src/lib/rate-limiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false)
    }));

    const csrfToken = 'valid-csrf-token';
    const request1 = createRequest({ text: 'first' }, {
      headers: { 'X-CSRF-Token': csrfToken, 'Cookie': `csrf_token=${csrfToken}` }
    });
    await fetch(request1); // first ok

    const request2 = createRequest({ text: 'second' }, {
      headers: { 'X-CSRF-Token': csrfToken, 'Cookie': `csrf_token=${csrfToken}` }
    });
    const response = await fetch(request2);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();
  });

  it('should return 400 for invalid body - missing text', async () => {
    const csrfToken = 'valid-csrf-token';
    const request = createRequest({}, {
      headers: { 'X-CSRF-Token': csrfToken, 'Cookie': `csrf_token=${csrfToken}` }
    });

    const response = await fetch(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('text');
  });

  it('should return 400 for empty text', async () => {
    const csrfToken = 'valid-csrf-token';
    const request = createRequest({ text: '' }, {
      headers: { 'X-CSRF-Token': csrfToken, 'Cookie': `csrf_token=${csrfToken}` }
    });

    const response = await fetch(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('VALIDATION_ERROR');
  });

  it('should handle long text >1000 chars', async () => {
    const longText = 'a'.repeat(1001);
    const csrfToken = 'valid-csrf-token';
    const request = createRequest({ text: longText }, {
      headers: { 'X-CSRF-Token': csrfToken, 'Cookie': `csrf_token=${csrfToken}` }
    });

    // Assume service handles it, or errors
    enhanceMock.mockResolvedValue({ success: true, data: { enhancedPrompt: 'enhanced long' } });

    const response = await fetch(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it('should return 405 for GET method', async () => {
    const request = new Request(apiUrl, { method: 'GET' });

    const response = await fetch(request);
    expect(response.status).toBe(405);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('METHOD_NOT_ALLOWED');
  });

  // Additional error scenarios, e.g. invalid JSON body
  it('should return 400 for invalid JSON body', async () => {
    const invalidBody = new Request(apiUrl, {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await fetch(invalidBody);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.type).toBe('PARSE_ERROR');
  });
});