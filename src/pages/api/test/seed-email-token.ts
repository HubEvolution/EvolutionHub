import type { APIContext } from 'astro';
import { createSecureJsonResponse } from '@/lib/response-helpers';

interface User {
  id: string;
  email: string;
}

export const GET = async (context: APIContext) => {
  // Strictly limit to tests or local dev, guarded by a special header
  const hasHeader = context.request.headers.get('x-test-seed') === '1';
  const host = context.request.headers.get('host') || '';
  const isLocalhost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const isNodeTest =
    typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    ((import.meta as any).env.DEV || (import.meta as any).env.MODE === 'test');
  if (!(hasHeader && (isNodeTest || isDev || isLocalhost))) {
    return createSecureJsonResponse({ error: 'Forbidden' }, 403);
  }

  try {
    if (!context.locals.runtime) {
      return createSecureJsonResponse({ error: 'No runtime' }, 500);
    }

    const url = new URL(context.request.url);
    const email = url.searchParams.get('email');
    const state = url.searchParams.get('state') || 'expired'; // expired | valid | used

    if (!email) {
      return createSecureJsonResponse({ error: 'Missing email' }, 400);
    }

    const db = context.locals.runtime.env.DB;

    const user = await db
      .prepare('SELECT id, email FROM users WHERE email = ?')
      .bind(email)
      .first<User>();

    if (!user) {
      return createSecureJsonResponse({ error: 'User not found' }, 404);
    }

    const token = generateToken();

    const now = Math.floor(Date.now() / 1000);
    let createdAt = now - 7200; // default 2h ago
    let expiresAt = now + 86400; // default +24h
    let usedAt: number | null = null;

    if (state === 'expired') {
      createdAt = now - 172800; // 48h ago
      expiresAt = now - 3600; // expired 1h ago
    } else if (state === 'used') {
      usedAt = now - 60; // used 1 min ago
    }

    // Upsert: delete any existing tokens for user for cleanliness
    await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(user.id).run();

    await db
      .prepare(
        `INSERT INTO email_verification_tokens (token, user_id, email, created_at, expires_at, used_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(token, user.id, user.email, createdAt, expiresAt, usedAt)
      .run();

    return createSecureJsonResponse({ success: true, token }, 200);
  } catch (e) {
    return createSecureJsonResponse({ error: 'Seed failed', detail: String(e) }, 500);
  }
};

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token + Date.now().toString(36);
}
