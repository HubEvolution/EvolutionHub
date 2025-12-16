import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AiImageService, type GenerateParams, type AssistantResponse } from '@/lib/services/ai-image-service';
import { ALLOWED_MODELS, type OwnerType } from '@/config/ai-image';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai');

// Mock process.env
const mockEnv = {
  R2_AI_IMAGES: { put: vi.fn() } as any,
  KV_AI_ENHANCER: { get: vi.fn(), put: vi.fn() } as any,
  REPLICATE_API_TOKEN: 'test-token',
  OPENAI_API_KEY: 'sk-test-key',
  ENVIRONMENT: 'development'
};

// Provide a concrete OpenAI implementation on the mocked prototype.
// New flow: beta.assistants.retrieve + chat.completions.create
const assistantsRetrieve = vi
  .fn()
  .mockResolvedValue({ model: 'gpt-4o-mini', instructions: 'Test instructions' } as any);
const chatCompletionsCreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: 'Test response' } }],
} as any);

// Attach to prototype so that instance under test sees these mocks
(OpenAI as unknown as { prototype: any }).prototype.beta = {
  assistants: {
    retrieve: assistantsRetrieve,
  },
};
(OpenAI as unknown as { prototype: any }).prototype.chat = {
  completions: {
    create: chatCompletionsCreate,
  },
};

describe('AiImageService', () => {
  let service: AiImageService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Object.assign(process.env, mockEnv);
    service = new AiImageService(mockEnv);
    // Ensure File.prototype.arrayBuffer exists in test env
    if (!(File as any).prototype.arrayBuffer) {
      (File as any).prototype.arrayBuffer = vi.fn(async function (this: File): Promise<ArrayBuffer> {
        const text = this.size > 0 ? 'x'.repeat(this.size) : 'x';
        return (new TextEncoder().encode(text).buffer as ArrayBuffer);
      });
    }
    // reset R2/KV mocks
    vi.clearAllMocks();
    mockEnv.R2_AI_IMAGES.put = vi.fn();
    mockEnv.KV_AI_ENHANCER.get = vi.fn();
    mockEnv.KV_AI_ENHANCER.put = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('callCustomAssistant', () => {
    it('should return AssistantResponse on successful call', async () => {
      const prompt = 'Test prompt';
      const assistantId = 'asst-123';

      const result = await service.callCustomAssistant(prompt, assistantId);

      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
      expect(assistantsRetrieve).toHaveBeenCalledWith(assistantId);
      expect(chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: prompt }),
          ]),
        })
      );
      expect(result).toEqual({ content: 'Test response' });
    });

    it('should throw error if OPENAI_API_KEY is missing', async () => {
      // Re-initialize service with missing key (service reads from env passed in constructor)
      service = new AiImageService({ ...mockEnv, OPENAI_API_KEY: undefined } as any);
      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow('OPENAI_API_KEY not configured');
    });

    it('should throw error if chat completion returns no content', async () => {
      chatCompletionsCreate.mockResolvedValueOnce({ choices: [{ message: { content: '' } }] } as any);
      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow(
        /No response from assistant|Failed to call assistant/
      );
    });

    it('should throw error on network error during chat completion', async () => {
      const error = new Error('Network error');
      chatCompletionsCreate.mockRejectedValueOnce(error);
      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow(
        'Failed to call assistant'
      );
    });

    it('should log error on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      vi.mocked(OpenAI.prototype.beta.assistants.retrieve).mockRejectedValueOnce(error);

      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow('Failed to call assistant');
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('assistant_call_failed'), expect.any(Object));
      consoleError.mockRestore();
    });
  });

  describe('generate with assistant', () => {
    const baseParams: GenerateParams = {
      ownerType: 'user' as OwnerType,
      ownerId: 'user-123',
      modelSlug: ALLOWED_MODELS[0].slug,
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      requestOrigin: 'https://example.com',
      assistantId: 'asst-123'
    };

    beforeEach(() => {
      // Force non-development mode so runReplicate is used instead of dev echo
      // Recreate service with production env to avoid replicate guard
      service = new AiImageService({ ...mockEnv, ENVIRONMENT: 'production' } as any);
      vi.spyOn(service as any, 'isDevelopment').mockReturnValue(false);
      vi.spyOn(service as any, 'getAllowedModel').mockReturnValue(ALLOWED_MODELS[0]);
      vi.spyOn(service as any, 'getUsage').mockResolvedValue({ used: 0, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'incrementUsage').mockResolvedValue({ used: 1, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'detectImageMimeFromBytes').mockReturnValue('image/jpeg'); // Mock import
      vi.spyOn(service as any, 'fetchBinary').mockResolvedValue({ arrayBuffer: new ArrayBuffer(0), contentType: 'image/png' });
      vi.spyOn(service as any, 'runReplicate').mockResolvedValue('https://example.com/output.png');
      // Mock R2/KV
      (mockEnv.R2_AI_IMAGES.put as any).mockResolvedValue(undefined);
      (mockEnv.KV_AI_ENHANCER.get as any).mockResolvedValue(null);
      (mockEnv.KV_AI_ENHANCER.put as any).mockResolvedValue(undefined);
    });

    it('should call assistant and apply suggested scale and faceEnhance', async () => {
      const assistantResponse: AssistantResponse = { content: '{"scale": 2, "faceEnhance": true}' };
      vi.spyOn(service as any, 'callCustomAssistant').mockResolvedValueOnce(assistantResponse);

      const params: GenerateParams = { ...baseParams, scale: 4, faceEnhance: false };
      await service.generate(params);

      expect(service.callCustomAssistant).toHaveBeenCalledWith(
        expect.stringContaining(`Suggest optimal enhancement parameters for an image using model ${params.modelSlug}`),
        params.assistantId
      );
      expect((service as any).runReplicate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        image: expect.any(String),
        scale: 2,
        face_enhance: true
      }));
    });

    it('should ignore invalid assistant suggestion and use original params', async () => {
      const invalidResponse: AssistantResponse = { content: 'Invalid JSON' };
      vi.spyOn(service as any, 'callCustomAssistant').mockResolvedValueOnce(invalidResponse);

      const params: GenerateParams = { ...baseParams, scale: 4, faceEnhance: false };
      await service.generate(params);

      expect((service as any).runReplicate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        scale: 4,
        face_enhance: false
      }));
    });

    it('should apply only valid parts of assistant suggestion', async () => {
      const partialResponse: AssistantResponse = { content: '{"scale": 5, "faceEnhance": true}' }; // Invalid scale
      vi.spyOn(service as any, 'callCustomAssistant').mockResolvedValueOnce(partialResponse);

      const params: GenerateParams = { ...baseParams, scale: 4, faceEnhance: false };
      await service.generate(params);

      expect((service as any).runReplicate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        scale: 4, // Not applied
        face_enhance: true // Applied
      }));
    });

    it('should surface assistant error when assistant call fails', async () => {
      vi.spyOn(service as any, 'callCustomAssistant').mockRejectedValueOnce(new Error('Assistant error'));

      const params: GenerateParams = { ...baseParams, scale: 4, faceEnhance: false };
      await expect(service.generate(params)).rejects.toThrow('Assistant error');
    });
  });

  describe('generate without assistant', () => {
    const baseParams: GenerateParams = {
      ownerType: 'user' as OwnerType,
      ownerId: 'user-123',
      modelSlug: ALLOWED_MODELS[0].slug,
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      requestOrigin: 'https://example.com'
      // No assistantId
    };

    beforeEach(() => {
      // Use production env to avoid replicate guard
      service = new AiImageService({ ...mockEnv, ENVIRONMENT: 'production' } as any);
      vi.spyOn(service as any, 'getAllowedModel').mockReturnValue(ALLOWED_MODELS[0]);
      vi.spyOn(service as any, 'getUsage').mockResolvedValue({ used: 0, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'incrementUsage').mockResolvedValue({ used: 1, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'detectImageMimeFromBytes').mockReturnValue('image/jpeg');
      vi.spyOn(service as any, 'fetchBinary').mockResolvedValue({ arrayBuffer: new ArrayBuffer(0), contentType: 'image/png' });
      vi.spyOn(service as any, 'runReplicate').mockResolvedValue('https://example.com/output.png');
      vi.spyOn(mockEnv.R2_AI_IMAGES as any, 'put').mockResolvedValue(undefined);
      vi.spyOn(mockEnv.KV_AI_ENHANCER as any, 'get').mockResolvedValue(null);
      vi.spyOn(mockEnv.KV_AI_ENHANCER as any, 'put').mockResolvedValue(undefined);
      // Spy to assert not called safely
      vi.spyOn(service as any, 'callCustomAssistant');
    });

    it('should generate without calling assistant', async () => {
      const result = await service.generate(baseParams);

      expect(service.callCustomAssistant).not.toHaveBeenCalled();
      expect(result).toHaveProperty('imageUrl');
      expect(result.model).toBe(baseParams.modelSlug);
    });
  });
});