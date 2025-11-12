import { describe, it, expect, vi } from 'vitest';
import { POST as promptEnhancePost } from '@/pages/api/prompt-enhance';
import { GET as templatesGet } from '@/pages/api/templates';
import { createApiSuccess, createApiError } from '@/lib/api-middleware';
import { PromptEnhancerService } from '@/lib/services/prompt-enhancer-service';
import type { APIContext } from 'astro';
import type {
  EnhanceInput,
  EnhanceOptions,
  EnhanceResult,
} from '@/lib/services/prompt-enhancer-service';

// Mock service
vi.mock('@/lib/services/prompt-enhancer-service', () => ({
  PromptEnhancerService: vi.fn().mockImplementation(() => ({
    enhance: vi.fn(),
  })),
}));

const MockPromptEnhancerService = vi.mocked(PromptEnhancerService).mockedConstructor;

describe('Prompt Enhance API Integration', () => {
  const mockContext = {
    request: new Request('http://localhost/api/prompt-enhance', { method: 'POST' }),
    cookies: { get: vi.fn(), set: vi.fn() },
    locals: {
      runtime: {
        env: {
          KV_PROMPT_ENHANCER: {
            get: vi
              .fn()
              .mockResolvedValue(JSON.stringify({ count: 0, resetAt: Date.now() + 86400000 })),
            put: vi.fn().mockResolvedValue(undefined),
          },
        },
      },
    },
    clientAddress: '127.0.0.1',
  } as unknown as APIContext;

  beforeEach(() => {
    vi.clearAllMocks();
    MockPromptEnhancerService.mockClear();
  });

  it('should handle successful POST request', async () => {
    const mockEnhanceResult: EnhanceResult = {
      enhanced: {
        role: 'Expert',
        objective: 'Generate content',
        constraints: 'Cite sources',
        outputFormat: 'Markdown',
        rawText: 'Test input',
      },
      safetyReport: { masked: [], types: [] },
      scores: { clarity: 0.8, specificity: 0.9, testability: 0.7 },
      usage: { used: 1, limit: 5, resetAt: 1234567890 },
    };
    const mockServiceInstance = { enhance: vi.fn().mockResolvedValue(mockEnhanceResult) };
    MockPromptEnhancerService.mockImplementation(() => mockServiceInstance as any);

    // Mock JSON body
    const mockRequest = new Request('http://localhost/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: 'Test prompt text' },
        options: { mode: 'agent', safety: true, includeScores: true },
      }),
    });
    Object.assign(mockContext, { request: mockRequest });

    const response = await promptEnhancePost(mockContext);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.enhanced.role).toBe('Expert');
    expect(MockPromptEnhancerService).toHaveBeenCalled();
    expect(mockServiceInstance.enhance).toHaveBeenCalledWith(
      { text: 'Test prompt text' },
      { mode: 'agent', safety: true, includeScores: true },
      'guest', // No user, guest
      expect.any(String) // guest_id
    );
  });

  it('should handle validation error for invalid input', async () => {
    const mockRequest = new Request('http://localhost/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text: '' } }),
    });
    Object.assign(mockContext, { request: mockRequest });

    const response = await promptEnhancePost(mockContext);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error.type).toBe('validation_error');
    expect(result.error.message).toBe('Input text is required');
  });

  it('should create guest_id cookie if not present', async () => {
    mockContext.cookies.get.mockReturnValueOnce(undefined);

    const mockRequest = new Request('http://localhost/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text: 'Valid text' } }),
    });
    Object.assign(mockContext, { request: mockRequest });

    MockPromptEnhancerService.mockImplementation(() => ({
      enhance: vi.fn().mockResolvedValue({}) as any,
    }));

    await promptEnhancePost(mockContext);

    expect(mockContext.cookies.set).toHaveBeenCalledWith(
      'guest_id',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 15552000, // 180 days
      })
    );
  });

  it('should use user from locals if authenticated', async () => {
    mockContext.locals.user = { id: 'user123' };

    const mockRequest = new Request('http://localhost/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text: 'Valid text' } }),
    });
    Object.assign(mockContext, { request: mockRequest });

    MockPromptEnhancerService.mockImplementation(() => ({
      enhance: vi.fn().mockResolvedValue({}) as any,
    }));

    await promptEnhancePost(mockContext);

    expect(MockPromptEnhancerService).toHaveBeenCalled();
    // Service called with ownerType 'user', ownerId 'user123'
  });
});

describe('Templates API Integration', () => {
  const mockTemplateContext = {
    request: new Request('http://localhost/api/templates', { method: 'GET' }),
    locals: {
      runtime: {
        env: {
          KV_PROMPT_ENHANCER: {
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue(undefined),
          },
        },
      },
    },
  } as unknown as APIContext;

  it('should return seed templates from KV or hardcoded', async () => {
    const response = await templatesGet(mockTemplateContext);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data[0].id).toBe('blog-gen');
    expect(result.data[1].id).toBe('code-review');
    expect(mockTemplateContext.locals.runtime.env.KV_PROMPT_ENHANCER.put).toHaveBeenCalledWith(
      'prompt:templates:seeds',
      JSON.stringify(expect.any(Array)),
      { expirationTtl: 3600 }
    );
  });

  it('should return stored templates if exist in KV', async () => {
    const storedTemplates = [{ id: 'custom', name: 'Custom' }];
    mockTemplateContext.locals.runtime.env.KV_PROMPT_ENHANCER.get.mockResolvedValueOnce(
      JSON.stringify(storedTemplates)
    );

    const response = await templatesGet(mockTemplateContext);
    const result = await response.json();

    expect(result.data).toEqual(storedTemplates);
    expect(mockTemplateContext.locals.runtime.env.KV_PROMPT_ENHANCER.put).not.toHaveBeenCalled();
  });
});
