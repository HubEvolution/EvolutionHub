import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  verifyReferral,
  markReferralPaid,
  cancelReferral,
} from '@/lib/services/referral-reward-service';

type PreparedStatementMock = {
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

function createMockPreparedStatement(): PreparedStatementMock {
  const bind = vi.fn().mockReturnThis();
  const first = vi.fn();
  const run = vi.fn();
  return {
    bind,
    first,
    run,
  };
}

function createMockKV() {
  const store = new Map<string, string>();
  const kv = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return undefined;
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
      return undefined;
    }),
    list: vi.fn(),
  } as unknown as KVNamespace;
  return { kv, store };
}

describe('referral-reward-service verifyReferral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns disabled when feature flag is off', async () => {
    const db = { prepare: vi.fn() } as unknown as D1Database;
    const result = await verifyReferral({
      db,
      kv: undefined,
      featureEnabled: false,
      referredUserId: 'user-1',
      rewardTenths: 100,
    });
    expect(result.type).toBe('disabled');
    expect((db.prepare as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('returns no_referral when no referral event exists', async () => {
    const selectStmt = createMockPreparedStatement();
    selectStmt.first.mockResolvedValue(null);
    const mockPrepare = vi.fn((sql: string) => {
      if (sql.includes('SELECT id, owner_user_id')) {
        return selectStmt;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const db = { prepare: mockPrepare } as unknown as D1Database;

    const result = await verifyReferral({
      db,
      kv: undefined,
      featureEnabled: true,
      referredUserId: 'user-1',
      rewardTenths: 100,
    });

    expect(result.type).toBe('no_referral');
    expect(selectStmt.bind).toHaveBeenCalledWith('user-1');
  });

  it('returns already_paid when referral already paid', async () => {
    const event = {
      id: 'evt_1',
      ownerUserId: 'owner-1',
      status: 'paid',
      creditsAwarded: 20,
      metadata: null,
    };
    const selectStmt = createMockPreparedStatement();
    selectStmt.first.mockResolvedValue(event);
    const mockPrepare = vi.fn((sql: string) => {
      if (sql.includes('SELECT id, owner_user_id')) {
        return selectStmt;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const db = { prepare: mockPrepare } as unknown as D1Database;

    const result = await verifyReferral({
      db,
      kv: undefined,
      featureEnabled: true,
      referredUserId: 'user-1',
      rewardTenths: 100,
    });

    expect(result.type).toBe('already_paid');
    expect(result.eventId).toBe('evt_1');
  });

  it('returns already_verified when referral already verified with credits', async () => {
    const event = {
      id: 'evt_2',
      ownerUserId: 'owner-2',
      status: 'verified',
      creditsAwarded: 5,
      metadata: null,
    };
    const selectStmt = createMockPreparedStatement();
    selectStmt.first.mockResolvedValue(event);
    const mockPrepare = vi.fn((sql: string) => {
      if (sql.includes('SELECT id, owner_user_id')) {
        return selectStmt;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const db = { prepare: mockPrepare } as unknown as D1Database;

    const result = await verifyReferral({
      db,
      kv: undefined,
      featureEnabled: true,
      referredUserId: 'user-2',
      rewardTenths: 120,
    });

    expect(result.type).toBe('already_verified');
    expect(result.eventId).toBe('evt_2');
  });

  it('verifies referral and applies credits when rewardTenths > 0', async () => {
    const event = {
      id: 'evt_3',
      ownerUserId: 'owner-3',
      status: 'pending',
      creditsAwarded: 0,
      metadata: null,
    };
    const selectStmt = createMockPreparedStatement();
    selectStmt.first.mockResolvedValue(event);
    const updateStmt = createMockPreparedStatement();
    updateStmt.run.mockResolvedValue({ success: true });

    const mockPrepare = vi.fn((sql: string) => {
      if (sql.includes('SELECT id, owner_user_id')) {
        return selectStmt;
      }
      if (sql.includes("SET status = 'verified'")) {
        return updateStmt;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const db = { prepare: mockPrepare } as unknown as D1Database;
    const { kv, store } = createMockKV();

    const result = await verifyReferral({
      db,
      kv,
      featureEnabled: true,
      referredUserId: 'user-3',
      rewardTenths: 150,
      subscriptionId: 'sub_123',
      now: 1_700_000_000_000,
    });

    expect(result.type).toBe('verified');
    expect(result.eventId).toBe('evt_3');
    expect(updateStmt.bind).toHaveBeenCalledTimes(1);
    const bindArgs = updateStmt.bind.mock.calls[0];
    expect(bindArgs[0]).toBe(15); // creditsAwarded
    expect(typeof bindArgs[1]).toBe('string');
    const metadata = JSON.parse(bindArgs[1] as string);
    expect(metadata.referralReward.subscriptionId).toBe('sub_123');
    expect(metadata.referralReward.creditsTenths).toBe(150);
    expect(store.size).toBeGreaterThan(0);
  });

  it('verifies referral without KV interaction when rewardTenths is 0', async () => {
    const event = {
      id: 'evt_4',
      ownerUserId: 'owner-4',
      status: 'pending',
      creditsAwarded: 0,
      metadata: null,
    };
    const selectStmt = createMockPreparedStatement();
    selectStmt.first.mockResolvedValue(event);
    const updateStmt = createMockPreparedStatement();
    updateStmt.run.mockResolvedValue({ success: true });

    const mockPrepare = vi.fn((sql: string) => {
      if (sql.includes('SELECT id, owner_user_id')) {
        return selectStmt;
      }
      if (sql.includes("SET status = 'verified'")) {
        return updateStmt;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const db = { prepare: mockPrepare } as unknown as D1Database;
    const { kv } = createMockKV();

    const result = await verifyReferral({
      db,
      kv,
      featureEnabled: true,
      referredUserId: 'user-4',
      rewardTenths: 0,
      subscriptionId: 'sub_456',
      now: 1_700_000_100_000,
    });

    expect(result.type).toBe('verified');
    expect(updateStmt.bind).toHaveBeenCalled();
    expect((kv.put as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});

describe('referral-reward-service admin helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('markReferralPaid updates status to paid', async () => {
    const selectStmt = createMockPreparedStatement();
    selectStmt.first.mockResolvedValue({
      id: 'evt_5',
      ownerUserId: 'owner-5',
      status: 'verified',
      metadata: null,
    });
    const updateStmt = createMockPreparedStatement();
    updateStmt.run.mockResolvedValue({ success: true });

    const mockPrepare = vi.fn((sql: string) => {
      if (sql.includes('SELECT id, owner_user_id')) {
        return selectStmt;
      }
      if (sql.includes("SET status = 'paid'")) {
        return updateStmt;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const db = { prepare: mockPrepare } as unknown as D1Database;

    const result = await markReferralPaid({
      db,
      referralEventId: 'evt_5',
      adminUserId: 'admin-1',
      reason: 'manual payout',
      now: 1_700_000_200_000,
    });

    expect(result.type).toBe('updated');
    expect(updateStmt.bind).toHaveBeenCalled();
    const metadata = JSON.parse(updateStmt.bind.mock.calls[0][0] as string);
    expect(metadata.payout.paidBy).toBe('admin-1');
    expect(metadata.payout.reason).toBe('manual payout');
  });

  it('cancelReferral updates status to cancelled', async () => {
    const selectStmt = createMockPreparedStatement();
    selectStmt.first.mockResolvedValue({
      id: 'evt_6',
      ownerUserId: 'owner-6',
      status: 'pending',
      metadata: null,
    });
    const updateStmt = createMockPreparedStatement();
    updateStmt.run.mockResolvedValue({ success: true });

    const mockPrepare = vi.fn((sql: string) => {
      if (sql.includes('SELECT id, owner_user_id')) {
        return selectStmt;
      }
      if (sql.includes("SET status = 'cancelled'")) {
        return updateStmt;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const db = { prepare: mockPrepare } as unknown as D1Database;

    const result = await cancelReferral({
      db,
      referralEventId: 'evt_6',
      adminUserId: 'admin-2',
      reason: 'fraud',
      now: 1_700_000_300_000,
    });

    expect(result.type).toBe('updated');
    const metadata = JSON.parse(updateStmt.bind.mock.calls[0][0] as string);
    expect(metadata.cancellation.cancelledBy).toBe('admin-2');
    expect(metadata.cancellation.reason).toBe('fraud');
  });
});
