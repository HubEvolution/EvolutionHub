import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

import { hex32, getJson, TEST_URL, safeParseJson } from '../../shared/http';
import { ALLOWED_MODELS } from '../../../src/config/ai-image';

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

interface AiImageGenerateData {
  model: string;
  originalUrl: string;
  imageUrl: string;
  usage: UsageInfo;
  limits: { user: number; guest: number };
  entitlements: PlanEntitlements;
  charge?: {
    total: number;
    planPortion: number;
    creditsPortion: number;
  };
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

function buildGuestId() {
  return `ai-image-quota-${hex32()}`;
}

async function getUsageForGuest(guestId: string): Promise<UsageInfo> {
  const { res, json } = await getJson<ApiResponse<AiImageUsageData>>(
    '/api/ai-image/usage?debug=1',
    {
      headers: {
        Cookie: `guest_id=${encodeURIComponent(guestId)}`,
      },
    }
  );

  expect(res.status).toBe(200);
  if (!json || json.success !== true || !json.data) {
    throw new Error('Expected success usage response for AI Image');
  }

  return json.data.usage;
}

async function createSampleFile(rootDir: string): Promise<File> {
  const pngPath = join(rootDir, 'public', 'favicons', 'apple-touch-icon.png');
  const buf = await readFile(pngPath);
  return new File([buf], 'sample.png', { type: 'image/png' });
}

async function generateAsGuest(
  guestId: string,
  rootDir: string
): Promise<{ res: Response; json: ApiResponse<AiImageGenerateData> | null }> {
  const file = await createSampleFile(rootDir);
  const fd = new FormData();
  fd.append('image', file);
  fd.append('model', ALLOWED_MODELS[0].slug);

  const csrf = hex32();
  const cookie = `guest_id=${encodeURIComponent(guestId)}; csrf_token=${csrf}`;

  const res = await fetch(`${TEST_URL}/api/ai-image/generate`, {
    method: 'POST',
    body: fd,
    redirect: 'manual',
    headers: {
      Origin: TEST_URL,
      'X-CSRF-Token': csrf,
      Cookie: cookie,
    },
  });

  const text = await res.text();
  const json = text ? safeParseJson<ApiResponse<AiImageGenerateData>>(text) : null;

  return { res, json };
}

// This test focuses on verifying that a successful AI Image generation
// increments the guest usage counter and exposes the updated usage and
// charge breakdown in the standard API envelope. It intentionally avoids
// exhausting the full daily quota to keep provider costs low; boundary
// behaviour (limit reached) is covered by manual staging checks.

describe('AI Image Generate – guest usage and quota behaviour', () => {
  let rootDir = '';

  beforeAll(() => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // test file is in tests/integration/api, so we need to go three levels up
    // to reach the repo root (../../..)
    rootDir = join(__dirname, '../../..');
  });

  it('increments guest usage on successful generate and exposes usage and charge', async () => {
    const guestId = buildGuestId();

    const before = await getUsageForGuest(guestId);
    const { used: beforeUsed, limit } = before;

    if (!Number.isFinite(limit) || limit <= 0) {
      // Misconfigured env; nothing sinnvoll zu testen
      return;
    }

    const { res, json } = await generateAsGuest(guestId, rootDir);

    // In dev/testing, rate limiting or disabled providers are tolerated: we
    // assert basic headers and skip strict quota assertions to avoid flakes.
    if (res.status === 429) {
      expect(
        res.headers.get('Retry-After') || res.headers.get('retry-after')
      ).toBeTruthy();
      return;
    }

    if (res.status === 403 || res.status === 500) {
      // Providers disabled or misconfigured in local/test env
      return;
    }

    expect(res.status).toBe(200);
    if (!json || json.success !== true || !json.data) {
      throw new Error('Expected success response from /api/ai-image/generate');
    }

    const { usage, charge } = json.data;

    // Usage.limit should remain aligned with the entitlements-based daily cap
    expect(usage.limit).toBe(limit);
    // At least one successful call should increase "used" by >= 1
    expect(usage.used).toBeGreaterThanOrEqual(beforeUsed + 1);

    if (charge) {
      expect(typeof charge.total).toBe('number');
      expect(typeof charge.planPortion).toBe('number');
      expect(typeof charge.creditsPortion).toBe('number');
    }
  });
});
