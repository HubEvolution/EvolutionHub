import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { createSecureJsonResponse } from '@/lib/response-helpers';

const seedUsers = [
  {
    id: 'ref-owner-1',
    name: 'Referral Owner 1',
    username: 'ref_owner_1',
    email: 'ref-owner-1@test-suite.local',
    createdAt: 1_700_000_000,
  },
  {
    id: 'ref-owner-2',
    name: 'Referral Owner 2',
    username: 'ref_owner_2',
    email: 'ref-owner-2@test-suite.local',
    createdAt: 1_700_000_100,
  },
  {
    id: 'ref-referred-1',
    name: 'Referred User 1',
    username: 'ref_referred_1',
    email: 'ref-referred-1@test-suite.local',
    createdAt: 1_700_000_200,
  },
  {
    id: 'ref-referred-2',
    name: 'Referred User 2',
    username: 'ref_referred_2',
    email: 'ref-referred-2@test-suite.local',
    createdAt: 1_700_000_300,
  },
];

const seedProfiles = [
  {
    userId: 'ref-owner-1',
    referralCode: 'OWNER1CODE',
    createdAt: 1_700_000_000,
  },
  {
    userId: 'ref-owner-2',
    referralCode: 'OWNER2CODE',
    createdAt: 1_700_000_100,
  },
];

const seedEvents = [
  {
    id: 'ref-event-verified-1',
    ownerUserId: 'ref-owner-1',
    referralCode: 'OWNER1CODE',
    referredUserId: 'ref-referred-1',
    status: 'verified',
    creditsAwarded: 50,
    occurredAt: 1_700_000_400,
    metadata: JSON.stringify({ referralReward: { verifiedAt: 1_700_000_400, creditsTenths: 50 } }),
  },
  {
    id: 'ref-event-pending-1',
    ownerUserId: 'ref-owner-1',
    referralCode: 'OWNER1CODE',
    referredUserId: 'ref-referred-2',
    status: 'pending',
    creditsAwarded: 0,
    occurredAt: 1_700_000_500,
    metadata: JSON.stringify({ source: 'manual_seed' }),
  },
  {
    id: 'ref-event-paid-1',
    ownerUserId: 'ref-owner-2',
    referralCode: 'OWNER2CODE',
    referredUserId: null,
    status: 'paid',
    creditsAwarded: 100,
    occurredAt: 1_700_000_600,
    metadata: JSON.stringify({ payout: { paidAt: 1_700_000_600, paidBy: 'seed-admin' } }),
  },
];

const ADMIN_USER = {
  id: process.env.TEST_ADMIN_USER_ID || 'e2e-admin-0001',
  name: 'Test Admin',
  username: 'admin',
  email: process.env.TEST_ADMIN_EMAIL || 'admin@test-suite.local',
};

const ADMIN_SESSION_ID = process.env.TEST_ADMIN_SESSION_ID || 'e2e-admin-session-0001';

async function ensureReferralSchema(db: D1Database) {
  await db
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS referral_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        referral_code TEXT NOT NULL UNIQUE,
        default_campaign TEXT DEFAULT 'default',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CHECK (length(referral_code) BETWEEN 6 AND 64)
      )`
    )
    .run();

  await db
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS referral_events (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referral_code TEXT NOT NULL,
        referred_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'paid', 'cancelled')),
        credits_awarded INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        occurred_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (referral_code) REFERENCES referral_profiles(referral_code) ON DELETE CASCADE
      )`
    )
    .run();
}

async function ensureAdminUser(db: D1Database) {
  const now = new Date().toISOString();

  await db
    .prepare(
      `
      INSERT INTO users (id, name, username, full_name, email, created_at)
      VALUES (?1, ?2, ?3, ?2, ?4, ?5)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        username = excluded.username,
        full_name = excluded.full_name,
        email = excluded.email`
    )
    .bind(ADMIN_USER.id, ADMIN_USER.name, ADMIN_USER.username, ADMIN_USER.email, now)
    .run();
}

async function ensureAdminSession(db: D1Database) {
  await db
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    )
    .run();

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      `
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?1, ?2, ?3)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        expires_at = excluded.expires_at`
    )
    .bind(ADMIN_SESSION_ID, ADMIN_USER.id, expiresAt)
    .run();
}

async function ensureUsers(db: D1Database) {
  const insert = db.prepare(`
    INSERT INTO users (id, name, username, full_name, email, created_at)
    VALUES (?1, ?2, ?3, ?2, ?4, ?5)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      username = excluded.username,
      full_name = excluded.full_name,
      email = excluded.email,
      created_at = excluded.created_at`);

  for (const user of seedUsers) {
    await insert.bind(user.id, user.name, user.username, user.email, user.createdAt).run();
  }
}

async function ensureProfiles(db: D1Database) {
  const insert = db.prepare(`
    INSERT INTO referral_profiles (user_id, referral_code, default_campaign, created_at, updated_at)
    VALUES (?1, ?2, 'default', ?3, ?3)
    ON CONFLICT(user_id) DO UPDATE SET
      referral_code = excluded.referral_code,
      updated_at = excluded.updated_at`);

  for (const profile of seedProfiles) {
    await insert.bind(profile.userId, profile.referralCode, profile.createdAt).run();
  }
}

async function ensureEvents(db: D1Database) {
  const insert = db.prepare(`
    INSERT INTO referral_events (
      id,
      owner_user_id,
      referral_code,
      referred_user_id,
      status,
      credits_awarded,
      metadata,
      occurred_at,
      created_at,
      updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?8)
    ON CONFLICT(id) DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      referral_code = excluded.referral_code,
      referred_user_id = excluded.referred_user_id,
      status = excluded.status,
      credits_awarded = excluded.credits_awarded,
      metadata = excluded.metadata,
      occurred_at = excluded.occurred_at,
      updated_at = excluded.updated_at`);

  for (const event of seedEvents) {
    await insert
      .bind(
        event.id,
        event.ownerUserId,
        event.referralCode,
        event.referredUserId,
        event.status,
        event.creditsAwarded,
        event.metadata,
        event.occurredAt
      )
      .run();
  }
}

function isAllowed(context: APIContext): boolean {
  const hasHeader = context.request.headers.get('x-test-seed') === '1';
  const host = context.request.headers.get('host') || '';
  const isLocalhost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const isNodeTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } }).env || {}
      : {};
  const isDev = metaEnv.DEV === true || metaEnv.MODE === 'test';
  const environment = context.locals.runtime?.env?.ENVIRONMENT;
  const isTestingEnv = environment === 'testing';
  const isCiHost = host === 'ci.hub-evolution.com';

  return hasHeader && (isNodeTest || isDev || isLocalhost || isTestingEnv || isCiHost);
}

async function handler(context: APIContext) {
  if (!isAllowed(context)) {
    return createSecureJsonResponse({ error: 'Forbidden' }, 403);
  }

  const runtime = context.locals.runtime;
  if (!runtime?.env) {
    return createSecureJsonResponse({ error: 'No runtime' }, 500);
  }

  const db = runtime.env.DB as D1Database | undefined;
  if (!db) {
    return createSecureJsonResponse({ error: 'No DB binding' }, 500);
  }

  await ensureReferralSchema(db);
  await ensureAdminUser(db);
  await ensureAdminSession(db);
  await ensureUsers(db);
  await ensureProfiles(db);
  await ensureEvents(db);

  return createSecureJsonResponse(
    {
      success: true,
      seeded: {
        users: seedUsers.length,
        profiles: seedProfiles.length,
        events: seedEvents.length,
      },
    },
    200
  );
}

export const POST = handler;
export const GET = handler;
