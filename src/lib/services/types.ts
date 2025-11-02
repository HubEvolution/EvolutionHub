/**
 * Basistypen und Interfaces für die Service-Layer
 *
 * Dieses Modul definiert gemeinsame Typen und Interfaces, die von allen Services genutzt werden.
 * Es bildet die Grundlage für Dependency Injection und Transaktionsmanagement.
 */

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Enthält Abhängigkeiten, die allen Services zur Verfügung gestellt werden.
 * Wird bei der Instanziierung der Services übergeben.
 */
export interface ServiceDependencies {
  /**
   * Die D1-Datenbankinstanz
   */
  db: D1Database;

  /**
   * Flag, das angibt, ob die Anwendung im Entwicklungsmodus läuft
   */
  isDevelopment?: boolean;
}

/**
 * Optionen für Transaktionen
 */
export interface TransactionOptions {
  /**
   * Timeout für die Transaktion in Millisekunden
   * Standard: 30 Sekunden
   */
  timeoutMs?: number;
}

/**
 * Basis-Interface für alle Services
 * Definiert gemeinsame Methoden und Eigenschaften
 */
export interface BaseService {
  /**
   * Führt eine Funktion innerhalb einer Datenbanktransaktion aus
   *
   * @param callback Funktion, die innerhalb der Transaktion ausgeführt werden soll
   * @param options Optionen für die Transaktion
   * @returns Das Ergebnis der ausgeführten Funktion
   */
  withTransaction<T>(
    callback: (tx: D1Database) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
}

/**
 * Fehlerkategorien für Service-Fehler
 */
export enum ServiceErrorType {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
}

/**
 * Service-spezifischer Fehler mit typisierter Kategorie
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly type: ServiceErrorType,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  /**
   * Erstellt einen NOT_FOUND-Fehler
   */
  static notFound(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, ServiceErrorType.NOT_FOUND, details);
  }

  /**
   * Erstellt einen VALIDATION-Fehler
   */
  static validation(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, ServiceErrorType.VALIDATION, details);
  }

  /**
   * Erstellt einen AUTHENTICATION-Fehler
   */
  static authentication(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, ServiceErrorType.AUTHENTICATION, details);
  }

  /**
   * Erstellt einen AUTHORIZATION-Fehler
   */
  static authorization(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, ServiceErrorType.AUTHORIZATION, details);
  }

  /**
   * Erstellt einen CONFLICT-Fehler (z.B. bei Duplikaten)
   */
  static conflict(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, ServiceErrorType.CONFLICT, details);
  }
}
