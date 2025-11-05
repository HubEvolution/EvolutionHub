"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSecurityEvent = logSecurityEvent;
exports.logAuthSuccess = logAuthSuccess;
exports.logAuthFailure = logAuthFailure;
exports.logPasswordReset = logPasswordReset;
exports.logProfileUpdate = logProfileUpdate;
exports.logPermissionDenied = logPermissionDenied;
exports.logRateLimitExceeded = logRateLimitExceeded;
exports.logSuspiciousActivity = logSuspiciousActivity;
exports.logApiError = logApiError;
exports.logApiAccess = logApiAccess;
exports.logAuthAttempt = logAuthAttempt;
exports.logUserEvent = logUserEvent;
exports.logMetricCounter = logMetricCounter;
exports.logMetricGauge = logMetricGauge;
exports.logMetricTiming = logMetricTiming;
const logger_1 = require("@/server/utils/logger");
/**
 * Protokolliert ein Sicherheitsereignis und leitet es an den zentralen Logger weiter.
 *
 * @param type Der Typ des Sicherheitsereignisses
 * @param details Zusätzliche Details zum Ereignis
 * @param options Zusätzliche Optionen wie userId, targetResource, ipAddress
 * @returns void
 */
function logSecurityEvent(type, details, options = {}) {
    const event = {
        type,
        userId: options.userId,
        targetResource: options.targetResource,
        ipAddress: options.ipAddress,
        timestamp: Date.now(),
        details,
    };
    // Bestimme das Log-Level basierend auf dem SecurityEventType
    let logLevel;
    switch (type) {
        case 'AUTH_SUCCESS':
        case 'API_ACCESS':
        case 'USER_EVENT':
            logLevel = 'info';
            break;
        case 'AUTH_FAILURE':
        case 'PERMISSION_DENIED':
        case 'API_ERROR':
        case 'RATE_LIMIT_EXCEEDED':
        case 'SUSPICIOUS_ACTIVITY':
            logLevel = 'error';
            break;
        case 'PASSWORD_RESET':
            logLevel = 'warn';
            break;
        default:
            // Fallback für unbekannte Typen, falls neue Typen hinzugefügt werden
            logLevel = 'info';
    }
    // Erstelle eine aussagekräftige Basismeldung
    const logMessage = `Security Event: ${type}`;
    // Erstelle ein umfassendes Context-Objekt für den zentralen Log-Aufruf
    const messageMaybe = details.message;
    const userMessage = typeof messageMaybe === 'string' ? messageMaybe : undefined;
    const contextForLog = {
        ...options, // Beinhaltet userId, targetResource, ipAddress
        securityEventType: type, // Expliziter Typ für den Log-Eintrag
        originalDetails: details, // Die originalen Detail-Informationen
        ...(userMessage ? { userMessage } : {}), // Füge eine spezifische Nachricht hinzu, falls vorhanden
        logLevel: logLevel, // Behalte das bestimmte Level bei, falls es im Kontext nützlich ist
        eventSnapshot: event, // vollständiger Ereignis-Snapshot zur Nachverfolgbarkeit
    };
    // Rufe die zentrale log-Funktion auf, die die Nachrichten an die Clients broadcastet
    (0, logger_1.log)(logLevel, logMessage, contextForLog);
}
/**
 * Hilfsfunktion für erfolgreiche Authentifizierungs-Events
 */
function logAuthSuccess(userId, ipAddress, details = {}) {
    logSecurityEvent('AUTH_SUCCESS', details, { userId, ipAddress });
}
/**
 * Hilfsfunktion für fehlgeschlagene Authentifizierungs-Events
 */
function logAuthFailure(ipAddress, details = {}) {
    logSecurityEvent('AUTH_FAILURE', details, { ipAddress });
}
/**
 * Hilfsfunktion für Passwort-Reset-Events
 */
function logPasswordReset(userId, ipAddress, details = {}) {
    logSecurityEvent('PASSWORD_RESET', details, { userId, ipAddress });
}
/**
 * Hilfsfunktion für Profil-Update-Events
 */
function logProfileUpdate(userId, details = {}) {
    logSecurityEvent('PROFILE_UPDATE', details, { userId });
}
/**
 * Hilfsfunktion für Zugriffsverweigerungs-Events
 */
function logPermissionDenied(userId, targetResource, details = {}) {
    logSecurityEvent('PERMISSION_DENIED', details, { userId, targetResource });
}
/**
 * Hilfsfunktion für Rate-Limiting-Events
 */
function logRateLimitExceeded(ipAddress, targetResource, details = {}) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', details, { ipAddress, targetResource });
}
/**
 * Hilfsfunktion für verdächtige Aktivitäten
 */
function logSuspiciousActivity(ipAddress, details = {}) {
    logSecurityEvent('SUSPICIOUS_ACTIVITY', details, { ipAddress });
}
/**
 * Hilfsfunktion für API-Fehler
 *
 * @param targetResource Ziel-Ressource oder Endpunkt (z.B. '/api/user/profile')
 * @param details Fehlerdetails und zusätzliche Informationen
 * @param options Zusätzliche Optionen wie userId und ipAddress
 */
function logApiError(targetResource, details = {}, options = {}) {
    logSecurityEvent('API_ERROR', details, {
        targetResource,
        userId: options.userId,
        ipAddress: options.ipAddress,
    });
}
/**
 * Hilfsfunktion für API-Zugriffe
 *
 * @param userId ID des anfragenden Benutzers ('anonymous' für nicht angemeldete Benutzer)
 * @param ipAddress IP-Adresse des anfragenden Clients
 * @param details Zusätzliche Details wie Endpunkt, Methode und andere relevante Daten
 */
function logApiAccess(userId, ipAddress, details = {}) {
    const d = details;
    const endpoint = typeof d.endpoint === 'string' ? d.endpoint : undefined;
    const path = typeof d.path === 'string' ? d.path : undefined;
    logSecurityEvent('API_ACCESS', details, {
        userId: userId || 'anonymous',
        ipAddress: ipAddress || 'unknown',
        targetResource: endpoint || path || 'unknown',
    });
}
/**
 * Hilfsfunktion für Authentifizierungsversuche
 */
function logAuthAttempt(ipAddress, details = {}) {
    logSecurityEvent('AUTH_FAILURE', details, { ipAddress });
}
/**
 * Hilfsfunktion für allgemeine Benutzer-Events
 *
 * Diese Funktion protokolliert beliebige benutzerspezifische Ereignisse,
 * die nicht in die anderen Kategorien passen, aber dennoch sicherheitsrelevant sind.
 *
 * @param userId ID des betroffenen Benutzers
 * @param eventType Typ des Ereignisses (für Details)
 * @param details Zusätzliche Details zum Ereignis
 */
function logUserEvent(userId, eventType, details = {}) {
    logSecurityEvent('USER_EVENT', { eventType, ...details }, { userId });
}
/**
 * Metric-Helper (gebündelte Telemetrie über zentrale Log-Pipeline)
 */
function logMetricCounter(name, value = 1, dims) {
    (0, logger_1.log)('info', 'METRIC', {
        type: 'METRIC',
        metric: {
            kind: 'counter',
            name,
            value,
            ...(dims ? { dims } : {}),
        },
        timestamp: Date.now(),
    });
}
function logMetricGauge(name, value, dims) {
    (0, logger_1.log)('info', 'METRIC', {
        type: 'METRIC',
        metric: {
            kind: 'gauge',
            name,
            value,
            ...(dims ? { dims } : {}),
        },
        timestamp: Date.now(),
    });
}
function logMetricTiming(name, ms, dims) {
    (0, logger_1.log)('info', 'METRIC', {
        type: 'METRIC',
        metric: {
            kind: 'timing',
            name,
            value: ms,
            ...(dims ? { dims } : {}),
        },
        timestamp: Date.now(),
    });
}
