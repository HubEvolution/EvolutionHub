"use strict";
/**
 * Authentifizierungsmodul für Evolution Hub
 *
 * Dieses Modul bietet eine vereinfachte Authentifizierungsimplementierung für die Evolution Hub Anwendung.
 * Es ist die offizielle und aktive Authentifizierungslösung und ersetzt die veraltete Lucia-basierte Implementierung.
 *
 * @module auth-v2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.validateSession = validateSession;
exports.invalidateSession = invalidateSession;
/**
 * Konfiguration für die Session-Gültigkeit in Sekunden
 * Standard: 30 Tage
 */
const sessionExpiresInSeconds = 60 * 60 * 24 * 30; // 30 days
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
async function createSession(db, userId) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + sessionExpiresInSeconds * 1000);
    const session = {
        id: sessionId,
        userId,
        expiresAt,
    };
    await db
        .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
        .bind(sessionId, userId, Math.floor(session.expiresAt.getTime() / 1000))
        .run();
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
async function validateSession(db, sessionId) {
    // One roundtrip: fetch session + safe user fields via JOIN
    const row = await db
        .prepare(`SELECT 
         s.id              AS s_id,
         s.user_id         AS s_user_id,
         s.expires_at      AS s_expires_at,
         u.id              AS u_id,
         u.email           AS u_email,
         u.name            AS u_name,
         u.username        AS u_username,
         u.image           AS u_image,
         u.email_verified  AS u_email_verified,
         u.email_verified_at AS u_email_verified_at,
         u.plan            AS u_plan
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`)
        .bind(sessionId)
        .first();
    if (!row) {
        return { session: null, user: null };
    }
    const session = {
        id: row.s_id,
        userId: row.s_user_id,
        expiresAt: new Date(Number(row.s_expires_at) * 1000),
    };
    // Expired? Clean up and return null (preserves previous behavior)
    if (session.expiresAt.getTime() < Date.now()) {
        await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
        return { session: null, user: null };
    }
    const user = {
        id: row.u_id,
        email: row.u_email,
        name: row.u_name,
        username: row.u_username,
        image: row.u_image ?? undefined,
        email_verified: Boolean(row.u_email_verified),
        plan: row.u_plan ?? 'free',
    };
    return { session, user };
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
async function invalidateSession(db, sessionId) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}
