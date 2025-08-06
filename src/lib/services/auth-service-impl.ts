/**
 * AuthService Implementierung
 * 
 * Diese Klasse implementiert das AuthService-Interface und kapselt 
 * die Authentifizierungslogik für die Evolution Hub Anwendung.
 */

import { compare, hash } from 'bcrypt-ts';
import { AbstractBaseService } from './base-service';
import type { AuthService, AuthResult, RegisterData } from './auth-service';
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
        image: existingUser.image
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
  async register(data: RegisterData, ipAddress?: string): Promise<AuthResult> {
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
      await db.prepare(
        'INSERT INTO users (id, email, name, username, password_hash, created_at, image) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        userId,
        data.email,
        data.name,
        data.username,
        passwordHash,
        Math.floor(Date.now() / 1000),
        data.image || null
      ).run();

      // Session erstellen
      const session = await createSession(db, userId);

      // Erfolgreiche Registrierung protokollieren
      logAuthSuccess(userId, ipAddress, {
        action: 'register',
        sessionId: session.id
      });

      // SafeUser-Objekt ohne sensible Daten erstellen
      const safeUser: SafeUser = {
        id: userId,
        email: data.email,
        name: data.name,
        username: data.username,
        image: data.image
      };

      return {
        user: safeUser,
        session,
        sessionId: session.id
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
      
      return {
        session: result.session,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          username: result.user.username,
          image: result.user.image
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
        'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
      ).bind(
        token,
        user.id,
        expiresAt
      ).run();

      // Passwort-Reset-Event protokollieren
      logPasswordReset(user.id, ipAddress, {
        action: 'create_token',
        token // ACHTUNG: In Produktion sollte das Token nicht geloggt werden!
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
        WHERE token = ?
      `).bind(token).first<{ user_id: string, expires_at: number }>();

      if (!result) {
        return null;
      }

      // Prüfen, ob das Token abgelaufen ist
      if (result.expires_at < Math.floor(Date.now() / 1000)) {
        // Abgelaufenes Token löschen
        await db.prepare('DELETE FROM password_reset_tokens WHERE token = ?')
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
      await db.prepare('DELETE FROM password_reset_tokens WHERE token = ?')
        .bind(token)
        .run();

      // Erfolgreichen Passwort-Reset protokollieren
      logPasswordReset(userId, ipAddress, {
        action: 'reset_successful'
      });

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
