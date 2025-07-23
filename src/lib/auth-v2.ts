import { TimeSpan, createDate } from 'oslo';
import { Argon2id } from 'oslo/password';
import { encodeHex } from 'oslo/encoding';
import { generateId } from 'oslo/crypto';
import type { D1Database } from '@cloudflare/workers-types';

// NOTE: This is a simplified implementation based on the Lucia v3 migration guide.
// It does not include all the security features of a full-fledged auth library.

const sessionExpiresInSeconds = 60 * 60 * 24 * 30; // 30 days

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

export async function createSession(db: D1Database, userId: string): Promise<Session> {
	const sessionId = generateId(40);
	const session = {
		id: sessionId,
		userId,
		expiresAt: createDate(new TimeSpan(sessionExpiresInSeconds, 's'))
	};
	await db.prepare(
		"INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
	).bind(sessionId, userId, Math.floor(session.expiresAt.getTime() / 1000)).run();
	return session;
}

export async function validateSession(db: D1Database, sessionId: string): Promise<{ session: Session | null, user: any | null }> {
    const sessionResult = await db.prepare("SELECT * FROM sessions WHERE id = ?").bind(sessionId).first();
    if (!sessionResult) {
        return { session: null, user: null };
    }

    const session: Session = {
        id: sessionResult.id,
        userId: sessionResult.user_id,
        expiresAt: new Date(Number(sessionResult.expires_at) * 1000)
    };

    if (session.expiresAt.getTime() < Date.now()) {
        await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
        return { session: null, user: null };
    }

    const userResult = await db.prepare("SELECT * FROM users WHERE id = ?").bind(session.userId).first();
    
    return { session, user: userResult };
}

export async function invalidateSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}