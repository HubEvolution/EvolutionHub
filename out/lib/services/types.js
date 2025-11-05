"use strict";
/**
 * Basistypen und Interfaces für die Service-Layer
 *
 * Dieses Modul definiert gemeinsame Typen und Interfaces, die von allen Services genutzt werden.
 * Es bildet die Grundlage für Dependency Injection und Transaktionsmanagement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceError = exports.ServiceErrorType = void 0;
/**
 * Fehlerkategorien für Service-Fehler
 */
var ServiceErrorType;
(function (ServiceErrorType) {
    ServiceErrorType["NOT_FOUND"] = "NOT_FOUND";
    ServiceErrorType["VALIDATION"] = "VALIDATION";
    ServiceErrorType["AUTHENTICATION"] = "AUTHENTICATION";
    ServiceErrorType["AUTHORIZATION"] = "AUTHORIZATION";
    ServiceErrorType["DATABASE"] = "DATABASE";
    ServiceErrorType["UNKNOWN"] = "UNKNOWN";
    ServiceErrorType["CONFLICT"] = "CONFLICT";
    ServiceErrorType["RATE_LIMIT"] = "RATE_LIMIT";
})(ServiceErrorType || (exports.ServiceErrorType = ServiceErrorType = {}));
/**
 * Service-spezifischer Fehler mit typisierter Kategorie
 */
class ServiceError extends Error {
    constructor(message, type, details) {
        super(message);
        this.type = type;
        this.details = details;
        this.name = 'ServiceError';
    }
    /**
     * Erstellt einen NOT_FOUND-Fehler
     */
    static notFound(message, details) {
        return new ServiceError(message, ServiceErrorType.NOT_FOUND, details);
    }
    /**
     * Erstellt einen VALIDATION-Fehler
     */
    static validation(message, details) {
        return new ServiceError(message, ServiceErrorType.VALIDATION, details);
    }
    /**
     * Erstellt einen AUTHENTICATION-Fehler
     */
    static authentication(message, details) {
        return new ServiceError(message, ServiceErrorType.AUTHENTICATION, details);
    }
    /**
     * Erstellt einen AUTHORIZATION-Fehler
     */
    static authorization(message, details) {
        return new ServiceError(message, ServiceErrorType.AUTHORIZATION, details);
    }
    /**
     * Erstellt einen CONFLICT-Fehler (z.B. bei Duplikaten)
     */
    static conflict(message, details) {
        return new ServiceError(message, ServiceErrorType.CONFLICT, details);
    }
}
exports.ServiceError = ServiceError;
