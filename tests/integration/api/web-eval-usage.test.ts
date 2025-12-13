import { describe, it, expect } from 'vitest';
import { getJson } from '../../shared/http';
import { getWebEvalEntitlementsFor } from '../../../src/config/web-eval/entitlements';

interface ApiError {
  type?: string;
  message?: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

interface WebEvalPlanEntitlements {
  monthlyRuns: number;
  dailyBurstCap: number;
}

interface WebEvalUsageData {
  ownerType: 'user' | 'guest';
  usage: UsageInfo;
  limits: { user: number; guest: number };
  plan?: string;
  entitlements: WebEvalPlanEntitlements;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

// Minimal P1 check: /api/testing/evaluate/usage reflects Web Eval entitlements
// for guests as defined in src/config/web-eval/entitlements.ts.
describe('Web Eval Usage API — Entitlements and limits', () => {
  it('GET /api/testing/evaluate/usage as guest returns entitlements consistent with config', async () => {
    const { res, json } = await getJson<ApiResponse<WebEvalUsageData>>(
      '/api/testing/evaluate/usage?debug=1'
    );

    if (
      res.status === 403 &&
      json?.success === false &&
      json.error?.type === 'forbidden' &&
      json.error?.message === 'feature.disabled.web_eval'
    ) {
      return;
    }

    expect(res.status).toBe(200);
    expect(json?.success).toBe(true);
    if (!json?.success || !json.data) return;

    const { ownerType, usage, limits, entitlements } = json.data;

    // Guest caller (no session cookie) should be treated as guest
    expect(ownerType).toBe('guest');

    // Reference entitlements for guests from config
    const guestEnt = getWebEvalEntitlementsFor('guest');

    // Entitlements in API response must match the config values
    expect(entitlements.dailyBurstCap).toBe(guestEnt.dailyBurstCap);
    expect(entitlements.monthlyRuns).toBe(guestEnt.monthlyRuns);

    // limits.user/guest are resolved from ent.dailyBurstCap in the route
    expect(limits.user).toBe(guestEnt.dailyBurstCap);
    expect(limits.guest).toBe(guestEnt.dailyBurstCap);

    // Usage.limit should align with the resolved dailyBurstCap
    expect(usage.limit).toBe(guestEnt.dailyBurstCap);

    // Response headers expose the resolved limit as X-Usage-Limit
    const headerLimit = res.headers.get('x-usage-limit');
    if (headerLimit !== null) {
      expect(Number(headerLimit)).toBe(guestEnt.dailyBurstCap);
    }
  });
});
