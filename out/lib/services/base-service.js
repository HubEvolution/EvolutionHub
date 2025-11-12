'use strict';
/**
 * Basis-Service-Implementierung
 *
 * Implementiert gemeinsame Funktionalitäten für alle Services,
 * insbesondere Transaktionsmanagement und Fehlerbehandlung.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.AbstractBaseService = void 0;
const types_1 = require('./types');
/**
 * Basis-Implementierung für alle Services
 * Stellt gemeinsame Funktionalität wie Transaktionsmanagement bereit
 */
class AbstractBaseService {
  constructor(deps) {
    this.deps = deps;
    this.db = deps.db;
    this.isDevelopment = deps.isDevelopment || false;
  }
  /**
   * Führt eine Funktion innerhalb einer Datenbanktransaktion aus
   *
   * @param callback Funktion, die innerhalb der Transaktion ausgeführt werden soll
   * @param options Optionen für die Transaktion
   * @returns Das Ergebnis der ausgeführten Funktion
   *
   * @remarks
   * Da D1 derzeit keine nativen Transaktionen unterstützt, ist diese Implementierung
   * eine Vorbereitung für zukünftige Updates. Aktuell wird einfach die Funktion mit der
   * Datenbankinstanz ausgeführt. Sobald D1 Transaktionen unterstützt, kann diese
   * Methode entsprechend aktualisiert werden.
   */
  async withTransaction(callback, _options) {
    try {
      // In Zukunft, wenn D1 Transaktionen unterstützt:
      // const tx = await this.db.beginTransaction();
      // const result = await callback(tx);
      // await tx.commit();
      // return result;
      // Aktuell: Direkte Ausführung ohne Transaktion
      return await callback(this.db);
    } catch (error) {
      // In Zukunft:
      // await tx.rollback();
      // Fehlerbehandlung
      if (error instanceof types_1.ServiceError) {
        throw error; // ServiceErrors direkt weiterreichen
      } else {
        // Andere Fehler in ServiceErrors umwandeln
        console.error(`Database error: ${error instanceof Error ? error.message : String(error)}`);
        throw new types_1.ServiceError(
          'Ein Datenbankfehler ist aufgetreten',
          types_1.ServiceErrorType.DATABASE,
          {
            originalError: this.isDevelopment ? error : undefined,
          }
        );
      }
    }
  }
  /**
   * Helper-Methode für sichere Datenbankoperationen
   * Kapselt try/catch und wandelt DB-Fehler in typisierte ServiceErrors um
   *
   * @param operation Die auszuführende Datenbankoperation
   * @returns Das Ergebnis der Operation
   */
  async safeDbOperation(operation) {
    try {
      return await operation();
    } catch (error) {
      console.error(
        `Database operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new types_1.ServiceError(
        'Ein Datenbankfehler ist aufgetreten',
        types_1.ServiceErrorType.DATABASE,
        {
          originalError: this.isDevelopment ? error : undefined,
        }
      );
    }
  }
}
exports.AbstractBaseService = AbstractBaseService;
