import { describe, it, expect } from 'vitest';
import { getJson } from '../../shared/http';

interface UsageOverview {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number | null;
}

interface ImageUsageData {
  usage?: UsageOverview;
  monthlyUsage?: UsageOverview;
}

interface VideoUsageData {
  usage?: UsageOverview;
}

interface PromptUsageData {
  usage?: UsageOverview;
}

interface VoiceUsageData {
  usage?: UsageOverview;
}

interface WebscraperUsageData {
  usage?: UsageOverview;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: unknown;
}

function expectAuthOrSkip(res: Response): boolean {
  if (res.status === 200) return true;
  // Tolerant for environments where auth or route is not available
  expect([401, 403, 404, 302]).toContain(res.status);
  return false;
}

describe('Staging quota sanity checks (HTTP-only)', () => {
  describe('AI Image usage', () => {
    it('returns a sane usage overview when accessible', async () => {
      const { res, json } = await getJson<ApiResponse<ImageUsageData>>('/api/ai-image/usage');
      if (!expectAuthOrSkip(res)) return;

      expect(json?.success).toBe(true);
      const usage = json?.data?.usage;
      expect(usage).toBeTruthy();
      if (!usage) return;
      expect(typeof usage.limit).toBe('number');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.remaining).toBe('number');
      expect(usage.limit).toBeGreaterThanOrEqual(0);
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.remaining).toBeGreaterThanOrEqual(0);
      expect(usage.used + usage.remaining).toBeGreaterThanOrEqual(usage.limit - 1);
      expect(usage.used + usage.remaining).toBeLessThanOrEqual(usage.limit + 1);
    });
  });

  describe('AI Video usage', () => {
    it('returns a sane usage overview when accessible', async () => {
      const { res, json } = await getJson<ApiResponse<VideoUsageData>>('/api/ai-video/usage');
      if (!expectAuthOrSkip(res)) return;

      expect(json?.success).toBe(true);
      const usage = json?.data?.usage;
      expect(usage).toBeTruthy();
      if (!usage) return;
      expect(typeof usage.limit).toBe('number');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.remaining).toBe('number');
      expect(usage.limit).toBeGreaterThanOrEqual(0);
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Prompt usage', () => {
    it('returns a sane usage overview when accessible', async () => {
      const { res, json } = await getJson<ApiResponse<PromptUsageData>>('/api/prompt/usage');
      if (!expectAuthOrSkip(res)) return;

      expect(json?.success).toBe(true);
      const usage = json?.data?.usage;
      expect(usage).toBeTruthy();
      if (!usage) return;
      expect(typeof usage.limit).toBe('number');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.remaining).toBe('number');
      expect(usage.limit).toBeGreaterThanOrEqual(0);
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Voice usage', () => {
    it('returns a sane usage overview when accessible', async () => {
      const { res, json } = await getJson<ApiResponse<VoiceUsageData>>('/api/voice/usage');
      if (!expectAuthOrSkip(res)) return;

      expect(json?.success).toBe(true);
      const usage = json?.data?.usage;
      expect(usage).toBeTruthy();
      if (!usage) return;
      expect(typeof usage.limit).toBe('number');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.remaining).toBe('number');
      expect(usage.limit).toBeGreaterThanOrEqual(0);
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Webscraper usage', () => {
    it('returns a sane usage overview when accessible', async () => {
      const { res, json } = await getJson<ApiResponse<WebscraperUsageData>>(
        '/api/webscraper/usage'
      );
      if (!expectAuthOrSkip(res)) return;

      expect(json?.success).toBe(true);
      const usage = json?.data?.usage;
      expect(usage).toBeTruthy();
      if (!usage) return;
      expect(typeof usage.limit).toBe('number');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.remaining).toBe('number');
      expect(usage.limit).toBeGreaterThanOrEqual(0);
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.remaining).toBeGreaterThanOrEqual(0);
    });
  });
});
