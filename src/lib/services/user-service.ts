/**
 * User Service Interface und Implementierung
 *
 * Verantwortlich für alle Benutzer-bezogenen Operationen wie Profilverwaltung
 * und Benutzersuche. Kapselt Datenbankzugriffe und Geschäftslogik.
 */

import type { User } from '@/lib/auth-v2';
import type { BaseService, ServiceDependencies } from './types';
import type { SafeUser } from '@/lib/db/types';

/**
 * Interface für den User Service
 */
export interface UserService extends BaseService {
  /**
   * Holt Benutzerdaten anhand der ID
   *
   * @param userId ID des Benutzers
   * @returns Der Benutzer oder null, falls nicht gefunden
   */
  getUserById(userId: string): Promise<User | null>;

  /**
   * Holt einen Benutzer anhand seiner E-Mail-Adresse
   *
   * @param email E-Mail-Adresse des Benutzers
   * @returns Der Benutzer oder null, falls nicht gefunden
   */
  getUserByEmail(email: string): Promise<User | null>;

  /**
   * Holt einen Benutzer anhand seines Benutzernamens
   *
   * @param username Benutzername
   * @returns Der Benutzer oder null, falls nicht gefunden
   */
  getUserByUsername(username: string): Promise<User | null>;

  /**
   * Aktualisiert das Benutzerprofil
   *
   * @param userId ID des zu aktualisierenden Benutzers
   * @param data Zu aktualisierende Daten
   * @returns Der aktualisierte Benutzer
   */
  updateProfile(
    userId: string,
    data: {
      name?: string;
      username?: string;
      image?: string;
    }
  ): Promise<SafeUser>;

  /**
   * Ändert das Benutzerpasswort
   *
   * @param userId ID des Benutzers
   * @param currentPassword Aktuelles Passwort (zur Verifikation)
   * @param newPassword Neues Passwort
   * @returns true, wenn erfolgreich
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;

  /**
   * Löscht ein Benutzerkonto
   *
   * @param userId ID des zu löschenden Benutzers
   * @returns true, wenn erfolgreich
   */
  deleteAccount(userId: string): Promise<boolean>;

  /**
   * Sucht Benutzer anhand verschiedener Kriterien
   *
   * @param query Suchparameter
   * @returns Liste von Benutzern, die den Kriterien entsprechen
   */
  searchUsers(query: { term?: string; limit?: number; offset?: number }): Promise<SafeUser[]>;
}

/**
 * Factory-Funktion zur Erstellung einer UserService-Instanz
 *
 * @param deps Abhängigkeiten für den Service
 * @returns Eine neue UserService-Instanz
 */
export function createUserService(_deps: ServiceDependencies): UserService {
  // Diese Funktion wird später die tatsächliche Implementierung zurückgeben
  // Derzeit nur ein Platzhalter für das Interface-Design
  return {} as UserService;
}
