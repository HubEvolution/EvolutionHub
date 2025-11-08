"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordReferralSignup = recordReferralSignup;
const d1_1 = require("drizzle-orm/d1");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("@/lib/db/schema");
const utils_1 = require("@/lib/referrals/utils");
async function recordReferralSignup(db, options) {
    const { referralCode, referredUserId, occurredAt, status = 'verified', creditsAwarded = 0 } = options;
    const client = (0, d1_1.drizzle)(db);
    const safeCode = (0, utils_1.sanitizeReferralCode)(referralCode);
    if (!safeCode) {
        return { recorded: false, reason: 'invalid_code' };
    }
    const profile = await client
        .select({ userId: schema_1.referralProfiles.userId, code: schema_1.referralProfiles.referralCode })
        .from(schema_1.referralProfiles)
        .where((0, drizzle_orm_1.eq)(schema_1.referralProfiles.referralCode, safeCode))
        .limit(1);
    const ownerUserId = profile[0]?.userId;
    if (!ownerUserId) {
        return { recorded: false, reason: 'invalid_code' };
    }
    if (ownerUserId === referredUserId) {
        return { recorded: false, reason: 'self_referral' };
    }
    const existing = await client
        .select({ id: schema_1.referralEvents.id })
        .from(schema_1.referralEvents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.referralEvents.ownerUserId, ownerUserId), (0, drizzle_orm_1.eq)(schema_1.referralEvents.referredUserId, referredUserId)))
        .limit(1);
    if (existing.length > 0) {
        return { recorded: false, reason: 'duplicate' };
    }
    const timestamp = occurredAt ?? Date.now();
    await client.insert(schema_1.referralEvents).values({
        id: crypto.randomUUID(),
        ownerUserId,
        referralCode: safeCode,
        referredUserId,
        status,
        creditsAwarded,
        metadata: JSON.stringify({ source: 'signup_magic_link' }),
        occurredAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
    });
    return { recorded: true };
}
