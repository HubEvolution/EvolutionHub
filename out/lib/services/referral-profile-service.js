'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getReferralProfile = getReferralProfile;
exports.getOrCreateReferralProfile = getOrCreateReferralProfile;
exports.updateReferralCode = updateReferralCode;
exports.buildReferralLink = buildReferralLink;
const d1_1 = require('drizzle-orm/d1');
const drizzle_orm_1 = require('drizzle-orm');
const schema_1 = require('@/lib/db/schema');
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 64;
function sanitizeUserId(userId) {
  return userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}
function randomSuffix() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return uuid.slice(0, 8);
}
function buildCandidateCode(base, attempt) {
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
function defaultReferralCode(userId) {
  const sanitized = sanitizeUserId(userId);
  if (sanitized.length >= MIN_CODE_LENGTH) {
    return sanitized.slice(0, Math.min(16, sanitized.length));
  }
  const fallback = userId.replace(/-/g, '');
  return (fallback + randomSuffix()).slice(0, 16);
}
async function getReferralProfile(db, userId) {
  const client = (0, d1_1.drizzle)(db);
  const existing = await client
    .select()
    .from(schema_1.referralProfiles)
    .where((0, drizzle_orm_1.eq)(schema_1.referralProfiles.userId, userId))
    .limit(1);
  return existing[0] ?? null;
}
async function getOrCreateReferralProfile(db, userId, now = Date.now()) {
  const client = (0, d1_1.drizzle)(db);
  const existing = await getReferralProfile(db, userId);
  if (existing) {
    return existing;
  }
  const baseCode = defaultReferralCode(userId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = buildCandidateCode(baseCode, attempt);
    try {
      await client.insert(schema_1.referralProfiles).values({
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
      };
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
  await client.insert(schema_1.referralProfiles).values({
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
  };
}
async function updateReferralCode(db, userId, newCode, timestamp = Date.now()) {
  const client = (0, d1_1.drizzle)(db);
  await client
    .update(schema_1.referralProfiles)
    .set({ referralCode: newCode, updatedAt: timestamp })
    .where((0, drizzle_orm_1.eq)(schema_1.referralProfiles.userId, userId));
  await client
    .update(schema_1.referralEvents)
    .set({ referralCode: newCode })
    .where((0, drizzle_orm_1.eq)(schema_1.referralEvents.ownerUserId, userId));
}
function buildReferralLink(referralCode, origin, path = '/register') {
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
