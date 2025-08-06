/**
 * Auth Service Interface und Implementierung
 * 
 * Verantwortlich für alle Authentifizierungsoperationen wie Login, Registrierung,
 * Passwort-Reset und Session-Management. Kapselt Datenbankzugriffe und Sicherheitslogik.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { User, Session } from '@/lib/auth-v2';
import type { BaseService, ServiceDependencies } from './types';
import type { SafeUser } from '@/lib/db/types';

/**
 * Ergebnis einer erfolgreichen Authentifizierung
 */
export interface AuthResult {
  /** Benutzer ohne sensible Daten */
  user: SafeUser;
  /** Sitzungsinformationen */
  session: Session;
  /** Session-ID für Cookies */
  sessionId: string;
}

/**
 * Daten für die Benutzerregistrierung
 */
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  username: string;
  image?: string;
}

/**
 * Interface für den Auth Service
 */
export interface AuthService extends BaseService {
  /**
   * Authentifiziert einen Benutzer mit E-Mail und Passwort
   * 
   * @param email E-Mail-Adresse des Benutzers
   * @param password Passwort des Benutzers
   * @returns Authentifizierungsergebnis bei Erfolg
   */
  login(email: string, password: string): Promise<AuthResult>;

  /**
   * Registriert einen neuen Benutzer
   * 
   * @param data Registrierungsdaten
   * @returns Authentifizierungsergebnis bei Erfolg
   */
  register(data: RegisterData): Promise<AuthResult>;

  /**
   * Beendet eine Benutzersitzung
   * 
   * @param sessionId ID der zu beendenden Sitzung
   */
  logout(sessionId: string): Promise<void>;

  /**
   * Überprüft eine Benutzersitzung auf Gültigkeit
   * 
   * @param sessionId ID der zu überprüfenden Sitzung
   * @returns Sitzung und Benutzer oder null, falls ungültig
   */
  validateSession(sessionId: string): Promise<{ session: Session | null, user: SafeUser | null }>;

  /**
   * Erstellt ein Token für das Zurücksetzen eines Passworts
   * 
   * @param email E-Mail-Adresse des Benutzers
   * @returns true, wenn ein Token erstellt wurde (auch wenn der Benutzer nicht existiert)
   */
  createPasswordResetToken(email: string): Promise<boolean>;

  /**
   * Überprüft ein Passwort-Reset-Token
   * 
   * @param token Das zu überprüfende Token
   * @returns Die Benutzer-ID, falls das Token gültig ist, sonst null
   */
  validatePasswordResetToken(token: string): Promise<string | null>;

  /**
   * Setzt ein Passwort mit einem gültigen Token zurück
   * 
   * @param token Das Passwort-Reset-Token
   * @param newPassword Das neue Passwort
   * @returns true, wenn erfolgreich
   */
  resetPassword(token: string, newPassword: string): Promise<boolean>;
}

/**
 * Factory-Funktion zur Erstellung einer AuthService-Instanz
 * 
 * @param deps Abhängigkeiten für den Service
 * @returns Eine neue AuthService-Instanz
 */
export function createAuthService(deps: ServiceDependencies): AuthService {
  // Diese Funktion wird später die tatsächliche Implementierung zurückgeben
  // Derzeit nur ein Platzhalter für das Interface-Design
  return {} as AuthService;
}
