/**
 * Zentrales Security-Logging-System für Evolution Hub
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
  | 'USER_EVENT';          // Allgemeine Benutzer-Events

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;        // Betroffene User-ID (wenn zutreffend)
  targetResource?: string; // Betroffene Ressource (z.B. '/api/user/profile')
  ipAddress?: string;     // IP-Adresse des Anfragenden
  timestamp: number;      // Zeitstempel
  details: Record<string, any>; // Zusätzliche Details zum Ereignis
}

/**
 * Protokolliert ein Sicherheitsereignis
 * 
 * @param event Das zu protokollierende Sicherheitsereignis
 * @returns void
 */
export function logSecurityEvent(
  type: SecurityEventType,
  details: Record<string, any>,
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

  // In Produktion könnte dies in eine Datenbank oder einen externen Logging-Dienst schreiben
  // Für die Entwicklung verwenden wir console.log mit speziellem Format
  const logPrefix = `[SECURITY:${event.type}]`;
  
  console.log(
    `${logPrefix} ${new Date(event.timestamp).toISOString()} | ` +
    `User: ${event.userId || 'unknown'} | ` +
    `Resource: ${event.targetResource || 'n/a'} | ` +
    `IP: ${event.ipAddress || 'unknown'} | ` +
    `Details: ${JSON.stringify(event.details)}`
  );
}

/**
 * Hilfsfunktion für erfolgreiche Authentifizierungs-Events
 */
export function logAuthSuccess(userId: string, ipAddress?: string, details: Record<string, any> = {}) {
  logSecurityEvent('AUTH_SUCCESS', details, { userId, ipAddress });
}

/**
 * Hilfsfunktion für fehlgeschlagene Authentifizierungs-Events
 */
export function logAuthFailure(ipAddress?: string, details: Record<string, any> = {}) {
  logSecurityEvent('AUTH_FAILURE', details, { ipAddress });
}

/**
 * Hilfsfunktion für Passwort-Reset-Events
 */
export function logPasswordReset(userId: string, ipAddress?: string, details: Record<string, any> = {}) {
  logSecurityEvent('PASSWORD_RESET', details, { userId, ipAddress });
}

/**
 * Hilfsfunktion für Profil-Update-Events
 */
export function logProfileUpdate(userId: string, details: Record<string, any> = {}) {
  logSecurityEvent('PROFILE_UPDATE', details, { userId });
}

/**
 * Hilfsfunktion für Zugriffsverweigerungs-Events
 */
export function logPermissionDenied(userId: string, targetResource: string, details: Record<string, any> = {}) {
  logSecurityEvent('PERMISSION_DENIED', details, { userId, targetResource });
}

/**
 * Hilfsfunktion für Rate-Limiting-Events
 */
export function logRateLimitExceeded(ipAddress: string, targetResource: string, details: Record<string, any> = {}) {
  logSecurityEvent('RATE_LIMIT_EXCEEDED', details, { ipAddress, targetResource });
}

/**
 * Hilfsfunktion für verdächtige Aktivitäten
 */
export function logSuspiciousActivity(ipAddress: string, details: Record<string, any> = {}) {
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
