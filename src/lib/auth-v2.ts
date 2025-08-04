/**
 * Authentifizierungsmodul für Evolution Hub
 * 
 * Dieses Modul bietet eine vereinfachte Authentifizierungsimplementierung für die Evolution Hub Anwendung.
 * Es ist die offizielle und aktive Authentifizierungslösung und ersetzt die veraltete Lucia-basierte Implementierung.
 * 
 * @module auth-v2
 */

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Konfiguration für die Session-Gültigkeit in Sekunden
 * Standard: 30 Tage
 */
const sessionExpiresInSeconds = 60 * 60 * 24 * 30; // 30 days

/**
 * Repräsentiert eine Benutzersitzung
 */
export interface Session {
	/** Eindeutige ID der Sitzung */
	id: string;
	/** ID des Benutzers, dem diese Sitzung gehört */
	userId: string;
	/** Ablaufdatum der Sitzung */
	expiresAt: Date;
}

/**
 * Repräsentiert einen Benutzer im System
 */
export interface User {
	/** Eindeutige ID des Benutzers */
	id: string;
	/** E-Mail-Adresse des Benutzers (einzigartig) */
	email: string;
	/** Anzeigename des Benutzers */
	name: string;
	/** Benutzername (einzigartig) */
	username: string;
	/** Optionale URL zum Profilbild */
	image?: string;
	/** Gehashtes Passwort des Benutzers */
	password_hash: string;
}

/**
 * Repräsentiert eine Sitzung in der Datenbank
 * Diese Schnittstelle wird für die Datenbankabfragen verwendet
 */
export interface SessionRow {
	/** Eindeutige ID der Sitzung */
	id: string;
	/** ID des Benutzers, dem diese Sitzung gehört */
	user_id: string;
	/** Unix-Zeitstempel für den Ablauf der Sitzung */
	expires_at: number;
}

/**
 * Erstellt eine neue Benutzersitzung
 * 
 * @param db - D1-Datenbankinstanz
 * @param userId - ID des Benutzers, für den die Sitzung erstellt werden soll
 * @returns Ein Promise, das die erstellte Sitzung enthält
 * 
 * @example
 * // Sitzung erstellen und Cookie setzen
 * const session = await createSession(db, user.id);
 * context.cookies.set('session_id', session.id, {
 *   path: '/',
 *   httpOnly: true,
 *   secure: true,
 *   sameSite: 'lax',
 *   maxAge: 60 * 60 * 24 * 30 // 30 Tage
 * });
 */
export async function createSession(db: D1Database, userId: string): Promise<Session> {
	const sessionId = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + sessionExpiresInSeconds * 1000);
	const session = {
		id: sessionId,
		userId,
		expiresAt
	};
	await db.prepare(
		"INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
	).bind(sessionId, userId, Math.floor(session.expiresAt.getTime() / 1000)).run();
	return session;
}

/**
 * Validiert eine Benutzersitzung anhand ihrer ID
 * 
 * Diese Funktion überprüft, ob eine Sitzung gültig ist und nicht abgelaufen ist.
 * Wenn die Sitzung gültig ist, werden die Sitzungsdaten und der zugehörige Benutzer zurückgegeben.
 * Wenn die Sitzung abgelaufen ist, wird sie aus der Datenbank gelöscht.
 * 
 * @param db - D1-Datenbankinstanz
 * @param sessionId - ID der zu validierenden Sitzung
 * @returns Ein Promise mit der Sitzung und dem Benutzer (oder null, wenn ungültig)
 * 
 * @example
 * // In der Middleware
 * const sessionId = context.cookies.get('session_id')?.value;
 * if (sessionId) {
 *   const { session, user } = await validateSession(db, sessionId);
 *   context.locals.session = session;
 *   context.locals.user = user;
 * }
 */
export async function validateSession(db: D1Database, sessionId: string): Promise<{ session: Session | null, user: App.Locals['user'] }> {
    const sessionResult = await db.prepare("SELECT * FROM sessions WHERE id = ?").bind(sessionId).first<SessionRow>();
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

    const userResult = await db.prepare("SELECT id, email, name, username, image FROM users WHERE id = ?").bind(session.userId).first<User>();

    if (!userResult) {
        return { session: null, user: null };
    }
    
    return { session, user: userResult };
}

/**
 * Invalidiert (löscht) eine Benutzersitzung
 * 
 * Diese Funktion wird typischerweise beim Logout verwendet, um eine Sitzung zu beenden.
 * 
 * @param db - D1-Datenbankinstanz
 * @param sessionId - ID der zu löschenden Sitzung
 * 
 * @example
 * // Beim Logout
 * const sessionId = context.cookies.get('session_id')?.value;
 * if (sessionId) {
 *   await invalidateSession(db, sessionId);
 *   context.cookies.delete('session_id');
 * }
 */
export async function invalidateSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}
