import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import type { APIContext } from 'astro';

const constructEventAsyncMock = vi.hoisted(() => vi.fn());
const stripeCtorMock = vi.hoisted(() => vi.fn());
const verifyReferralMock = vi.hoisted(() => vi.fn());

vi.mock('stripe', () => {
  return {
    __esModule: true,
    default: stripeCtorMock,
  };
});

vi.mock('@/lib/services/referral-reward-service', () => ({
  __esModule: true,
  verifyReferral: verifyReferralMock,
}));

import { POST } from '@/pages/api/billing/stripe-webhook';

function createDbMock(userIdForCustomer: string | null = null): D1Database {
  return {
    prepare: vi.fn((sql: string) => {
      const statement: any = {
        bind: vi.fn(function bind(..._args: unknown[]) {
          return statement;
        }),
        first: vi.fn(async () => {
          if (sql.includes('FROM stripe_customers')) {
            return userIdForCustomer ? { user_id: userIdForCustomer } : null;
          }
          return null;
        }),
        run: vi.fn(async () => ({ success: true })),
      };
      return statement;
    }),
  } as unknown as D1Database;
}

function createContext(options: {
  env: Record<string, unknown>;
  body: string;
  headers?: Record<string, string>;
}): APIContext {
  const request = new Request('https://example.com/api/billing/stripe-webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 'test-signature',
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body,
  });

  const cookies = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  } satisfies APIContext['cookies'];

  return {
    request,
    cookies,
    locals: {
      runtime: {
        env: options.env,
      },
    },
  } as unknown as APIContext;
}

describe('POST /api/billing/stripe-webhook referral rewards integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    constructEventAsyncMock.mockReset();
    stripeCtorMock.mockReset();
    verifyReferralMock.mockReset();
    stripeCtorMock.mockImplementation(() => ({
      webhooks: {
        constructEventAsync: constructEventAsyncMock,
      },
    }));
    verifyReferralMock.mockResolvedValue({
      type: 'verified',
      eventId: 'evt_test',
      ownerUserId: 'owner',
    });
  });

  it('calls verifyReferral on checkout.session.completed when rewards enabled', async () => {
    const event = {
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          mode: 'subscription',
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: { userId: 'user-123' },
        },
      },
    };
    constructEventAsyncMock.mockResolvedValueOnce(event);

    const env = {
      STRIPE_SECRET: 'sk_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      ENABLE_REFERRAL_REWARDS: '1',
      REFERRAL_REWARD_TENTHS: '150',
      DB: createDbMock(),
      KV_AI_ENHANCER: {},
    } satisfies Record<string, unknown>;

    const context = createContext({ env, body: JSON.stringify(event) });

    const response = await POST(context);

    expect(response.status).toBe(200);
    expect(verifyReferralMock).toHaveBeenCalledTimes(1);
    expect(verifyReferralMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referredUserId: 'user-123',
        subscriptionId: 'sub_123',
        rewardTenths: 150,
      })
    );
  });

  it('skips verifyReferral when rewards feature flag disabled', async () => {
    const event = {
      id: 'evt_checkout_disabled',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_disabled',
          mode: 'subscription',
          customer: 'cus_222',
          subscription: 'sub_222',
          metadata: { userId: 'user-222' },
        },
      },
    };
    constructEventAsyncMock.mockResolvedValueOnce(event);

    const env = {
      STRIPE_SECRET: 'sk_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      ENABLE_REFERRAL_REWARDS: '0',
      REFERRAL_REWARD_TENTHS: '150',
      DB: createDbMock(),
      KV_AI_ENHANCER: {},
    } satisfies Record<string, unknown>;

    const context = createContext({ env, body: JSON.stringify(event) });

    const response = await POST(context);

    expect(response.status).toBe(200);
    expect(verifyReferralMock).not.toHaveBeenCalled();
  });

  it('triggers verifyReferral on active subscription update', async () => {
    const event = {
      id: 'evt_subscription_update',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_789',
          customer: 'cus_789',
          status: 'active',
          items: {
            data: [
              {
                price: { id: 'price_pro' },
              },
            ],
          },
        },
      },
    };
    constructEventAsyncMock.mockResolvedValueOnce(event);

    const env = {
      STRIPE_SECRET: 'sk_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      ENABLE_REFERRAL_REWARDS: '1',
      REFERRAL_REWARD_TENTHS: '200',
      PRICING_TABLE: JSON.stringify({ pro: 'price_pro' }),
      DB: createDbMock('user-linked'),
      KV_AI_ENHANCER: {},
    } satisfies Record<string, unknown>;

    const context = createContext({ env, body: JSON.stringify(event) });

    const response = await POST(context);

    expect(response.status).toBe(200);
    expect(verifyReferralMock).toHaveBeenCalledTimes(1);
    expect(verifyReferralMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referredUserId: 'user-linked',
        subscriptionId: 'sub_789',
        rewardTenths: 200,
      })
    );
  });
});
