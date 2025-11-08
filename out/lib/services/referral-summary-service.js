"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReferralStats = getReferralStats;
exports.getRecentReferralEvents = getRecentReferralEvents;
exports.getReferralSummary = getReferralSummary;
const d1_1 = require("drizzle-orm/d1");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("@/lib/db/schema");
function normalizeCount(records) {
    const result = {
        total: 0,
        pending: 0,
        verified: 0,
        paid: 0,
        cancelled: 0,
    };
    for (const record of records) {
        const countValue = Number(record.count ?? 0);
        result.total += countValue;
        result[record.status] = countValue;
    }
    return result;
}
async function getReferralStats(db, userId) {
    const client = (0, d1_1.drizzle)(db);
    const counts = await client
        .select({
        status: schema_1.referralEvents.status,
        count: (0, drizzle_orm_1.count)().as('count'),
    })
        .from(schema_1.referralEvents)
        .where((0, drizzle_orm_1.eq)(schema_1.referralEvents.ownerUserId, userId))
        .groupBy(schema_1.referralEvents.status);
    const normalized = normalizeCount(counts);
    const creditsRow = await client
        .select({
        totalCredits: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.referralEvents.creditsAwarded}), 0)`,
    })
        .from(schema_1.referralEvents)
        .where((0, drizzle_orm_1.eq)(schema_1.referralEvents.ownerUserId, userId))
        .limit(1);
    const totalCredits = Number(creditsRow[0]?.totalCredits ?? 0);
    return {
        referredTotal: normalized.total,
        pending: normalized.pending,
        verified: normalized.verified,
        paid: normalized.paid,
        cancelled: normalized.cancelled,
        totalCredits,
    };
}
async function getRecentReferralEvents(db, userId, limit = 5) {
    const client = (0, d1_1.drizzle)(db);
    const rows = await client
        .select({
        id: schema_1.referralEvents.id,
        status: schema_1.referralEvents.status,
        occurredAt: schema_1.referralEvents.occurredAt,
        creditsAwarded: schema_1.referralEvents.creditsAwarded,
    })
        .from(schema_1.referralEvents)
        .where((0, drizzle_orm_1.eq)(schema_1.referralEvents.ownerUserId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.referralEvents.occurredAt), (0, drizzle_orm_1.desc)(schema_1.referralEvents.createdAt))
        .limit(limit);
    return rows.map((row) => ({
        id: row.id,
        status: row.status,
        occurredAt: row.occurredAt,
        creditsAwarded: row.creditsAwarded ?? 0,
    }));
}
async function getReferralSummary(db, userId, options = {}) {
    const [stats, recentEvents] = await Promise.all([
        getReferralStats(db, userId),
        getRecentReferralEvents(db, userId, options.recentLimit ?? 5),
    ]);
    return {
        stats,
        recentEvents,
    };
}
