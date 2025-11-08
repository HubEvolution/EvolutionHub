import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { referralEvents, referralProfiles } from '@/lib/db/schema';
import { sanitizeReferralCode } from '@/lib/referrals/utils';

export type ReferralEventStatus = 'pending' | 'verified' | 'paid' | 'cancelled';

interface RecordReferralSignupOptions {
  referralCode: string;
  referredUserId: string;
  occurredAt?: number;
  status?: ReferralEventStatus;
  creditsAwarded?: number;
  metadata?: Record<string, unknown>;
}

export async function recordReferralSignup(
  db: D1Database,
  options: RecordReferralSignupOptions
): Promise<{ recorded: boolean; reason?: string }> {
  const {
    referralCode,
    referredUserId,
    occurredAt,
    status = 'verified',
    creditsAwarded = 0,
    metadata,
  } = options;
  const client = drizzle(db);

  const safeCode = sanitizeReferralCode(referralCode);
  if (!safeCode) {
    return { recorded: false, reason: 'invalid_code' };
  }

  const profile = await client
    .select({ userId: referralProfiles.userId, code: referralProfiles.referralCode })
    .from(referralProfiles)
    .where(eq(referralProfiles.referralCode, safeCode))
    .limit(1);

  const ownerUserId = profile[0]?.userId;
  if (!ownerUserId) {
    return { recorded: false, reason: 'invalid_code' };
  }

  if (ownerUserId === referredUserId) {
    return { recorded: false, reason: 'self_referral' };
  }

  const existing = await client
    .select({ id: referralEvents.id })
    .from(referralEvents)
    .where(
      and(
        eq(referralEvents.ownerUserId, ownerUserId),
        eq(referralEvents.referredUserId, referredUserId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { recorded: false, reason: 'duplicate' };
  }

  const timestamp = occurredAt ?? Date.now();
  const metadataPayload = metadata ?? { source: 'signup_magic_link' };

  await client.insert(referralEvents).values({
    id: crypto.randomUUID(),
    ownerUserId,
    referralCode: safeCode,
    referredUserId,
    status,
    creditsAwarded,
    metadata: JSON.stringify(metadataPayload),
    occurredAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return { recorded: true };
}
