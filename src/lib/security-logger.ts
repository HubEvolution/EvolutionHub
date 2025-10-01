import { log } from '@/server/utils/logger';

/**
 * Global logging function for the application.
 * Supports different log levels and optional context objects.
 * Logs are broadcast to connected WebSocket clients.
 *
 * @param level - The log level ('info', 'warn', 'error', 'debug').
 * @param message - The log message.
 * @param contextObject - An optional object containing additional context.
 */
// Declaration of the central log function imported from logger.ts

/**
 * Centrales Security-Logging-System für Evolution Hub
 *
 * Dieses Modul bietet Funktionen zum Protokollieren sicherheitsrelevanter Ereignisse.
 * Alle sicherheitsbezogenen Ereignisse sollten über diese Funktionen protokolliert werden,
 * um ein konsistentes Audit-Log zu gewährleisten.
 */

type SecurityEventType =
  | 'AUTH_SUCCESS'         // Erfolgreiche Authentifizierung
  | 'AUTH_FAILURE'         // Fehlgeschlagene Authentifizierung
  | 'PASSWORD_RESET'       // Passwort-Reset angefordert/durchgeführt
  | 'PROFILE_UPDATE'       // Profiländerung
  | 'PERMISSION_DENIED'    // Zugriff verweigert
  | 'RATE_LIMIT_EXCEEDED'  // Rate-Limit überschritten
  | 'SUSPICIOUS_ACTIVITY'  // Verdächtige Aktivität
  | 'API_ERROR'            // API-Fehler
  | 'API_ACCESS'           // API-Zugriff
  | 'USER_EVENT'           // Allgemeine Benutzer-Events
  | 'METRIC';              // Metrik-Events (gebündelte Telemetrie)          // Allgemeine Benutzer-Events

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;        // Betroffene User-ID (wenn zutreffend)
  targetResource?: string; // Betroffene Ressource (z.B. '/api/user/profile')
  ipAddress?: string;     // IP-Adresse des Anfragenden
  timestamp: number;      // Zeitstempel
  details: Record<string, unknown>; // Zusätzliche Details zum Ereignis
}

/**
 * Protokolliert ein Sicherheitsereignis und leitet es an den zentralen Logger weiter.
 *
 * @param type Der Typ des Sicherheitsereignisses
 * @param details Zusätzliche Details zum Ereignis
 * @param options Zusätzliche Optionen wie userId, targetResource, ipAddress
 * @returns void
 */
export function logSecurityEvent(
  type: SecurityEventType,
  details: Record<string, unknown>,
  options: {
    userId?: string;
    targetResource?: string;
    ipAddress?: string;
  } = {}
): void {
  const event: SecurityEvent = {
    type,
    userId: options.userId,
    targetResource: options.targetResource,
    ipAddress: options.ipAddress,
    timestamp: Date.now(),
    details
  };

  // Bestimme das Log-Level basierend auf dem SecurityEventType
  let logLevel: string;
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
  const contextForLog = {
    ...options, // Beinhaltet userId, targetResource, ipAddress
    securityEventType: type, // Expliziter Typ für den Log-Eintrag
    originalDetails: details, // Die originalen Detail-Informationen
    ...(details.message && { userMessage: details.message }), // Füge eine spezifische Nachricht hinzu, falls vorhanden
    logLevel: logLevel, // Behalte das bestimmte Level bei, falls es im Kontext nützlich ist
    eventSnapshot: event // vollständiger Ereignis-Snapshot zur Nachverfolgbarkeit
  };

  // Rufe die zentrale log-Funktion auf, die die Nachrichten an die Clients broadcastet
  log(logLevel, logMessage, contextForLog);
}

/**
 * Hilfsfunktion für erfolgreiche Authentifizierungs-Events
 */
export function logAuthSuccess(userId: string, ipAddress?: string, details: Record<string, unknown> = {}) {
  logSecurityEvent('AUTH_SUCCESS', details, { userId, ipAddress });
}

/**
 * Hilfsfunktion für fehlgeschlagene Authentifizierungs-Events
 */
export function logAuthFailure(ipAddress?: string, details: Record<string, unknown> = {}) {
  logSecurityEvent('AUTH_FAILURE', details, { ipAddress });
}

/**
 * Hilfsfunktion für Passwort-Reset-Events
 */
export function logPasswordReset(userId: string, ipAddress?: string, details: Record<string, unknown> = {}) {
  logSecurityEvent('PASSWORD_RESET', details, { userId, ipAddress });
}

/**
 * Hilfsfunktion für Profil-Update-Events
 */
export function logProfileUpdate(userId: string, details: Record<string, unknown> = {}) {
  logSecurityEvent('PROFILE_UPDATE', details, { userId });
}

/**
 * Hilfsfunktion für Zugriffsverweigerungs-Events
 */
export function logPermissionDenied(userId: string, targetResource: string, details: Record<string, unknown> = {}) {
  logSecurityEvent('PERMISSION_DENIED', details, { userId, targetResource });
}

/**
 * Hilfsfunktion für Rate-Limiting-Events
 */
export function logRateLimitExceeded(ipAddress: string, targetResource: string, details: Record<string, unknown> = {}) {
  logSecurityEvent('RATE_LIMIT_EXCEEDED', details, { ipAddress, targetResource });
}

/**
 * Hilfsfunktion für verdächtige Aktivitäten
 */
export function logSuspiciousActivity(ipAddress: string, details: Record<string, unknown> = {}) {
  logSecurityEvent('SUSPICIOUS_ACTIVITY', details, { ipAddress });
}

/**
 * Hilfsfunktion für API-Fehler
 *
 * @param targetResource Ziel-Ressource oder Endpunkt (z.B. '/api/user/profile')
 * @param details Fehlerdetails und zusätzliche Informationen
 * @param options Zusätzliche Optionen wie userId und ipAddress
 */
export function logApiError(
  targetResource: string,
  details: Record<string, any> = {},
  options: { userId?: string, ipAddress?: string } = {}
) {
  logSecurityEvent('API_ERROR', details, {
    targetResource,
    userId: options.userId,
    ipAddress: options.ipAddress
  });
}

/**
 * Hilfsfunktion für API-Zugriffe
 *
 * @param userId ID des anfragenden Benutzers ('anonymous' für nicht angemeldete Benutzer)
 * @param ipAddress IP-Adresse des anfragenden Clients
 * @param details Zusätzliche Details wie Endpunkt, Methode und andere relevante Daten
 */
export function logApiAccess(userId: string, ipAddress: string, details: Record<string, any> = {}) {
  logSecurityEvent('API_ACCESS', details, {
    userId: userId || 'anonymous',
    ipAddress: ipAddress || 'unknown',
    targetResource: details.endpoint || details.path || 'unknown'
  });
}

/**
 * Hilfsfunktion für Authentifizierungsversuche
 */
export function logAuthAttempt(ipAddress: string, details: Record<string, any> = {}) {
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
export function logUserEvent(userId: string, eventType: string, details: Record<string, any> = {}) {
  logSecurityEvent('USER_EVENT', { eventType, ...details }, { userId });
}


/**
 * Metric-Helper (gebündelte Telemetrie über zentrale Log-Pipeline)
 */
export function logMetricCounter(name: string, value = 1, dims?: Record<string, any>) {
  log('info', 'METRIC', {
    type: 'METRIC',
    metric: {
      kind: 'counter',
      name,
      value,
      ...(dims ? { dims } : {})
    },
    timestamp: Date.now()
  });
}

export function logMetricGauge(name: string, value: number, dims?: Record<string, any>) {
  log('info', 'METRIC', {
    type: 'METRIC',
    metric: {
      kind: 'gauge',
      name,
      value,
      ...(dims ? { dims } : {})
    },
    timestamp: Date.now()
  });
}

export function logMetricTiming(name: string, ms: number, dims?: Record<string, any>) {
  log('info', 'METRIC', {
    type: 'METRIC',
    metric: {
      kind: 'timing',
      name,
      value: ms,
      ...(dims ? { dims } : {})
    },
    timestamp: Date.now()
  });
}