import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptEnhancerService, type EnhanceInput, type EnhanceOptions } from '@/lib/services/prompt-enhancer-service';
import type { KVNamespace } from '@cloudflare/workers-types';

// Mock loggerFactory
vi.mock('@/server/utils/logger-factory', () => ({
  loggerFactory: {
    createLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

// Mock security-logger
vi.mock('@/lib/security-logger', () => ({
  logApiAccess: vi.fn(),
  logMetricTiming: vi.fn(),
}));

const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
} as unknown as KVNamespace;

const mockEnv = {
  KV_PROMPT_ENHANCER: mockKV,
  ENVIRONMENT: 'development',
};

describe('PromptEnhancerService', () => {
  let service: PromptEnhancerService;

  beforeEach(() => {
    service = new PromptEnhancerService(mockEnv);
    vi.clearAllMocks();
  });

  describe('enhance', () => {
    const input: EnhanceInput = { 
      text: 'Schreibe einen präzisen Prompt für einen Agenten, der aus Longtail-Keywords Blogposts generiert. Quellen angeben, Markdown-Output.' 
    };
    const options: EnhanceOptions = { mode: 'agent', safety: true, includeScores: true };

    it('should enhance basic input successfully with full structure', async () => {
      mockKV.get.mockResolvedValueOnce(JSON.stringify({ count: 0, resetAt: Date.now() + 86400000 }));
      mockKV.put.mockResolvedValue();

      const result = await service.enhance(input, options, 'guest', 'test-guest-id');

      expect(result.enhanced.role).toBe('You are an expert content creator.');
      expect(result.enhanced.objective).toContain('Perform generate task');
      expect(result.enhanced.constraints).toContain('cite sources');
      expect(result.enhanced.outputFormat).toBe('Markdown with sections for key parts.');
      expect(result.enhanced.steps).toBeDefined();
      expect(result.safetyReport.masked).toEqual([]);
      expect(result.scores).toBeDefined();
      expect(result.scores!.clarity).toBeGreaterThanOrEqual(0);
      expect(result.usage.used).toBe(1);
      expect(mockKV.put).toHaveBeenCalledTimes(1);
    });

    it('should mask PII and generate report', async () => {
      const piiInput: EnhanceInput = { 
        text: 'Help me email john.doe@example.com at +1-555-1234 about the project.' 
      };
      mockKV.get.mockResolvedValueOnce(JSON.stringify({ count: 0, resetAt: Date.now() + 86400000 }));
      mockKV.put.mockResolvedValue();

      const result = await service.enhance(piiInput, options, 'guest', 'test-guest-id');

      expect(result.enhanced.rawText).toContain('[REDACTED]');
      expect(result.safetyReport.masked).toContain('john.doe@example.com');
      expect(result.safetyReport.masked).toContain('+1-555-1234');
      expect(result.safetyReport.types).toEqual(expect.arrayContaining(['email', 'phone']));
      expect(result.safetyReport.types.length).toBe(2);
    });

    it('should throw validation error for empty input', async () => {
      const emptyInput: EnhanceInput = { text: '' };

      await expect(
        service.enhance(emptyInput, options, 'guest', 'test-id')
      ).rejects.toThrow('Input text is required and cannot be empty');
    });

    it('should throw quota exceeded error', async () => {
      mockKV.get.mockResolvedValueOnce(JSON.stringify({ count: 5, resetAt: Date.now() + 86400000 })); // Guest limit 5

      await expect(
        service.enhance(input, options, 'guest', 'test-id')
      ).rejects.toThrow('Daily quota exceeded');
    });

    it('should be deterministic for same input', async () => {
      mockKV.get.mockResolvedValue(JSON.stringify({ count: 0, resetAt: Date.now() + 86400000 }));
      mockKV.put.mockResolvedValue();

      const result1 = await service.enhance(input, options, 'guest', 'id1');
      const result2 = await service.enhance(input, options, 'guest', 'id2');

      expect(result1.enhanced).toEqual(result2.enhanced);
      expect(result1.safetyReport).toEqual(result2.safetyReport);
      expect(result1.scores).toEqual(result2.scores);
    });

    it('should calculate scores appropriately for complex input', async () => {
      const complexInput: EnhanceInput = { 
        text: 'A very long complex input with many keywords like AI, prompt, engineering, testing, development to analyze and generate detailed content step by step including multiple sections.' 
      };
      mockKV.get.mockResolvedValueOnce(JSON.stringify({ count: 0, resetAt: Date.now() + 86400000 }));
      mockKV.put.mockResolvedValue();

      const result = await service.enhance(complexInput, options, 'user', 'test-user-id');

      expect(result.scores!.clarity).toBeGreaterThan(0.5);
      expect(result.scores!.specificity).toBeGreaterThan(0.3);
      expect(result.scores!.testability).toBe(0.8); // Complex has steps
    });

    it('should use concise mode for shorter output', async () => {
      const optionsConcise: EnhanceOptions = { mode: 'concise', safety: true, includeScores: true };
      mockKV.get.mockResolvedValueOnce(JSON.stringify({ count: 0, resetAt: Date.now() + 86400000 }));
      mockKV.put.mockResolvedValue();

      const result = await service.enhance(input, optionsConcise, 'guest', 'test-id');

      expect(result.enhanced.constraints).not.toContain('Collaborate as needed'); // No agent extension
      expect(result.enhanced.steps?.length).toBeLessThanOrEqual(3); // Shorter
    });
  });