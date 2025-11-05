"use strict";
/**
 * Auth-Helper-Funktionen für Rollenbasierte Zugriffskontrolle
 * Nutzt die bestehende auth-v2 Implementierung
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireAdmin = requireAdmin;
exports.requireModerator = requireModerator;
exports.getAuthUser = getAuthUser;
const auth_v2_1 = require("./auth-v2");
/**
 * Extrahiert Session-ID aus Cookie-Header
 */
function extractSessionId(cookieHeader) {
    if (!cookieHeader)
        return null;
    // Prefer strict cookie used in production
    const hostMatch = cookieHeader.match(/(?:^|;\s*)__Host-session=([^;]+)/);
    if (hostMatch)
        return hostMatch[1];
    // Fallback to legacy lax cookie during migration window
    const legacyMatch = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
    return legacyMatch ? legacyMatch[1] : null;
}
/**
 * Authentifiziert einen Benutzer aus dem Request-Kontext
 * Wirft Error wenn nicht authentifiziert
 */
async function requireAuth(context) {
    // Extrahiere Session-ID aus Cookie
    const cookieHeader = context.req?.header?.('Cookie') || context.request?.headers.get('Cookie') || null;
    const sessionId = extractSessionId(cookieHeader);
    if (!sessionId) {
        throw new Error('Authentication required');
    }
    // Hole DB aus Kontext
    const db = context.env?.DB;
    if (!db) {
        throw new Error('Database not available');
    }
    // Validiere Session
    const { session, user } = await (0, auth_v2_1.validateSession)(db, sessionId);
    if (!user || !session) {
        throw new Error('Authentication required');
    }
    // Hole User-Role aus DB (auth-v2 lädt role nicht standardmäßig)
    const userWithRole = await db
        .prepare('SELECT id, email, name, username, image, role, email_verified, plan FROM users WHERE id = ?')
        .bind(user.id)
        .first();
    if (!userWithRole) {
        throw new Error('User not found');
    }
    return {
        id: userWithRole.id,
        email: userWithRole.email,
        name: userWithRole.name,
        username: userWithRole.username,
        image: userWithRole.image,
        role: userWithRole.role || 'user',
        email_verified: Boolean(userWithRole.email_verified),
        plan: userWithRole.plan || 'free',
    };
}
/**
 * Prüft ob Benutzer eine bestimmte Rolle hat
 * Wirft Error wenn Rolle nicht ausreicht
 */
async function requireRole(context, requiredRole) {
    const user = await requireAuth(context);
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
        throw new Error(`Insufficient permissions. Required: ${roles.join(' or ')}, current: ${user.role}`);
    }
    return user;
}
/**
 * Prüft ob Benutzer Admin ist
 */
async function requireAdmin(context) {
    return requireRole(context, 'admin');
}
/**
 * Prüft ob Benutzer Moderator oder Admin ist
 */
async function requireModerator(context) {
    return requireRole(context, ['moderator', 'admin']);
}
/**
 * Prüft ob Benutzer authentifiziert ist, ohne Error zu werfen
 * Gibt null zurück wenn nicht authentifiziert
 */
async function getAuthUser(context) {
    try {
        return await requireAuth(context);
    }
    catch {
        return null;
    }
}
