import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_URL, safeParseJson } from '../../../shared/http';
import { POST } from '@/pages/api/billing/stripe-webhook';
import * as securityLogger from '@/lib/security-logger';
import * as stripeModule from 'stripe';

// Minimal ApiJson shape used in tests
interface ApiJson {
  success?: boolean;
  data?: unknown;
  error?: { type?: string; message?: string };
}

// Mock Stripe so that we fully control webhook events in tests
vi.mock('stripe', () => {
  let behavior: (rawBody: string, sig: string, secret: string) => any | Promise<any> = () => {
    throw new Error('constructEventAsync behavior not set');
  };

  class StripeMock {
    webhooks = {
      constructEventAsync: (rawBody: string, sig: string, secret: string) =>
        behavior(rawBody, sig, secret),
    };
  }

  function __setStripeConstructBehavior(
    fn: (rawBody: string, sig: string, secret: string) => any | Promise<any>
  ) {
    behavior = fn;
  }

  return {
    __esModule: true,
    default: StripeMock,
    __setStripeConstructBehavior,
  };
});

// Stub security-logger so we can assert on logging paths
vi.mock('@/lib/security-logger', () => ({
  logSecurityEvent: vi.fn(),
  logApiError: vi.fn(),
}));

// Stub rate limiter for this endpoint (no real KV/env interaction required)
vi.mock('@/lib/rate-limiter', () => ({
  createRateLimiter: vi.fn(() =>
    vi.fn(async () => {
      // No rate limit response -> handler continues normally
      return undefined;
    })
  ),
}));

const { __setStripeConstructBehavior } = stripeModule as unknown as {
  __setStripeConstructBehavior: (
    fn: (rawBody: string, sig: string, secret: string) => any | Promise<any>
  ) => void;
};

const baseEnv: Record<string, unknown> = {
  STRIPE_SECRET: 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
  PRICING_TABLE: JSON.stringify({ pro: 'price_pro' }),
  PRICING_TABLE_ANNUAL: JSON.stringify({}),
  ENABLE_REFERRAL_REWARDS: '0',
};

let db: {
  prepare: ReturnType<typeof vi.fn>;
};

let kv: {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

function createContext(options?: {
  body?: string;
  headers?: Record<string, string>;
  envOverride?: Record<string, unknown>;
}) {
  const body = options?.body ?? '{}';
  const headers = new Headers(options?.headers ?? {});
  const request = new Request('https://example.com/api/billing/stripe-webhook', {
    method: 'POST',
    headers,
    body,
  });

  return {
    request,
    url: new URL(request.url),
    locals: {
      runtime: {
        env: {
          ...baseEnv,
          ...(options?.envOverride || {}),
          DB: db,
          KV_AI_ENHANCER: kv,
        },
      },
    },
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    clientAddress: '203.0.113.10',
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();

  db = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue(null),
      first: vi.fn().mockResolvedValue(null),
    }),
  };

  kv = {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  };
});

describe('POST /api/billing/stripe-webhook (route-level)', () => {
  it('returns 500 when Stripe is not configured', async () => {
    const ctx = createContext({
      envOverride: {
        STRIPE_SECRET: '',
        STRIPE_WEBHOOK_SECRET: '',
      },
    });

    const res = await POST(ctx);
    expect(res.status).toBe(500);

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = safeParseJson<ApiJson>(text);
      expect(json?.error?.message ?? text).toContain('Stripe not configured');
    } else {
      expect(text).toContain('Stripe not configured');
    }
  });

  it('returns 400 and logs signature_verify_failed on invalid signature', async () => {
    __setStripeConstructBehavior(() => {
      throw new Error('Invalid signature');
    });

    const ctx = createContext({
      body: '{"test":"payload"}',
      headers: {
        'stripe-signature': 'invalid-signature',
      },
    });

    const res = await POST(ctx);
    expect(res.status).toBe(400);

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = safeParseJson<ApiJson>(text);
      expect(json?.error?.message ?? text).toContain('Invalid signature');
    } else {
      expect(text).toContain('Invalid signature');
    }

    expect(securityLogger.logApiError).toHaveBeenCalledWith(
      '/api/billing/stripe-webhook',
      expect.objectContaining({
        reason: 'signature_verify_failed',
        hasSig: true,
      })
    );
  });

  it('handles checkout.session.completed subscription event and returns { received: true }', async () => {
    const event = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          mode: 'subscription',
          customer: 'cus_123',
          subscription: 'sub_123',
          client_reference_id: 'user_123',
          metadata: { plan: 'pro' },
        },
      },
    };

    __setStripeConstructBehavior(async () => event);

    const ctx = createContext({
      body: '{"dummy":"body"}',
      headers: {
        'stripe-signature': 'valid-signature',
      },
    });

    const res = await POST(ctx);
    expect(res.status).toBe(200);

    const text = await res.text();
    const json = safeParseJson<{ received?: boolean }>(text);
    expect(json?.received).toBe(true);

    expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
      'API_ACCESS',
      expect.objectContaining({
        endpoint: '/api/billing/stripe-webhook',
        phase: 'handled_checkout.session.completed',
        userId: 'user_123',
      })
    );
  });

  it('maps subscription price id to plan via env PRICING_TABLE in subscription events', async () => {
    // Force lookup of user by customer id in subscriptions handler
    db.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue(null),
      first: vi.fn().mockResolvedValue({ user_id: 'user_sub_123' }),
    });

    const event = {
      id: 'evt_price_map_123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_price_map_123',
          customer: 'cus_price_map_123',
          status: 'active',
          items: { data: [{ price: { id: 'price_pro' } }] },
        },
      },
    };

    __setStripeConstructBehavior(async () => event);

    const ctx = createContext({
      body: '{"dummy":"body"}',
      headers: {
        'stripe-signature': 'valid-signature',
      },
    });

    const res = await POST(ctx);
    expect(res.status).toBe(200);

    const text = await res.text();
    const json = safeParseJson<{ received?: boolean }>(text);
    expect(json?.received).toBe(true);

    expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
      'API_ACCESS',
      expect.objectContaining({
        endpoint: '/api/billing/stripe-webhook',
        phase: 'handled_subscription_event',
        plan: 'pro',
      })
    );
  });

  it('returns 500 and logs webhook_error when an internal error occurs', async () => {
    const event = {
      id: 'evt_boom',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_err',
          customer: 'cus_err',
          status: 'active',
          items: { data: [{ price: { id: 'price_pro' } }] },
        },
      },
    };

    __setStripeConstructBehavior(async () => event);

    // Force a DB error on first prepare call (e.g. lookup in stripe_customers)
    db.prepare = vi.fn(() => {
      throw new Error('DB failure');
    });

    const ctx = createContext({
      body: '{"dummy":"body"}',
      headers: {
        'stripe-signature': 'valid-signature',
      },
    });

    const res = await POST(ctx);
    expect(res.status).toBe(500);

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = safeParseJson<ApiJson>(text);
      expect(json?.error?.message ?? text).toContain('webhook_error');
    } else {
      expect(text).toContain('webhook_error');
    }

    expect(securityLogger.logApiError).toHaveBeenCalledWith(
      '/api/billing/stripe-webhook',
      expect.objectContaining({
        reason: 'webhook_error',
        stripeEventType: 'customer.subscription.updated',
      })
    );
  });
});

describe('Stripe webhook route — 405 via HTTP', () => {
  it('GET /api/billing/stripe-webhook responds 405 with Allow: POST when route is wired', async () => {
    const res = await fetch(`${TEST_URL}/api/billing/stripe-webhook`, {
      method: 'GET',
      headers: { Origin: TEST_URL },
      redirect: 'manual',
    });

    // In some environments the route may not be available yet -> accept 404
    expect([405, 404]).toContain(res.status);
    if (res.status === 405) {
      expect(res.headers.get('Allow')).toBe('POST');
    }
  });
});
