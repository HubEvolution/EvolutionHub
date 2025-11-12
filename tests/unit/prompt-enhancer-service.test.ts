import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted logger mock so the factory is mocked before the service module evaluates
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/server/utils/logger-factory', () => ({
  loggerFactory: {
    createLogger: vi.fn(() => mockLogger),
  },
}));

import { PromptEnhancerService, type EnhanceInput, type EnhanceOptions } from '@/lib/services/prompt-enhancer-service';

describe('PromptEnhancerService', () => {
  let service: PromptEnhancerService;
  let mockKV: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    getWithMetadata: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      list: vi.fn(async () => ({ keys: [], list_complete: true })),
      getWithMetadata: vi.fn(async () => null),
      delete: vi.fn(async () => undefined)
    };
    const mockEnv = {
      KV_PROMPT_ENHANCER: mockKV,
      ENABLE_PROMPT_SAFETY: 'true',
      ENVIRONMENT: 'test'
    };
    vi.clearAllMocks();
    service = new PromptEnhancerService(mockEnv);
  });

  describe('parseInput', () => {
    it('should detect "generate" intent for write-related input', async () => {
      const input = 'Schreibe einen Blog über AI.';
      const result = await (service as any).parseInput(input);
      expect(result.intent).toBe('generate');
      expect(result.keywords).toContain('schreibe');
      expect(result.keywords).toContain('blog');
      expect(result.isComplex).toBe(false);
    });

    it('should detect "analyze" intent for analysis input', async () => {
      const input = 'Analysiere die Verkaufsdaten.';
      const result = await (service as any).parseInput(input);
      expect(result.intent).toBe('analyze');
      expect(result.isComplex).toBe(false);
    });

    it('should detect "translate" intent for translation input', async () => {
      const input = 'Übersetze diesen Text ins Englische.';
      const result = await (service as any).parseInput(input);
      expect(result.intent).toBe('translate');
      expect(result.isComplex).toBe(false);
    });

    it('should default to "generate" intent and extract keywords', async () => {
      const input = 'Erstelle eine Liste von Ideen.';
      const result = await (service as any).parseInput(input);
      expect(result.intent).toBe('generate');
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords).toContain('ideen');
    });

    it('should mark as complex for long text', async () => {
      const longText = 'Dies ist ein sehr langer Text mit vielen Wörtern. '.repeat(10);
      const result = await (service as any).parseInput(longText);
      expect(result.isComplex).toBe(true);
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords.length).toBeLessThanOrEqual(10); // Max 10 unique
    });
  });

  describe('applySafety', () => {
    it('should mask email addresses when safety is enabled', () => {
      const input = 'Kontakt: user@example.com für Anfragen.';
      const result = (service as any).applySafety(input, true);
      expect(result.cleaned).toContain('[REDACTED]');
      expect(result.report.masked).toContain('user@example.com');
      expect(result.report.types).toContain('email');
    });

    it('should mask phone numbers when safety is enabled', () => {
      const input = 'Rufen Sie +49 123 456789 an.';
      const result = (service as any).applySafety(input, true);
      expect(result.cleaned).toContain('[REDACTED]');
      expect(result.report.masked).toContain('+49 123 456789');
      expect(result.report.types).toContain('phone');
    });

    it('should mask multiple PII instances', () => {
      const input = 'Emails: a@test.com und b@foo.bar, Phone: 0123456789';
      const result = (service as any).applySafety(input, true);
      expect(result.cleaned).toContain('[REDACTED]');
      expect(result.report.masked.length).toBe(3);
      expect(result.report.types.length).toBe(3);
    });

    it('should not mask anything if no PII present', () => {
      const input = 'Nur normaler Text ohne PII.';
      const result = (service as any).applySafety(input, true);
      expect(result.cleaned).toBe(input);
      expect(result.report.masked).toEqual([]);
      expect(result.report.types).toEqual([]);
    });

    it('should skip safety if disabled', () => {
      const input = 'user@example.com';
      const result = (service as any).applySafety(input, false);
      expect(result.cleaned).toBe(input);
      expect(result.report.masked).toEqual([]);
    });
  });

  describe('calculateScores', () => {
    it('should calculate scores for a simple prompt', () => {
      const mockPrompt = {
        role: 'expert',
        objective: 'short objective',
        constraints: 'constraints',
        outputFormat: 'markdown',
        rawText: 'input'
      };
      const inputText = 'short input';
      const result = (service as any).calculateScores(mockPrompt, inputText);
      expect(result.clarity).toBeGreaterThan(0);
      expect(result.specificity).toBeGreaterThan(0);
      expect(result.testability).toBe(0.5); // No steps
    });

    it('should calculate higher testability for complex prompt with steps', () => {
      const mockPrompt = {
        role: 'expert',
        objective: 'longer objective with more words here',
        constraints: 'constraints',
        outputFormat: 'markdown',
        steps: ['step1', 'step2'],
        rawText: 'input'
      };
      const inputText = 'longer input text '.repeat(5);
      const result = (service as any).calculateScores(mockPrompt, inputText);
      expect(result.testability).toBe(0.8);
      expect(result.specificity).toBeLessThanOrEqual(1);
    });
  });

  describe('enhance', () => {
    const defaultInput: EnhanceInput = { text: 'Schreibe einen Artikel über KI.' };
    const defaultOptions: EnhanceOptions = { mode: 'agent', safety: true, includeScores: true };

    it('should enhance input successfully for guest with quota available', async () => {
      mockKV.get.mockResolvedValue('{"count":0,"resetAt":null}');
      mockKV.put.mockResolvedValue(undefined);

      const result = await service.enhance(defaultInput, defaultOptions, 'guest', 'test-guest-id');

      expect(result.enhanced.role).toBe('You are an expert prompt engineer.');
      expect(result.enhanced.objective).toContain('Perform generate task');
      expect(result.usage.used).toBe(1);
      expect(result.usage.limit).toBe(5);
      expect(mockLogger.info).toHaveBeenCalledWith('enhance_completed', expect.any(Object));
    });

    it('should include scores when requested', async () => {
      mockKV.get.mockResolvedValue('{"count":0,"resetAt":null}');
      mockKV.put.mockResolvedValue(undefined);

      const result = await service.enhance(defaultInput, { ...defaultOptions, includeScores: true }, 'guest', 'test-guest-id');

      expect(result.scores).toBeDefined();
      expect(result.scores!.clarity).toBeGreaterThan(0);
    });

    it('should apply concise mode adjustments', async () => {
      mockKV.get.mockResolvedValue('{"count":0,"resetAt":null}');
      mockKV.put.mockResolvedValue(undefined);

      const result = await service.enhance(defaultInput, { mode: 'concise', safety: true, includeScores: false }, 'guest', 'test-guest-id');

      expect(result.enhanced.constraints).toContain('keep under 500 words');
      expect(result.enhanced.steps).toBeUndefined(); // Sliced to 0-3 but simple -> undefined
    });

    it('should throw quota exceeded error when limit reached', async () => {
      mockKV.get.mockResolvedValue('{"count":5,"resetAt":null}');

      await expect(
        service.enhance(defaultInput, defaultOptions, 'guest', 'test-guest-id')
      ).rejects.toThrow('Quota exceeded. Used 5/5');
      expect(mockLogger.error).toHaveBeenCalledWith('enhance_failed', expect.objectContaining({ errorKind: 'quota_exceeded' }));
    });

    it('should handle user quota (higher limit)', async () => {
      mockKV.get.mockResolvedValue('{"count":10,"resetAt":null}');
      mockKV.put.mockResolvedValue(undefined);

      const result = await service.enhance(defaultInput, defaultOptions, 'user', 'test-user-id');

      expect(result.usage.limit).toBe(20);
      expect(result.usage.used).toBe(11);
    });

    it('should skip KV operations if no KV provided', async () => {
      const noKVService = new PromptEnhancerService({ ENABLE_PROMPT_SAFETY: 'true' });
      const result = await (noKVService as any).enhance(defaultInput, defaultOptions, 'guest', 'test-id'); // Access private if needed, but enhance public

      expect(result.usage.used).toBe(1);
      expect(result.usage.limit).toBe(5);
      expect(result.usage.resetAt).toBeNull();
    });

    it('should handle complex input with steps and examples', async () => {
      const complexInput: EnhanceInput = { text: 'Ein sehr langer Text mit vielen Details und Anforderungen. '.repeat(20) };
      mockKV.get.mockResolvedValue('{"count":0,"resetAt":null}');
      mockKV.put.mockResolvedValue(undefined);

      const result = await service.enhance(complexInput, defaultOptions, 'guest', 'test-guest-id');

      expect(result.enhanced.steps).toBeDefined();
      expect(result.enhanced.steps!.length).toBe(5);
      expect(result.enhanced.fewShotExamples).toBeDefined();
      expect(result.enhanced.fewShotExamples!.length).toBe(2);
    });

    it('should apply safety in enhance pipeline', async () => {
      const piiInput: EnhanceInput = { text: 'Schreibe über user@example.com und +49123456789.' };
      mockKV.get.mockResolvedValue('{"count":0,"resetAt":null}');
      mockKV.put.mockResolvedValue(undefined);

      const result = await service.enhance(piiInput, defaultOptions, 'guest', 'test-guest-id');

      expect(result.enhanced.rawText).toContain('[REDACTED]');
      expect(result.safetyReport.masked.length).toBe(2);
    });

    it('should disable safety if option false', async () => {
      const piiInput: EnhanceInput = { text: 'user@example.com' };
      mockKV.get.mockResolvedValue('{"count":0,"resetAt":null}');
      mockKV.put.mockResolvedValue(undefined);

      const result = await service.enhance(piiInput, { ...defaultOptions, safety: false }, 'guest', 'test-guest-id');

      expect(result.enhanced.rawText).toContain('user@example.com'); // No masking
      expect(result.safetyReport.masked).toEqual([]);
    });
  });
});