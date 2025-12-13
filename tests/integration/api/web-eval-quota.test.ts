import { describe, it, expect } from 'vitest';

import { csrfHeaders, hex32, sendJson, getJson, TEST_URL } from '../../shared/http';

interface ApiError {
  type?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

interface WebEvalUsageData {
  ownerType: 'user' | 'guest';
  usage: UsageInfo;
  limits: { user: number; guest: number };
  plan?: string;
  entitlements?: unknown;
  debug?: unknown;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

function buildGuestId() {
  return `web-eval-quota-${hex32()}`;
}

async function getUsageForGuest(guestId: string) {
  const { res, json } = await getJson<ApiResponse<WebEvalUsageData>>(
    '/api/testing/evaluate/usage?debug=1',
    {
      headers: {
        Cookie: `guest_id=${encodeURIComponent(guestId)}`,
      },
    }
  );

  if (
    res.status === 403 &&
    json?.success === false &&
    json.error?.type === 'forbidden' &&
    json.error?.message === 'feature.disabled.web_eval'
  ) {
    return null;
  }

  expect(res.status).toBe(200);
  if (!json || json.success !== true || !json.data) {
    throw new Error('Expected success usage response for Web Eval');
  }

  return json.data.usage;
}

async function createTaskAsGuest(
  guestId: string,
  overrides: Record<string, unknown> = {}
): Promise<{ res: Response; json: ApiResponse<{ taskId: string }> | null }> {
  const csrf = hex32();
  const payload = {
    url: `${TEST_URL}/`,
    task: 'quota test',
    headless: true,
    timeoutMs: 10_000,
    ...overrides,
  };

  const { res, json } = await sendJson<ApiResponse<{ taskId: string }>>(
    '/api/testing/evaluate',
    payload,
    {
      headers: {
        ...csrfHeaders(csrf),
        // Force a deterministic guest_id so usage is isolated per test run
        Cookie: `guest_id=${encodeURIComponent(guestId)}; csrf_token=${csrf}`,
      },
    }
  );

  return { res, json };
}

describe('Web Eval Task Create — Quota enforcement', () => {
  it('enforces guest dailyBurstCap with quota_exceeded after limit is reached', async () => {
    const guestId = buildGuestId();

    const usage = await getUsageForGuest(guestId);
    if (!usage) return;
    const { used, limit } = usage;

    if (!Number.isFinite(limit) || limit <= 0) {
      // Misconfigured env; nothing sinnvoll zu testen
      return;
    }

    const remaining = Math.max(0, limit - used);

    // Seed up to the configured limit
    for (let i = 0; i < remaining; i++) {
      const { res } = await createTaskAsGuest(guestId);
      if (res.status === 429) {
        // Unter parallelen Läufen kann der Rate-Limiter zuschlagen – in dem Fall nur Retry-After prüfen
        expect(res.headers.get('Retry-After')).toBeTruthy();
        return;
      }
      expect(res.status).toBe(200);
    }

    // Nächster Request sollte an der Quota-Grenze scheitern (oder im Extremfall rate-limited werden)
    const { res: overRes, json: overJson } = await createTaskAsGuest(guestId);

    if (overRes.status === 429) {
      expect(overRes.headers.get('Retry-After')).toBeTruthy();
      if (overJson && overJson.success === false) {
        expect(overJson.error?.type).toBe('rate_limit');
      }
      return;
    }

    expect(overRes.status).toBe(400);
    if (!overJson || overJson.success !== false) {
      throw new Error('Expected quota_exceeded error response');
    }

    expect(overJson.error?.type).toBe('validation_error');
    expect(overJson.error?.message).toBe('quota_exceeded');

    const details = overJson.error?.details as { limit?: unknown; resetAt?: unknown } | undefined;
    if (details && typeof details.limit === 'number') {
      expect(details.limit).toBe(limit);
    }
  });
});
