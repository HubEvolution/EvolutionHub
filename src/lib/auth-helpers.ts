/**
 * Auth-Helper-Funktionen für Rollenbasierte Zugriffskontrolle
 * Nutzt die bestehende auth-v2 Implementierung
 */

import { validateSession } from './auth-v2';
import type { D1Database } from '@cloudflare/workers-types';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  username: string;
  image?: string;
  role: UserRole;
  email_verified: boolean;
  plan: string;
}

/**
 * Extrahiert Session-ID aus Cookie-Header
 */
function extractSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  // Prefer strict cookie used in production
  const hostMatch = cookieHeader.match(/(?:^|;\s*)__Host-session=([^;]+)/);
  if (hostMatch) return hostMatch[1];
  // Fallback to legacy lax cookie during migration window
  const legacyMatch = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
  return legacyMatch ? legacyMatch[1] : null;
}

/**
 * Authentifiziert einen Benutzer aus dem Request-Kontext
 * Wirft Error wenn nicht authentifiziert
 */
export async function requireAuth(context: {
  req?: { header?: (name: string) => string | undefined };
  request?: Request;
  env?: { DB?: D1Database };
}): Promise<AuthenticatedUser> {
  // Extrahiere Session-ID aus Cookie
  const cookieHeader =
    context.req?.header?.('Cookie') || context.request?.headers.get('Cookie') || null;

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
  const { session, user } = await validateSession(db, sessionId);

  if (!user || !session) {
    throw new Error('Authentication required');
  }

  // Hole User-Role aus DB (auth-v2 lädt role nicht standardmäßig)
  const userWithRole = await db
    .prepare(
      'SELECT id, email, name, username, image, role, email_verified, plan FROM users WHERE id = ?'
    )
    .bind(user.id)
    .first<{
      id: string;
      email: string;
      name: string;
      username: string;
      image?: string;
      role: string;
      email_verified: number | boolean;
      plan?: string;
    }>();

  if (!userWithRole) {
    throw new Error('User not found');
  }

  return {
    id: userWithRole.id,
    email: userWithRole.email,
    name: userWithRole.name,
    username: userWithRole.username,
    image: userWithRole.image,
    role: (userWithRole.role as UserRole) || 'user',
    email_verified: Boolean(userWithRole.email_verified),
    plan: userWithRole.plan || 'free',
  };
}

/**
 * Prüft ob Benutzer eine bestimmte Rolle hat
 * Wirft Error wenn Rolle nicht ausreicht
 */
export async function requireRole(
  context: {
    req?: { header?: (name: string) => string | undefined };
    request?: Request;
    env?: { DB?: D1Database };
  },
  requiredRole: UserRole | UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(context);

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!roles.includes(user.role)) {
    throw new Error(
      `Insufficient permissions. Required: ${roles.join(' or ')}, current: ${user.role}`
    );
  }

  return user;
}

/**
 * Prüft ob Benutzer Admin ist
 */
export async function requireAdmin(context: {
  req?: { header?: (name: string) => string | undefined };
  request?: Request;
  env?: { DB?: D1Database };
}): Promise<AuthenticatedUser> {
  return requireRole(context, 'admin');
}

/**
 * Prüft ob Benutzer Moderator oder Admin ist
 */
export async function requireModerator(context: {
  req?: { header?: (name: string) => string | undefined };
  request?: Request;
  env?: { DB?: D1Database };
}): Promise<AuthenticatedUser> {
  return requireRole(context, ['moderator', 'admin']);
}

/**
 * Prüft ob Benutzer authentifiziert ist, ohne Error zu werfen
 * Gibt null zurück wenn nicht authentifiziert
 */
export async function getAuthUser(context: {
  req?: { header?: (name: string) => string | undefined };
  request?: Request;
  env?: { DB?: D1Database };
}): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth(context);
  } catch {
    return null;
  }
}
