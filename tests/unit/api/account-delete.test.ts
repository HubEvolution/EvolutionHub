import { describe, it, expect, vi, beforeEach } from 'vitest';

const stripeUpdateMock = vi.fn();

vi.mock('stripe', () => ({
  default: class StripeMock {
    subscriptions = {
      update: stripeUpdateMock,
    };
  },
}));

import { DELETE } from '@/pages/api/user/account';

function createRequest(body: Record<string, unknown>) {
  return new Request('https://example.com/api/user/account', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://example.com',
    },
    body: JSON.stringify(body),
  });
}

type SubscriptionRow = {
  id: string;
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: number | null;
};

function createMockDb(options: {
  subscriptions: SubscriptionRow[];
  onUpdate?: (id: string) => void;
}) {
  const { subscriptions, onUpdate } = options;

  return {
    prepare(sql: string) {
      if (sql.includes('FROM subscriptions') && sql.includes('status IN')) {
        return {
          bind: () => ({
            all: async () => subscriptions,
          }),
        };
      }

      if (sql.includes('UPDATE subscriptions') && sql.includes('cancel_at_period_end')) {
        return {
          bind: (...args: unknown[]) => ({
            run: vi.fn(async () => {
              onUpdate?.(String(args[0]));
            }),
          }),
        };
      }

      return {
        bind: (..._args: unknown[]) => ({
          run: vi.fn(async () => {}),
        }),
      };
    },
    batch: vi.fn(async (statements: Array<{ run?: () => Promise<void> }>) => {
      for (const stmt of statements) {
        if (typeof stmt.run === 'function') {
          await stmt.run();
        }
      }
    }),
  };
}

function createContext(params: { body: Record<string, unknown>; db: any; stripeSecret?: string }) {
  return {
    clientAddress: '127.0.0.1',
    request: createRequest(params.body),
    locals: {
      user: { id: 'user-123', email: 'user@example.com' },
      runtime: {
        env: {
          DB: params.db,
          STRIPE_SECRET: params.stripeSecret ?? 'sk_test',
        },
      },
    },
  } as any;
}

describe('DELETE /api/user/account', () => {
  beforeEach(() => {
    stripeUpdateMock.mockReset();
  });

  it('returns subscription_active when active subscriptions exist without cancel flag', async () => {
    const db = createMockDb({
      subscriptions: [
        {
          id: 'sub_123',
          plan: 'pro',
          status: 'active',
          current_period_end: 1234567890,
          cancel_at_period_end: 0,
        },
      ],
    });

    const response = await DELETE(
      createContext({
        body: { confirm: true },
        db,
      })
    );

    expect(response.status).toBe(400);
    const payload: any = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.type).toBe('subscription_active');
    expect(payload.error.details.subscriptions[0].id).toBe('sub_123');
    expect(stripeUpdateMock).not.toHaveBeenCalled();
    expect(db.batch).not.toHaveBeenCalled();
  });

  it('cancels subscription when requested and proceeds with deletion', async () => {
    const onUpdate = vi.fn();
    const db = createMockDb({
      subscriptions: [
        {
          id: 'sub_789',
          plan: 'premium',
          status: 'active',
          current_period_end: 1234567890,
          cancel_at_period_end: 0,
        },
        {
          id: 'sub_456',
          plan: 'pro',
          status: 'trialing',
          current_period_end: null,
          cancel_at_period_end: 0,
        },
      ],
      onUpdate,
    });

    const response = await DELETE(
      createContext({
        body: { confirm: true, cancelSubscription: true },
        db,
      })
    );

    expect(response.status).toBe(204);
    expect(stripeUpdateMock).toHaveBeenCalledTimes(2);
    expect(stripeUpdateMock).toHaveBeenCalledWith('sub_789', { cancel_at_period_end: true });
    expect(stripeUpdateMock).toHaveBeenCalledWith('sub_456', { cancel_at_period_end: true });
    expect(db.batch).toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('deletes account immediately when no active subscriptions exist', async () => {
    const db = createMockDb({ subscriptions: [] });

    const response = await DELETE(
      createContext({
        body: { confirm: true },
        db,
      })
    );

    expect(response.status).toBe(204);
    expect(stripeUpdateMock).not.toHaveBeenCalled();
    expect(db.batch).toHaveBeenCalled();
  });
});
