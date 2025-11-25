import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { addCreditPackTenths, getCreditsBalanceTenths } from '@/lib/kv/usage';

export type VerifyReferralOutcomeType =
  | 'disabled'
  | 'no_referral'
  | 'already_verified'
  | 'already_paid'
  | 'verified'
  | 'skipped';

export interface VerifyReferralOutcome {
  type: VerifyReferralOutcomeType;
  eventId?: string;
  ownerUserId?: string;
  creditsTenthsApplied?: number;
  creditsBalanceTenths?: number;
  reason?: string;
}

export interface VerifyReferralOptions {
  db: D1Database;
  kv?: KVNamespace | null;
  featureEnabled: boolean;
  referredUserId: string;
  rewardTenths: number;
  subscriptionId?: string;
  now?: number;
}

export async function verifyReferral({
  db,
  kv,
  featureEnabled,
  referredUserId,
  rewardTenths,
  subscriptionId,
  now = Date.now(),
}: VerifyReferralOptions): Promise<VerifyReferralOutcome> {
  if (!featureEnabled) {
    return { type: 'disabled' };
  }

  const event = await db
    .prepare(
      `SELECT id, owner_user_id AS ownerUserId, status, credits_awarded AS creditsAwarded, metadata
       FROM referral_events
       WHERE referred_user_id = ?1
       ORDER BY occurred_at DESC
       LIMIT 1`
    )
    .bind(referredUserId)
    .first<{
      id: string;
      ownerUserId: string;
      status: 'pending' | 'verified' | 'paid' | 'cancelled';
      creditsAwarded: number | null;
      metadata: string | null;
    }>();

  if (!event) {
    return { type: 'no_referral', reason: 'missing_event' };
  }

  if (event.status === 'paid') {
    return { type: 'already_paid', eventId: event.id, ownerUserId: event.ownerUserId };
  }

  if (event.status === 'verified' && (event.creditsAwarded ?? 0) > 0) {
    return { type: 'already_verified', eventId: event.id, ownerUserId: event.ownerUserId };
  }

  // rewardTenths may be zero (no credit payout) – still mark verified
  const safeRewardTenths = Math.max(0, Math.round(rewardTenths));
  let creditsBalanceTenths: number | undefined;

  if (kv && safeRewardTenths > 0) {
    const packId = `referral_reward_${event.id}`;
    await addCreditPackTenths(kv, event.ownerUserId, packId, safeRewardTenths, now);
    creditsBalanceTenths = await getCreditsBalanceTenths(kv, event.ownerUserId, now);
  }

  let metadataRecord: Record<string, unknown> = {};
  if (event.metadata) {
    try {
      const parsed = JSON.parse(event.metadata) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        metadataRecord = { ...parsed };
      }
    } catch {
      metadataRecord = {};
    }
  }
  metadataRecord.referralReward = {
    ...(metadataRecord.referralReward as Record<string, unknown> | undefined),
    verifiedAt: now,
    subscriptionId,
    creditsTenths: safeRewardTenths,
  };

  const creditsAwarded = Math.floor(safeRewardTenths / 10);

  await db
    .prepare(
      `UPDATE referral_events
       SET status = 'verified',
           credits_awarded = ?1,
           metadata = ?2,
           updated_at = ?3
       WHERE id = ?4`
    )
    .bind(creditsAwarded, JSON.stringify(metadataRecord), now, event.id)
    .run();

  return {
    type: 'verified',
    eventId: event.id,
    ownerUserId: event.ownerUserId,
    creditsTenthsApplied: safeRewardTenths,
    creditsBalanceTenths,
  };
}

export interface MarkReferralPaidOptions {
  db: D1Database;
  referralEventId: string;
  adminUserId: string;
  reason?: string;
  now?: number;
}

export type MarkReferralPaidOutcomeType = 'not_found' | 'already_paid' | 'updated';

export interface MarkReferralPaidOutcome {
  type: MarkReferralPaidOutcomeType;
  eventId?: string;
  ownerUserId?: string;
}

export async function markReferralPaid({
  db,
  referralEventId,
  adminUserId,
  reason,
  now = Date.now(),
}: MarkReferralPaidOptions): Promise<MarkReferralPaidOutcome> {
  const event = await db
    .prepare(
      `SELECT id, owner_user_id AS ownerUserId, status, metadata
       FROM referral_events
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(referralEventId)
    .first<{
      id: string;
      ownerUserId: string;
      status: 'pending' | 'verified' | 'paid' | 'cancelled';
      metadata: string | null;
    }>();

  if (!event) {
    return { type: 'not_found' };
  }

  if (event.status === 'paid') {
    return { type: 'already_paid', eventId: event.id, ownerUserId: event.ownerUserId };
  }

  let metadataRecord: Record<string, unknown> = {};
  if (event.metadata) {
    try {
      const parsed = JSON.parse(event.metadata) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        metadataRecord = { ...parsed };
      }
    } catch {
      metadataRecord = {};
    }
  }

  metadataRecord.payout = {
    ...(metadataRecord.payout as Record<string, unknown> | undefined),
    paidAt: now,
    paidBy: adminUserId,
    reason,
  };

  await db
    .prepare(
      `UPDATE referral_events
       SET status = 'paid',
           metadata = ?1,
           updated_at = ?2
       WHERE id = ?3`
    )
    .bind(JSON.stringify(metadataRecord), now, event.id)
    .run();

  return { type: 'updated', eventId: event.id, ownerUserId: event.ownerUserId };
}

export interface CancelReferralOptions {
  db: D1Database;
  referralEventId: string;
  adminUserId: string;
  reason?: string;
  now?: number;
}

export type CancelReferralOutcomeType = 'not_found' | 'already_cancelled' | 'updated';

export interface CancelReferralOutcome {
  type: CancelReferralOutcomeType;
  eventId?: string;
  ownerUserId?: string;
}

export async function cancelReferral({
  db,
  referralEventId,
  adminUserId,
  reason,
  now = Date.now(),
}: CancelReferralOptions): Promise<CancelReferralOutcome> {
  const event = await db
    .prepare(
      `SELECT id, owner_user_id AS ownerUserId, status, metadata
       FROM referral_events
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(referralEventId)
    .first<{
      id: string;
      ownerUserId: string;
      status: 'pending' | 'verified' | 'paid' | 'cancelled';
      metadata: string | null;
    }>();

  if (!event) {
    return { type: 'not_found' };
  }

  if (event.status === 'cancelled') {
    return { type: 'already_cancelled', eventId: event.id, ownerUserId: event.ownerUserId };
  }

  let metadataRecord: Record<string, unknown> = {};
  if (event.metadata) {
    try {
      const parsed = JSON.parse(event.metadata) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        metadataRecord = { ...parsed };
      }
    } catch {
      metadataRecord = {};
    }
  }

  metadataRecord.cancellation = {
    ...(metadataRecord.cancellation as Record<string, unknown> | undefined),
    cancelledAt: now,
    cancelledBy: adminUserId,
    reason,
  };

  await db
    .prepare(
      `UPDATE referral_events
       SET status = 'cancelled',
           metadata = ?1,
           updated_at = ?2
       WHERE id = ?3`
    )
    .bind(JSON.stringify(metadataRecord), now, event.id)
    .run();

  return { type: 'updated', eventId: event.id, ownerUserId: event.ownerUserId };
}
