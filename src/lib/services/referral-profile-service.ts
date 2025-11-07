import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { referralProfiles, referralEvents } from '@/lib/db/schema';

export type ReferralProfileRecord = typeof referralProfiles.$inferSelect;

const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 64;

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function randomSuffix(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return uuid.slice(0, 8);
}

function buildCandidateCode(base: string, attempt: number): string {
  let code = base;

  if (attempt > 0) {
    const suffix = randomSuffix();
    code = `${base}${suffix}`;
  }

  if (code.length < MIN_CODE_LENGTH) {
    code = (code + randomSuffix()).slice(0, MIN_CODE_LENGTH);
  }

  if (code.length > MAX_CODE_LENGTH) {
    code = code.slice(0, MAX_CODE_LENGTH);
  }

  return code;
}

function defaultReferralCode(userId: string): string {
  const sanitized = sanitizeUserId(userId);
  if (sanitized.length >= MIN_CODE_LENGTH) {
    return sanitized.slice(0, Math.min(16, sanitized.length));
  }
  const fallback = userId.replace(/-/g, '');
  return (fallback + randomSuffix()).slice(0, 16);
}

export async function getReferralProfile(db: D1Database, userId: string) {
  const client = drizzle(db);
  const existing = await client
    .select()
    .from(referralProfiles)
    .where(eq(referralProfiles.userId, userId))
    .limit(1);

  return existing[0] ?? null;
}

export async function getOrCreateReferralProfile(
  db: D1Database,
  userId: string,
  now: number = Date.now()
): Promise<ReferralProfileRecord> {
  const client = drizzle(db);
  const existing = await getReferralProfile(db, userId);
  if (existing) {
    return existing;
  }

  const baseCode = defaultReferralCode(userId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = buildCandidateCode(baseCode, attempt);
    try {
      await client.insert(referralProfiles).values({
        userId,
        referralCode: candidate,
        defaultCampaign: 'default',
        createdAt: now,
        updatedAt: now,
      });

      return {
        userId,
        referralCode: candidate,
        defaultCampaign: 'default',
        createdAt: now,
        updatedAt: now,
      } satisfies ReferralProfileRecord;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint failed: referral_profiles.user_id')) {
          const latest = await getReferralProfile(db, userId);
          if (latest) {
            return latest;
          }
        }

        if (error.message.includes('UNIQUE constraint failed: referral_profiles.referral_code')) {
          continue;
        }
      }

      throw error;
    }
  }

  const fallbackCode = `${baseCode}${randomSuffix()}`.slice(0, MAX_CODE_LENGTH);
  await client.insert(referralProfiles).values({
    userId,
    referralCode: fallbackCode,
    defaultCampaign: 'default',
    createdAt: now,
    updatedAt: now,
  });
  return {
    userId,
    referralCode: fallbackCode,
    defaultCampaign: 'default',
    createdAt: now,
    updatedAt: now,
  } satisfies ReferralProfileRecord;
}

export async function updateReferralCode(
  db: D1Database,
  userId: string,
  newCode: string,
  timestamp: number = Date.now()
) {
  const client = drizzle(db);
  await client
    .update(referralProfiles)
    .set({ referralCode: newCode, updatedAt: timestamp })
    .where(eq(referralProfiles.userId, userId));

  await client
    .update(referralEvents)
    .set({ referralCode: newCode })
    .where(eq(referralEvents.ownerUserId, userId));
}

export function buildReferralLink(referralCode: string, origin: string, path = '/signup') {
  let baseOrigin = origin;

  try {
    const originUrl = new URL(origin);
    baseOrigin = originUrl.origin;
  } catch (error) {
    baseOrigin = origin.startsWith('http') ? origin : `https://${origin}`;
  }

  const url = new URL(path, baseOrigin);
  url.searchParams.set('ref', referralCode);
  return url.toString();
}
