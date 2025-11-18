import { loggerFactory } from '@/server/utils/logger-factory';
import type { SecurityLogger as CoreSecurityLogger } from '@/types/logger';

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

let securityLogger: CoreSecurityLogger | null = null;

function getSecurityLogger(): CoreSecurityLogger {
  if (!securityLogger) {
    securityLogger = loggerFactory.createSecurityLogger();
  }
  return securityLogger as CoreSecurityLogger;
}

type SecurityEventType =
  | 'AUTH_SUCCESS' // Erfolgreiche Authentifizierung
  | 'AUTH_FAILURE' // Fehlgeschlagene Authentifizierung
  | 'PASSWORD_RESET' // Passwort-Reset angefordert/durchgeführt
  | 'PROFILE_UPDATE' // Profiländerung
  | 'PERMISSION_DENIED' // Zugriff verweigert
  | 'RATE_LIMIT_EXCEEDED' // Rate-Limit überschritten
  | 'SUSPICIOUS_ACTIVITY' // Verdächtige Aktivität
  | 'API_ERROR' // API-Fehler
  | 'API_ACCESS' // API-Zugriff
  | 'USER_EVENT' // Allgemeine Benutzer-Events
  | 'METRIC'; // Metrik-Events (gebündelte Telemetrie)          // Allgemeine Benutzer-Events

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string; // Betroffene User-ID (wenn zutreffend)
  targetResource?: string; // Betroffene Ressource (z.B. '/api/user/profile')
  ipAddress?: string; // IP-Adresse des Anfragenden
  timestamp: number; // Zeitstempel
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
  const mergedDetails: Record<string, unknown> = {
    ...options,
    ...details,
  };

  getSecurityLogger().logSecurityEvent(type, mergedDetails);
}

/**
 * Hilfsfunktion für erfolgreiche Authentifizierungs-Events
 */
export function logAuthSuccess(
  userId: string,
  ipAddress?: string,
  details: Record<string, unknown> = {}
) {
  const mergedDetails: Record<string, unknown> = {
    userId,
    ...(ipAddress ? { ipAddress } : {}),
    ...details,
  };

  getSecurityLogger().logAuthSuccess(mergedDetails);
}

/**
 * Hilfsfunktion für fehlgeschlagene Authentifizierungs-Events
 */
export function logAuthFailure(ipAddress?: string, details: Record<string, unknown> = {}) {
  const mergedDetails: Record<string, unknown> = {
    ...(ipAddress ? { ipAddress } : {}),
    ...details,
  };

  getSecurityLogger().logAuthFailure(mergedDetails);
}

/**
 * Hilfsfunktion für Passwort-Reset-Events
 */
export function logPasswordReset(
  userId: string,
  ipAddress?: string,
  details: Record<string, unknown> = {}
) {
  const mergedDetails: Record<string, unknown> = {
    userId,
    ...(ipAddress ? { ipAddress } : {}),
    ...details,
  };

  logSecurityEvent('PASSWORD_RESET', mergedDetails);
}

/**
 * Hilfsfunktion für Profil-Update-Events
 */
export function logProfileUpdate(userId: string, details: Record<string, unknown> = {}) {
  const mergedDetails: Record<string, unknown> = {
    userId,
    ...details,
  };

  logSecurityEvent('PROFILE_UPDATE', mergedDetails);
}

/**
 * Hilfsfunktion für Zugriffsverweigerungs-Events
 */
export function logPermissionDenied(
  userId: string,
  targetResource: string,
  details: Record<string, unknown> = {}
) {
  const mergedDetails: Record<string, unknown> = {
    userId,
    targetResource,
    ...details,
  };

  logSecurityEvent('PERMISSION_DENIED', mergedDetails);
}

/**
 * Hilfsfunktion für Rate-Limiting-Events
 */
export function logRateLimitExceeded(
  ipAddress: string,
  targetResource: string,
  details: Record<string, unknown> = {}
) {
  const mergedDetails: Record<string, unknown> = {
    ipAddress,
    targetResource,
    ...details,
  };

  logSecurityEvent('RATE_LIMIT_EXCEEDED', mergedDetails);
}

/**
 * Hilfsfunktion für verdächtige Aktivitäten
 */
export function logSuspiciousActivity(ipAddress: string, details: Record<string, unknown> = {}) {
  const mergedDetails: Record<string, unknown> = {
    ipAddress,
    ...details,
  };

  logSecurityEvent('SUSPICIOUS_ACTIVITY', mergedDetails);
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
  details: Record<string, unknown> = {},
  options: { userId?: string; ipAddress?: string } = {}
) {
  const mergedDetails: Record<string, unknown> = {
    targetResource,
    ...options,
    ...details,
  };

  getSecurityLogger().logApiError(mergedDetails);
}

/**
 * Hilfsfunktion für API-Zugriffe
 *
 * @param userId ID des anfragenden Benutzers ('anonymous' für nicht angemeldete Benutzer)
 * @param ipAddress IP-Adresse des anfragenden Clients
 * @param details Zusätzliche Details wie Endpunkt, Methode und andere relevante Daten
 */
export function logApiAccess(
  userId: string,
  ipAddress: string,
  details: Record<string, unknown> = {}
) {
  const d = details as { endpoint?: unknown; path?: unknown };
  const endpoint = typeof d.endpoint === 'string' ? d.endpoint : undefined;
  const path = typeof d.path === 'string' ? d.path : undefined;

  const mergedDetails: Record<string, unknown> = {
    userId: userId || 'anonymous',
    ipAddress: ipAddress || 'unknown',
    targetResource: endpoint || path || 'unknown',
    ...details,
  };

  getSecurityLogger().logApiAccess(mergedDetails);
}

/**
 * Hilfsfunktion für Authentifizierungsversuche
 */
export function logAuthAttempt(ipAddress: string, details: Record<string, unknown> = {}) {
  const mergedDetails: Record<string, unknown> = {
    ipAddress,
    ...details,
  };

  logSecurityEvent('AUTH_FAILURE', mergedDetails);
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
export function logUserEvent(
  userId: string,
  eventType: string,
  details: Record<string, unknown> = {}
) {
  const mergedDetails: Record<string, unknown> = {
    eventType,
    userId,
    ...details,
  };

  logSecurityEvent('USER_EVENT', mergedDetails);
}

/**
 * Metric-Helper (gebündelte Telemetrie über zentrale Log-Pipeline)
 */
export function logMetricCounter(name: string, value = 1, dims?: Record<string, unknown>) {
  logSecurityEvent('METRIC', {
    metric: {
      kind: 'counter',
      name,
      value,
      ...(dims ? { dims } : {}),
    },
    timestamp: Date.now(),
  });
}

export function logMetricGauge(name: string, value: number, dims?: Record<string, unknown>) {
  logSecurityEvent('METRIC', {
    metric: {
      kind: 'gauge',
      name,
      value,
      ...(dims ? { dims } : {}),
    },
    timestamp: Date.now(),
  });
}

export function logMetricTiming(name: string, ms: number, dims?: Record<string, unknown>) {
  logSecurityEvent('METRIC', {
    metric: {
      kind: 'timing',
      name,
      value: ms,
      ...(dims ? { dims } : {}),
    },
    timestamp: Date.now(),
  });
}
