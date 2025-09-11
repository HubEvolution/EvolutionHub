import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AiImageService, type GenerateParams, type AssistantResponse } from '@/lib/services/ai-image-service';
import { ALLOWED_MODELS, type OwnerType } from '@/config/ai-image';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai');

// Mock process.env
const mockEnv = {
  R2_AI_IMAGES: {} as any,
  KV_AI_ENHANCER: {} as any,
  REPLICATE_API_TOKEN: 'test-token',
  OPENAI_API_KEY: 'sk-test-key',
  ENVIRONMENT: 'development'
};

vi.mocked(OpenAI.prototype.beta.threads.create).mockResolvedValue({ id: 'thread-123' } as any);
vi.mocked(OpenAI.prototype.beta.threads.messages.create).mockResolvedValue({} as any);
vi.mocked(OpenAI.prototype.beta.threads.runs.create).mockResolvedValue({ id: 'run-123', status: 'completed' } as any);
vi.mocked(OpenAI.prototype.beta.threads.runs.retrieve).mockResolvedValue({ status: 'completed' } as any);
vi.mocked(OpenAI.prototype.beta.threads.messages.list).mockResolvedValue({
  data: [
    {
      role: 'assistant',
      content: [{ type: 'text', text: { value: 'Test response' } }]
    }
  ]
} as any);

describe('AiImageService', () => {
  let service: AiImageService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Object.assign(process.env, mockEnv);
    service = new AiImageService(mockEnv);
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
      expect(vi.mocked(OpenAI.prototype.beta.threads.create)).toHaveBeenCalled();
      expect(vi.mocked(OpenAI.prototype.beta.threads.messages.create)).toHaveBeenCalledWith('thread-123', {
        role: 'user',
        content: prompt,
      });
      expect(vi.mocked(OpenAI.prototype.beta.threads.runs.create)).toHaveBeenCalledWith('thread-123', {
        assistant_id: assistantId,
      });
      expect(vi.mocked(OpenAI.prototype.beta.threads.messages.list)).toHaveBeenCalledWith('thread-123');
      expect(result).toEqual({ content: 'Test response' });
    });

    it('should throw error if OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow('OPENAI_API_KEY not configured');
    });

    it('should throw error on run failure (status: failed)', async () => {
      vi.mocked(OpenAI.prototype.beta.threads.runs.create).mockResolvedValueOnce({ id: 'run-123', status: 'in_progress' } as any);
      vi.mocked(OpenAI.prototype.beta.threads.runs.retrieve).mockResolvedValueOnce({ status: 'failed' } as any);

      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow('Run failed with status: failed');
    });

    it('should throw error if no assistant message', async () => {
      vi.mocked(OpenAI.prototype.beta.threads.messages.list).mockResolvedValueOnce({ data: [] } as any);

      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow('No response from assistant');
    });

    it('should throw error on network error during run creation', async () => {
      const error = new Error('Network error');
      vi.mocked(OpenAI.prototype.beta.threads.runs.create).mockRejectedValueOnce(error);

      await expect(service.callCustomAssistant('prompt', 'asst-123')).rejects.toThrow('Failed to call assistant');
    });

    it('should log error on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      vi.mocked(OpenAI.prototype.beta.threads.create).mockRejectedValueOnce(error);

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
      vi.spyOn(service as any, 'getAllowedModel').mockReturnValue(ALLOWED_MODELS[0]);
      vi.spyOn(service as any, 'getUsage').mockResolvedValue({ used: 0, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'incrementUsage').mockResolvedValue({ used: 1, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'detectImageMimeFromBytes').mockReturnValue('image/jpeg'); // Mock import
      vi.spyOn(service as any, 'fetchBinary').mockResolvedValue({ arrayBuffer: new ArrayBuffer(0), contentType: 'image/png' });
      vi.spyOn(service as any, 'runReplicate').mockResolvedValue('https://example.com/output.png');
      // Mock R2 put
      vi.spyOn(mockEnv.R2_AI_IMAGES as any, 'put').mockResolvedValue(undefined);
      // Mock KV get/put
      vi.spyOn(mockEnv.KV_AI_ENHANCER as any, 'get').mockResolvedValue(null);
      vi.spyOn(mockEnv.KV_AI_ENHANCER as any, 'put').mockResolvedValue(undefined);
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
      expect(service.runReplicate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
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

      expect(service.runReplicate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        scale: 4,
        face_enhance: false
      }));
    });

    it('should apply only valid parts of assistant suggestion', async () => {
      const partialResponse: AssistantResponse = { content: '{"scale": 5, "faceEnhance": true}' }; // Invalid scale
      vi.spyOn(service as any, 'callCustomAssistant').mockResolvedValueOnce(partialResponse);

      const params: GenerateParams = { ...baseParams, scale: 4, faceEnhance: false };
      await service.generate(params);

      expect(service.runReplicate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        scale: 4, // Not applied
        face_enhance: true // Applied
      }));
    });

    it('should handle assistant error gracefully and use original params', async () => {
      vi.spyOn(service as any, 'callCustomAssistant').mockRejectedValueOnce(new Error('Assistant error'));

      const params: GenerateParams = { ...baseParams, scale: 4, faceEnhance: false };
      await service.generate(params);

      expect(service.runReplicate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        scale: 4,
        faceEnhance: false
      }));
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
      vi.spyOn(service as any, 'getAllowedModel').mockReturnValue(ALLOWED_MODELS[0]);
      vi.spyOn(service as any, 'getUsage').mockResolvedValue({ used: 0, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'incrementUsage').mockResolvedValue({ used: 1, limit: 10, resetAt: null });
      vi.spyOn(service as any, 'detectImageMimeFromBytes').mockReturnValue('image/jpeg');
      vi.spyOn(service as any, 'fetchBinary').mockResolvedValue({ arrayBuffer: new ArrayBuffer(0), contentType: 'image/png' });
      vi.spyOn(service as any, 'runReplicate').mockResolvedValue('https://example.com/output.png');
      vi.spyOn(mockEnv.R2_AI_IMAGES as any, 'put').mockResolvedValue(undefined);
      vi.spyOn(mockEnv.KV_AI_ENHANCER as any, 'get').mockResolvedValue(null);
      vi.spyOn(mockEnv.KV_AI_ENHANCER as any, 'put').mockResolvedValue(undefined);
    });

    it('should generate without calling assistant', async () => {
      const result = await service.generate(baseParams);

      expect(service.callCustomAssistant).not.toHaveBeenCalled();
      expect(result).toHaveProperty('imageUrl');
      expect(result.model).toBe(baseParams.modelSlug);
    });
  });
});