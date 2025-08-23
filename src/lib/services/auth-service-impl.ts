/**
 * AuthService Implementierung
 * 
 * Diese Klasse implementiert das AuthService-Interface und kapselt 
 * die Authentifizierungslogik für die Evolution Hub Anwendung.
 */

import { compare, hash } from 'bcrypt-ts';
import { AbstractBaseService } from './base-service';
import type { AuthService, AuthResult, RegisterData, RegistrationResult } from './auth-service';
import type { ServiceDependencies } from './types';
import { ServiceError, ServiceErrorType } from './types';
import { createSession, validateSession as validateSessionV2, invalidateSession } from '@/lib/auth-v2';
import type { User, Session } from '@/lib/auth-v2';
import type { SafeUser } from '@/lib/db/types';
import { logAuthSuccess, logAuthFailure, logPasswordReset } from '@/lib/security-logger';

/**
 * Konstante für die Standard-Kosten des bcrypt-Hashing
 * Höhere Werte = sicherer, aber langsamer
 */
const BCRYPT_COST = 12;

/**
 * Standard-Gültigkeitsdauer für ein Passwort-Reset-Token in Sekunden (24 Stunden)
 */
const PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24;

/**
 * Implementierung des AuthService
 */
export class AuthServiceImpl extends AbstractBaseService implements AuthService {
  /**
   * Erstellt eine neue Instanz des AuthService
   * 
   * @param deps Abhängigkeiten des Service
   */
  constructor(deps: ServiceDependencies) {
    super(deps);
  }

  /**
   * Authentifiziert einen Benutzer mit E-Mail und Passwort
   * 
   * @param email E-Mail-Adresse des Benutzers
   * @param password Passwort des Benutzers
   * @param ipAddress IP-Adresse für Logging-Zwecke
   * @returns Authentifizierungsergebnis bei Erfolg
   * @throws ServiceError wenn die Authentifizierung fehlschlägt
   */
  async login(email: string, password: string, ipAddress?: string): Promise<AuthResult> {
    return this.withTransaction(async (db) => {
      // Benutzer anhand der E-Mail-Adresse suchen
      const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?')
        .bind(email)
        .first<User>();

      if (!existingUser) {
        // Fehlgeschlagene Anmeldung protokollieren
        logAuthFailure(ipAddress, {
          reason: 'user_not_found',
          email
        });

        throw new ServiceError(
          'Ungültige Anmeldedaten', 
          ServiceErrorType.AUTHENTICATION,
          { reason: 'invalid_credentials' }
        );
      }

      if (!existingUser.password_hash) {
        // Fehlgeschlagene Anmeldung protokollieren
        logAuthFailure(ipAddress, {
          reason: 'missing_password_hash',
          userId: existingUser.id
        });

        throw new ServiceError(
          'Konto nicht vollständig eingerichtet',
          ServiceErrorType.AUTHENTICATION,
          { reason: 'account_setup_incomplete' }
        );
      }

      // Passwort überprüfen
      const validPassword = await compare(password, existingUser.password_hash);
      if (!validPassword) {
        // Fehlgeschlagene Anmeldung protokollieren
        logAuthFailure(ipAddress, {
          reason: 'invalid_password',
          userId: existingUser.id
        });

        throw new ServiceError(
          'Ungültige Anmeldedaten',
          ServiceErrorType.AUTHENTICATION,
          { reason: 'invalid_credentials' }
        );
      }

      // E-Mail-Verifikation prüfen (Double-Opt-in-Blockade)
      const emailVerified = Boolean((existingUser as any).email_verified);
      if (!emailVerified) {
        logAuthFailure(ipAddress, {
          reason: 'email_not_verified',
          userId: existingUser.id,
          email: existingUser.email
        });

        throw new ServiceError(
          'E-Mail-Adresse nicht verifiziert',
          ServiceErrorType.AUTHENTICATION,
          { reason: 'email_not_verified', email: existingUser.email }
        );
      }

      // Session erstellen
      const session = await createSession(db, existingUser.id);
      
      // Erfolgreiche Anmeldung protokollieren
      logAuthSuccess(existingUser.id, ipAddress, {
        action: 'login',
        sessionId: session.id
      });

      // SafeUser-Objekt ohne sensible Daten erstellen
      const safeUser: SafeUser = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        username: existingUser.username,
        image: existingUser.image,
        created_at: (existingUser as any).created_at as string
      };

      return {
        user: safeUser,
        session,
        sessionId: session.id
      };
    });
  }

  /**
   * Registriert einen neuen Benutzer
   * 
   * @param data Registrierungsdaten
   * @param ipAddress IP-Adresse für Logging-Zwecke
   * @returns Authentifizierungsergebnis bei Erfolg
   * @throws ServiceError wenn die Registrierung fehlschlägt
   */
  async register(data: RegisterData, ipAddress?: string): Promise<RegistrationResult> {
    return this.withTransaction(async (db) => {
      // Prüfen, ob die E-Mail-Adresse bereits verwendet wird
      const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?')
        .bind(data.email)
        .first<{ id: string }>();

      if (existingUser) {
        logAuthFailure(ipAddress, {
          reason: 'duplicate_user',
          email: data.email
        });

        throw new ServiceError(
          'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
          ServiceErrorType.CONFLICT,
          { reason: 'user_exists' }
        );
      }

      // Prüfen, ob der Benutzername bereits verwendet wird
      const existingUsername = await db.prepare('SELECT id FROM users WHERE username = ?')
        .bind(data.username)
        .first<{ id: string }>();

      if (existingUsername) {
        logAuthFailure(ipAddress, {
          reason: 'duplicate_username',
          username: data.username
        });

        throw new ServiceError(
          'Dieser Benutzername ist bereits vergeben',
          ServiceErrorType.CONFLICT,
          { reason: 'username_exists' }
        );
      }

      // Passwort hashen
      const passwordHash = await hash(data.password, BCRYPT_COST);
      
      // Benutzer erstellen
      const userId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      await db.prepare(
        'INSERT INTO users (id, email, name, username, password_hash, created_at, image) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        userId,
        data.email,
        data.name,
        data.username,
        passwordHash,
        createdAt,
        data.image || null
      ).run();

      // Erfolgreiche Registrierung protokollieren (ohne Session)
      logAuthSuccess(userId, ipAddress, {
        action: 'register'
      });

      // SafeUser-Objekt ohne sensible Daten erstellen
      const safeUser: SafeUser = {
        id: userId,
        email: data.email,
        name: data.name,
        username: data.username,
        image: data.image,
        created_at: createdAt
      };

      return {
        user: safeUser
      };
    });
  }

  /**
   * Beendet eine Benutzersitzung
   * 
   * @param sessionId ID der zu beendenden Sitzung
   */
  async logout(sessionId: string): Promise<void> {
    return this.withTransaction(async (db) => {
      await invalidateSession(db, sessionId);
    });
  }

  /**
   * Überprüft eine Benutzersitzung auf Gültigkeit
   * 
   * @param sessionId ID der zu überprüfenden Sitzung
   * @returns Sitzung und Benutzer oder null, falls ungültig
   */
  async validateSession(sessionId: string): Promise<{ session: Session | null, user: SafeUser | null }> {
    return this.withTransaction(async (db) => {
      const result = await validateSessionV2(db, sessionId);
      
      if (!result.session || !result.user) {
        return { session: null, user: null };
      }
      
      // created_at für SafeUser nachladen, da auth-v2.validateSession es nicht liefert
      const createdRow = await db
        .prepare('SELECT created_at FROM users WHERE id = ?')
        .bind(result.user.id)
        .first<{ created_at: string }>();

      return {
        session: result.session,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          username: result.user.username,
          image: result.user.image,
          created_at: createdRow?.created_at ?? new Date(0).toISOString()
        }
      };
    });
  }

  /**
   * Erstellt ein Token für das Zurücksetzen eines Passworts
   * 
   * @param email E-Mail-Adresse des Benutzers
   * @param ipAddress IP-Adresse für Logging-Zwecke
   * @returns true, wenn ein Token erstellt wurde (auch wenn der Benutzer nicht existiert)
   */
  async createPasswordResetToken(email: string, ipAddress?: string): Promise<boolean> {
    return this.withTransaction(async (db) => {
      // Benutzer anhand der E-Mail-Adresse suchen
      const user = await db.prepare('SELECT id FROM users WHERE email = ?')
        .bind(email)
        .first<{ id: string }>();

      // Wenn kein Benutzer gefunden wurde, trotzdem true zurückgeben
      // (um keine Information über die Existenz eines Kontos preiszugeben)
      if (!user) {
        return true;
      }

      // Vorhandene Tokens für diesen Benutzer löschen
      await db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')
        .bind(user.id)
        .run();

      // Neues Token generieren
      const token = crypto.randomUUID();
      const expiresAt = Math.floor(Date.now() / 1000) + PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS;

      // Token in der Datenbank speichern
      await db.prepare(
        'INSERT INTO password_reset_tokens (id, user_id, expires_at) VALUES (?, ?, ?)'
      ).bind(
        token,
        user.id,
        expiresAt
      ).run();

      // Passwort-Reset-Event protokollieren
      logPasswordReset(user.id, ipAddress, {
        action: 'create_token',
        tokenId: token.slice(0, 8)
      });

      return true;
    });
  }

  /**
   * Überprüft ein Passwort-Reset-Token
   * 
   * @param token Das zu überprüfende Token
   * @returns Die Benutzer-ID, falls das Token gültig ist, sonst null
   */
  async validatePasswordResetToken(token: string): Promise<string | null> {
    return this.withTransaction(async (db) => {
      const result = await db.prepare(`
        SELECT user_id, expires_at FROM password_reset_tokens 
        WHERE id = ?
      `).bind(token).first<{ user_id: string, expires_at: number }>();

      if (!result) {
        return null;
      }

      // Prüfen, ob das Token abgelaufen ist
      if (result.expires_at < Math.floor(Date.now() / 1000)) {
        // Abgelaufenes Token löschen
        await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?')
          .bind(token)
          .run();
        return null;
      }

      return result.user_id;
    });
  }

  /**
   * Setzt ein Passwort mit einem gültigen Token zurück
   * 
   * @param token Das Passwort-Reset-Token
   * @param newPassword Das neue Passwort
   * @param ipAddress IP-Adresse für Logging-Zwecke
   * @returns true, wenn erfolgreich
   * @throws ServiceError wenn das Passwort nicht zurückgesetzt werden konnte
   */
  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<boolean> {
    return this.withTransaction(async (db) => {
      // Token validieren
      const userId = await this.validatePasswordResetToken(token);
      if (!userId) {
        throw new ServiceError(
          'Ungültiges oder abgelaufenes Token',
          ServiceErrorType.AUTHENTICATION,
          { reason: 'invalid_token' }
        );
      }

      // Passwort hashen
      const passwordHash = await hash(newPassword, BCRYPT_COST);

      // Passwort aktualisieren
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(passwordHash, userId)
        .run();

      // Token nach erfolgreicher Verwendung löschen
      await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?')
        .bind(token)
        .run();

      // Erfolgreichen Passwort-Reset protokollieren
      logPasswordReset(userId, ipAddress, {
        action: 'reset_successful'
      });

      return true;
    });
  }

  /**
   * Ändert das Passwort eines eingeloggten Benutzers nach Verifizierung des aktuellen Passworts
   *
   * @param userId ID des Benutzers
   * @param currentPassword Aktuelles Passwort
   * @param newPassword Neues Passwort
   * @param ipAddress Optionale IP-Adresse für Security-Logging
   * @returns true, wenn erfolgreich
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string
  ): Promise<boolean> {
    return this.withTransaction(async (db) => {
      const user = await db.prepare('SELECT id, password_hash, email, username FROM users WHERE id = ?')
        .bind(userId)
        .first<User>();

      if (!user || !user.password_hash) {
        logAuthFailure(ipAddress, { reason: 'user_not_found_or_no_password_hash', userId });
        throw new ServiceError(
          'Benutzer nicht gefunden oder Passwort nicht gesetzt',
          ServiceErrorType.AUTHENTICATION,
          { reason: 'user_not_found' }
        );
      }

      // Gleiches Passwort verhindern (schneller Check ohne Hashing)
      if (currentPassword === newPassword) {
        throw new ServiceError(
          'Das neue Passwort darf nicht mit dem aktuellen übereinstimmen',
          ServiceErrorType.VALIDATION,
          { reason: 'same_password' }
        );
      }

      // Aktuelles Passwort verifizieren
      const valid = await compare(currentPassword, user.password_hash);
      if (!valid) {
        logAuthFailure(ipAddress, { reason: 'invalid_current_password', userId });
        throw new ServiceError(
          'Aktuelles Passwort ist falsch',
          ServiceErrorType.AUTHENTICATION,
          { reason: 'invalid_current_password' }
        );
      }

      // Neues Passwort hashen und aktualisieren
      const newHash = await hash(newPassword, BCRYPT_COST);
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(newHash, userId)
        .run();

      // Erfolgreiche Passwortänderung protokollieren
      logAuthSuccess(userId, ipAddress, { action: 'change_password' });

      return true;
    });
  }
}

/**
 * Factory-Funktion zur Erstellung einer AuthService-Instanz
 * 
 * @param deps Abhängigkeiten für den Service
 * @returns Eine neue AuthService-Instanz
 */
export function createAuthService(deps: ServiceDependencies): AuthService {
  return new AuthServiceImpl(deps);
}
