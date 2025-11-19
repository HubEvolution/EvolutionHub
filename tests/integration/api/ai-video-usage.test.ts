import { describe, it, expect } from 'vitest';
import { getJson } from '../../shared/http';
import { getVideoEntitlementsFor } from '../../../src/config/ai-video/entitlements';

interface ApiError {
  type?: string;
  message?: string;
}

interface UsageOverview {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number | null;
}

interface AiVideoUsageData {
  limit: number;
  remaining: number;
  resetAt: number;
  usage: UsageOverview;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

// Minimal P1 check: /api/ai-video/usage reflects guest video entitlements
// without exhausting quota or invoking external providers.

describe('AI Video Usage API — Entitlements and limits', () => {
  it('GET /api/ai-video/usage as guest returns limits consistent with config', async () => {
    const { res, json } = await getJson<ApiResponse<AiVideoUsageData>>(
      '/api/ai-video/usage?debug=1'
    );

    expect(res.status).toBe(200);
    expect(json?.success).toBe(true);
    if (!json?.success || !json.data) return;

    const { limit, remaining, usage } = json.data;

    // Guest caller (no session cookie) should be treated wie guest entitlements
    const entitlements = getVideoEntitlementsFor('guest', undefined);
    const expectedLimit = Math.max(0, entitlements.monthlyCreditsTenths) / 10;

    // Top-level limit should match entitlements-based monthly credits (in whole credits)
    expect(limit).toBe(expectedLimit);

    // Usage.limit should be aligned with the resolved entitlements for this owner
    expect(usage.limit).toBe(expectedLimit);

    // Basic sanity checks on usage and remaining
    expect(limit).toBeGreaterThanOrEqual(0);
    expect(usage.used).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeGreaterThanOrEqual(0);

    // Response headers expose the resolved limit as X-Usage-Limit when available
    const headerLimit = res.headers.get('x-usage-limit');
    if (headerLimit !== null) {
      expect(Number(headerLimit)).toBe(expectedLimit);
    }
  });
});
