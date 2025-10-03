import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { createSecureJsonResponse } from '@/lib/response-helpers';
import { hash as bcryptHash } from 'bcrypt-ts';

interface SeedUser {
  id: string;
  name: string;
  username: string;
  full_name: string;
  email: string;
  password: string;
}

async function ensureUserSchema(db: D1Database) {
  // Best-effort creation of core tables (idempotent)
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          full_name TEXT,
          email TEXT NOT NULL UNIQUE,
          image TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          password_hash TEXT,
          email_verified INTEGER NOT NULL DEFAULT 0,
          email_verified_at INTEGER NULL
        )`
      )
      .run();
  } catch (e) {
    // Table may already exist or D1 PRAGMA not supported in env; ignore
    void e;
  }

  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
      )
      .run();
  } catch (e) {
    // Table may already exist; ignore
    void e;
  }

  // Ensure columns exist on remote DB (idempotent via PRAGMA checks)
  try {
    const info = await db.prepare("PRAGMA table_info('users')").all<{ name: string }>();
    const cols = new Set((info?.results || []).map((r) => r.name));

    if (!cols.has('password_hash')) {
      await db.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT').run();
    }
    if (!cols.has('email_verified')) {
      await db
        .prepare('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0')
        .run();
    }
    if (!cols.has('email_verified_at')) {
      await db.prepare('ALTER TABLE users ADD COLUMN email_verified_at INTEGER NULL').run();
    }
  } catch (e) {
    // Best-effort; if ALTER fails because columns exist or PRAGMA unsupported, continue.
    void e;
  }
}

async function seedSuiteV2Users(db: D1Database) {
  const nowIso = new Date().toISOString();
  const nowUnix = Math.floor(Date.now() / 1000);

  const users: SeedUser[] = [
    {
      id: 'e2e-admin-0001',
      name: 'Test Admin',
      username: 'admin',
      full_name: 'Test Admin',
      email: 'admin@test-suite.local',
      password: 'AdminPass123!',
    },
    {
      id: 'e2e-user-0001',
      name: 'Test User',
      username: 'user',
      full_name: 'Test User',
      email: 'user@test-suite.local',
      password: 'UserPass123!',
    },
    {
      id: 'e2e-premium-0001',
      name: 'Test Premium',
      username: 'premium',
      full_name: 'Test Premium',
      email: 'premium@test-suite.local',
      password: 'PremiumPass123!',
    },
  ];

  const results: { email: string; id: string }[] = [];

  for (const u of users) {
    const passwordHash = await bcryptHash(u.password, 12);

    const stmt = db.prepare(
      `INSERT INTO users (
        id, name, username, full_name, email, image, created_at,
        password_hash, email_verified, email_verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(email) DO UPDATE SET
        name=excluded.name,
        username=excluded.username,
        full_name=excluded.full_name,
        image=excluded.image,
        created_at=excluded.created_at,
        password_hash=excluded.password_hash,
        email_verified=excluded.email_verified,
        email_verified_at=excluded.email_verified_at`
    );

    await stmt
      .bind(u.id, u.name, u.username, u.full_name, u.email, null, nowIso, passwordHash, nowUnix)
      .run();

    results.push({ email: u.email, id: u.id });
  }

  return results;
}

function isAllowed(context: APIContext): boolean {
  const hasHeader = context.request.headers.get('x-test-seed') === '1';
  const host = context.request.headers.get('host') || '';
  const isLocalhost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const isNodeTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const isDev =
    typeof import.meta !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'test');
  const environment = context.locals.runtime?.env?.ENVIRONMENT;
  const isTestingEnv = environment === 'testing';
  const isCiHost = host === 'ci.hub-evolution.com';

  return hasHeader && (isNodeTest || isDev || isLocalhost || isTestingEnv || isCiHost);
}

async function handler(context: APIContext) {
  if (!isAllowed(context)) {
    return createSecureJsonResponse({ error: 'Forbidden' }, 403);
  }

  try {
    const runtime = context.locals.runtime;
    if (!runtime?.env) {
      return createSecureJsonResponse({ error: 'No runtime' }, 500);
    }

    const db = runtime.env.DB as D1Database | undefined;
    if (!db) {
      return createSecureJsonResponse({ error: 'No DB binding' }, 500);
    }

    await ensureUserSchema(db);

    const seeded = await seedSuiteV2Users(db);

    return createSecureJsonResponse({ success: true, seeded }, 200);
  } catch (e) {
    return createSecureJsonResponse({ error: 'Seed failed', detail: String(e) }, 500);
  }
}

export const POST = handler;
export const GET = handler;
