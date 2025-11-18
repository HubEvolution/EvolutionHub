import { describe, it, expect } from 'vitest';
import { getJson } from '../../shared/http';
import { FREE_LIMIT_GUEST, FREE_LIMIT_USER } from '../../../src/config/ai-image';

interface ApiError {
  type?: string;
  message?: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

interface PlanEntitlements {
  monthlyImages: number;
  dailyBurstCap: number;
  maxUpscale: number;
  faceEnhance: boolean;
}

interface AiImageUsageData {
  ownerType: 'user' | 'guest';
  usage: UsageInfo;
  limits: { user: number; guest: number };
  plan?: string;
  entitlements: PlanEntitlements;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

// Minimal P1 check: /api/ai-image/usage reflects FREE_LIMIT_* and guest entitlements
// without exhausting quota or depending on external providers.
describe('AI Image Usage API — Entitlements and limits', () => {
  it('GET /api/ai-image/usage as guest returns entitlements consistent with config', async () => {
    const { res, json } = await getJson<ApiResponse<AiImageUsageData>>(
      '/api/ai-image/usage?debug=1'
    );

    expect(res.status).toBe(200);
    expect(json?.success).toBe(true);
    if (!json?.success || !json.data) return;

    const { ownerType, usage, limits, entitlements } = json.data;

    // Guest caller (no session cookie) should be treated as guest
    expect(ownerType).toBe('guest');

    // Limits object must expose the configured FREE_LIMIT_* values
    expect(limits.user).toBe(FREE_LIMIT_USER);
    expect(limits.guest).toBe(FREE_LIMIT_GUEST);

    // Entitlements for guests are derived from FREE_LIMIT_GUEST in config/ai-image/entitlements.ts
    // dailyBurstCap equals FREE_LIMIT_GUEST, monthlyImages is FREE_LIMIT_GUEST * 30 according to config.
    expect(entitlements.dailyBurstCap).toBe(FREE_LIMIT_GUEST);
    expect(entitlements.monthlyImages).toBe(FREE_LIMIT_GUEST * 30);

    // Usage.limit should be aligned with the resolved entitlements for this owner
    expect(usage.limit).toBe(entitlements.dailyBurstCap);

    // Response headers expose the resolved limit as X-Usage-Limit
    const headerLimit = res.headers.get('x-usage-limit');
    if (headerLimit !== null) {
      expect(Number(headerLimit)).toBe(entitlements.dailyBurstCap);
    }
  });
});
