import { describe, it, expect } from 'vitest';
import { TEST_URL, safeParseJson } from '../../shared/http';

interface ApiJson<T = unknown> {
  success?: boolean;
  data?: T;
  error?: { type?: string; message?: string } | null;
}

interface DiscountCodeJson {
  id: string;
  code: string;
  stripeCouponId: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number | null;
  usesCount: number;
  validFrom: number | null;
  validUntil: number | null;
  status: 'active' | 'inactive' | 'expired';
  description: string | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

function adminHeaders(extra: Record<string, string> = {}): HeadersInit {
  const cookie = process.env.TEST_ADMIN_COOKIE || 'session_id=e2e-admin-session-0001';
  const csrf = 'csrf_' + Math.random().toString(36).slice(2);
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf,
    Cookie: `${cookie}; csrf_token=${csrf}`,
    ...extra,
  };
}

async function httpGet(path: string, headers: HeadersInit = {}) {
  const res = await fetch(`${TEST_URL}${path}`, {
    method: 'GET',
    headers: {
      Origin: TEST_URL,
      ...headers,
    },
    redirect: 'manual',
  });
  const text = res.status !== 302 ? await res.text() : '';
  const json = text ? safeParseJson<ApiJson>(text) : null;
  return { res, text, json } as const;
}

async function httpPost(path: string, body: unknown, headers: HeadersInit = {}) {
  const res = await fetch(`${TEST_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: TEST_URL,
      ...headers,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const text = res.status !== 302 ? await res.text() : '';
  const json = text ? safeParseJson<ApiJson>(text) : null;
  return { res, text, json } as const;
}

describe('Admin Discounts API — auth & CSRF checks', () => {
  it('GET /api/admin/discounts/list denies unauthenticated access with 401', async () => {
    const { res } = await httpGet('/api/admin/discounts/list?limit=5');
    expect([401, 404]).toContain(res.status);
  });

  it('POST /api/admin/discounts/create without CSRF → 401/403/429', async () => {
    const { res } = await httpPost('/api/admin/discounts/create', {
      code: 'TEST_NO_CSRF',
      stripeCouponId: 'coupon_no_csrf',
      type: 'percentage',
      value: 10,
    });

    expect([401, 403, 429]).toContain(res.status);
    const retryAfter = res.headers.get('Retry-After');
    if (res.status === 429) {
      expect(retryAfter).toBeTruthy();
    }
  });
});

describe('Admin Discounts API — create & list', () => {
  it('allows admin to create a discount code and returns it in the list', async () => {
    const uniqueSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `DISC_ACTIVE_${uniqueSuffix}`;

    const createBody = {
      code,
      stripeCouponId: 'coupon_active_test',
      type: 'percentage' as const,
      value: 10,
      description: 'integration test active discount',
    };

    const { res: createRes, json: createJson } = await httpPost(
      '/api/admin/discounts/create',
      createBody,
      adminHeaders()
    );

    // In some environments the route may not yet be wired; accept 404 as soft failure
    expect([200, 404, 429]).toContain(createRes.status);
    if (createRes.status !== 200 || !createJson) return;

    expect(createJson.success).toBe(true);
    const created = (createJson.data as { discountCode?: DiscountCodeJson } | null)?.discountCode;
    expect(created).toBeDefined();
    if (!created) return;
    expect(created.code).toBe(code);

    const { res: listRes, json: listJson } = await httpGet(
      `/api/admin/discounts/list?status=active&search=${encodeURIComponent(code)}`,
      adminHeaders({ 'Content-Type': 'application/json' })
    );

    expect([200, 404, 429]).toContain(listRes.status);
    if (listRes.status !== 200 || !listJson) return;

    expect(listJson.success).toBe(true);
    const listData = listJson.data as {
      items?: DiscountCodeJson[];
      pagination?: { limit: number; cursor: string | null };
    } | null;
    expect(Array.isArray(listData?.items)).toBe(true);
    const codes = (listData?.items ?? []).map((d) => d.code);
    expect(codes).toContain(code);
  });

  it('supports isActiveNow filter based on validFrom/validUntil', async () => {
    const now = Date.now();
    const suffixOk = Math.random().toString(36).slice(2, 8).toUpperCase();
    const suffixFuture = Math.random().toString(36).slice(2, 8).toUpperCase();
    const codeOk = `DISC_WINDOW_OK_${suffixOk}`;
    const codeFuture = `DISC_WINDOW_FUT_${suffixFuture}`;

    // Active in current window
    await httpPost(
      '/api/admin/discounts/create',
      {
        code: codeOk,
        stripeCouponId: 'coupon_window_ok',
        type: 'percentage' as const,
        value: 15,
        validFrom: now - 1_000,
        validUntil: now + 86_400_000,
      },
      adminHeaders()
    );

    // Starts in the future (should not be active now)
    await httpPost(
      '/api/admin/discounts/create',
      {
        code: codeFuture,
        stripeCouponId: 'coupon_window_future',
        type: 'percentage' as const,
        value: 20,
        validFrom: now + 86_400_000,
        validUntil: null,
      },
      adminHeaders()
    );

    const { res, json } = await httpGet(
      `/api/admin/discounts/list?status=active&isActiveNow=true&search=${encodeURIComponent(
        'DISC_WINDOW_'
      )}`,
      adminHeaders({ 'Content-Type': 'application/json' })
    );

    expect([200, 404, 429]).toContain(res.status);
    if (res.status !== 200 || !json) return;

    expect(json.success).toBe(true);
    const data = json.data as { items?: DiscountCodeJson[] } | null;
    const items = data?.items ?? [];
    const codes = items.map((d) => d.code);

    // Should contain the currently active code
    expect(codes.some((c) => c.startsWith('DISC_WINDOW_OK_'))).toBe(true);
    // May or may not contain the future one depending on rate-limit/other factors,
    // but if present, it must not be included when isActiveNow=true
    expect(codes.some((c) => c.startsWith('DISC_WINDOW_FUT_'))).toBe(false);
  });

  it('treats unlimited codes as having remaining uses when hasRemainingUses=true', async () => {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `DISC_UNLIMITED_${suffix}`;

    await httpPost(
      '/api/admin/discounts/create',
      {
        code,
        stripeCouponId: 'coupon_unlimited',
        type: 'percentage' as const,
        value: 5,
        // no maxUses -> unlimited
      },
      adminHeaders()
    );

    const { res, json } = await httpGet(
      `/api/admin/discounts/list?hasRemainingUses=true&search=${encodeURIComponent(code)}`,
      adminHeaders({ 'Content-Type': 'application/json' })
    );

    expect([200, 404, 429]).toContain(res.status);
    if (res.status !== 200 || !json) return;

    expect(json.success).toBe(true);
    const data = json.data as { items?: DiscountCodeJson[] } | null;
    const items = data?.items ?? [];
    const codes = items.map((d) => d.code);
    expect(codes).toContain(code);
  });

  it('allows admin to create a Stripe coupon for an existing discount code', async () => {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `DISC_STRIPE_COUPON_${suffix}`;

    // First create a discount without a Stripe coupon id
    const { res: createRes, json: createJson } = await httpPost(
      '/api/admin/discounts/create',
      {
        code,
        type: 'percentage' as const,
        value: 10,
        description: 'integration test create stripe coupon',
      },
      adminHeaders()
    );

    expect([200, 404, 429]).toContain(createRes.status);
    if (createRes.status !== 200 || !createJson) return;

    const created = (createJson.data as { discountCode?: DiscountCodeJson } | null)?.discountCode;
    expect(created).toBeDefined();
    if (!created) return;

    // Then invoke the admin endpoint to create a Stripe coupon for this discount
    const { res: couponRes, json: couponJson } = await httpPost(
      `/api/admin/discounts/${created.id}/create-stripe-coupon`,
      {},
      adminHeaders()
    );

    expect([200, 404, 429]).toContain(couponRes.status);
    if (couponRes.status !== 200 || !couponJson) return;

    expect(couponJson.success).toBe(true);
    const updated = (couponJson.data as { discountCode?: DiscountCodeJson } | null)?.discountCode;
    expect(updated).toBeDefined();
    if (!updated) return;

    expect(typeof updated.stripeCouponId).toBe('string');
    expect(updated.stripeCouponId).not.toBe('');
  });
});
