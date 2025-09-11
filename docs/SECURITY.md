# Evolution Hub Security Documentation

[![Security Status](https://img.shields.io/badge/Security-Enhanced-brightgreen)](https://github.com/LucasBonnerue/evolution-hub)
[![OWASP Compliant](https://img.shields.io/badge/OWASP-Compliant-blue)](https://owasp.org/www-project-top-ten/)
[![Security Banner](../public/assets/svg/security.svg)](https://owasp.org/www-project-top-ten/)

Diese Dokumentation bietet einen umfassenden Überblick über die Sicherheitsmaßnahmen, die im Evolution Hub implementiert wurden, um die Anwendung vor gängigen Bedrohungen zu schützen.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Implementierte Security-Features](#implementierte-security-features)
   - [Rate-Limiting](#1-rate-limiting)
   - [Security-Headers](#2-security-headers)
   - [Audit-Logging](#3-audit-logging)
   - [Input-Validierung](#4-input-validierung)
   - [Datenschutz](#5-datenschutz)
3. [API-Endpunkte und Security-Features](#api-endpunkte-und-security-features)
   - [Authentifizierungs-APIs](#authentifizierungs-apis)
   - [Benutzer-APIs](#benutzer-apis)
   - [Projekt-APIs](#projekt-apis)
   - [Dashboard-APIs](#dashboard-apis)
   - [Öffentliche APIs](#öffentliche-apis)
4. [Sicherheitsrichtlinien](#sicherheitsrichtlinien)
5. [Bekannte Sicherheitsprobleme](#bekannte-sicherheitsprobleme)
6. [Empfehlungen für zukünftige Verbesserungen](#empfehlungen-für-zukünftige-verbesserungen)

## Überblick

Evolution Hub implementiert mehrschichtige Sicherheitsmaßnahmen, die auf bewährten Branchenstandards und Best Practices basieren. Die Sicherheitsarchitektur umfasst:

- **Präventive Maßnahmen**: Rate-Limiting, Security-Headers, Input-Validierung
- **Detektive Maßnahmen**: Umfassendes Audit-Logging, Fehlerprotokollierung
- **Reaktive Maßnahmen**: Strukturierte Fehlerbehandlung, Benutzerbenachrichtigungen

Alle API-Endpunkte wurden systematisch mit diesen Sicherheitsmaßnahmen ausgestattet und umfassend getestet.

## Implementierte Security-Features

### 1. Rate-Limiting

Ein flexibles Rate-Limiting-System schützt die API vor Brute-Force- und DoS-Angriffen.

#### Technische Details

- **Implementierung**: `src/lib/rate-limiter.ts`
- **Speicherung**: In-Memory-Store mit konfigurierbaren Zeitfenstern und Anfragelimits
- **Konfigurierbare Limiter**:
  - `standardApiLimiter`: 50 Anfragen/Minute für normale API-Endpunkte
  - `authLimiter`: 10 Anfragen/Minute für Authentifizierungs-Endpunkte
  - `sensitiveActionLimiter`: 5 Anfragen/Stunde für besonders sensible Aktionen

#### Verwendung im Code

```typescript
import { apiRateLimiter } from '@/lib/rate-limiter';
 
export const POST: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Normale API-Logik...
}
```

#### Antwort bei überschrittenem Limit

Wenn ein Client das Rate-Limit überschreitet, erhält er eine strukturierte JSON-Antwort mit HTTP-Status 429:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

Dazu werden entsprechende HTTP-Header gesetzt:

```text
Status: 429 Too Many Requests
Content-Type: application/json
Retry-After: 45
```

### 2. Security-Headers

Ein umfassendes System zur Anwendung von Sicherheits-HTTP-Headern minimiert gängige Web-Sicherheitsrisiken.

#### Technische Details

- **Implementierung**: `src/lib/security-headers.ts`
- **Standardisierte Header-Sets**:
  - `standardSecurityHeaders`: Basis-Sicherheitsheader für alle Antworten
  - `apiSecurityHeaders`: Erweiterte Header speziell für API-Endpunkte
- **Implementierte Header**:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
  - Strict-Transport-Security
  - Permissions-Policy
  - Cross-Origin-Opener-Policy
  - Cross-Origin-Embedder-Policy

#### Verwendung im Code

```typescript
import { applySecurityHeaders } from '@/lib/security-headers';
 
export const GET: APIRoute = async (context) => {
  // Original-Funktionalität aufrufen
  const response = await originalFunction(context);
  
  // Security-Headers anwenden
  const securedResponse = applySecurityHeaders(response);
  
  return securedResponse;
}
```

### 3. Audit-Logging

Ein **zentrales Hybrid-Logging-System** protokolliert sicherheitsrelevante Ereignisse einheitlich und bietet **Live-Streaming** für optimales Monitoring.

#### Technische Details

- **Implementierung**:
  - `src/lib/security-logger.ts` - Security-spezifische Logging-Funktionen
  - `src/server/utils/logger.ts` - Zentraler Hybrid-Logger mit Environment-Detection
  - `src/components/ui/DebugPanel.tsx` - Live Debug Panel mit WebSocket/SSE-Streaming
  - `/api/debug/logs-stream` - SSE-Endpoint für Cloudflare-Umgebungen

- **Hybrid-Architektur**:
  - **Astro Dev** (`npm run dev`): WebSocket Live-Streaming (Real-time)
  - **Wrangler Dev** (`npm run dev:wrangler`): SSE Live-Streaming (Near real-time)
  - **Production**: Console-Logging mit Cloudflare Analytics-Integration

- **Event-Typen**:
  - AUTH_SUCCESS: Erfolgreiche Authentifizierung
  - AUTH_FAILURE: Fehlgeschlagene Authentifizierung
  - PROFILE_UPDATE: Profilaktualisierungen
  - PERMISSION_DENIED: Zugriffsverweigerungen
  - RATE_LIMIT_EXCEEDED: Überschrittene Rate-Limits
  - SUSPICIOUS_ACTIVITY: Verdächtige Aktivitäten
  - API_ERROR: API-Fehler mit Sicherheitsrelevanz
  - API_ACCESS: Allgemeine API-Zugriffe und Benutzeraktivitäten

#### Verwendung im Code

```typescript
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';
 
export const POST: APIRoute = async (context) => {
  try {
    // API-Logik...
    
    // API-Zugriff protokollieren
    logApiAccess(userId, clientAddress, {
      endpoint: '/api/example',
      method: 'POST',
      action: 'example_action'
    });
    
    return response;
  } catch (error) {
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'server_error',
      endpoint: '/api/example',
      details: error instanceof Error ? error.message : String(error)
    });
    
    return errorResponse;
  }
}
```

### 4. Input-Validierung

Strenge Input-Validation schützt vor Injection-Angriffen und Datenmanipulation.

#### Technische Details

- **Implementierung**: Kombiniert mit API-spezifischer Validierungslogik
- **Validierungstypen**:
  - Typ-Validierung (TypeScript)
  - Schema-Validierung (JSON-Schema)
  - Sanitisierung von Benutzereingaben
  - Whitelist-Filterung für erlaubte Felder

#### Beispiel für Whitelist-Filterung

```typescript
// Nur erlaubte Felder in der Antwort zurückgeben
const safeUserData = {
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  created_at: user.created_at
};
 
return secureJsonResponse({ user: safeUser }, 200);
```

### 5. Datenschutz

Maßnahmen zum Schutz sensibler Benutzerdaten.

#### Technische Details

- **Passwort-Hashing**: Sichere Hashing-Algorithmen (bcrypt)
- **Datenfilterung**: Sensible Daten werden vor der Rückgabe gefiltert
- **Vermeidung von User-Enumeration**: Konsistente Antworten unabhängig vom Benutzerexistenz-Status

## API-Endpunkte und Security-Features

### Authentifizierungs-APIs

| Endpunkt | Rate-Limit | Security-Headers | Audit-Logging | Input-Validierung | Besondere Maßnahmen |
|----------|------------|------------------|---------------|-------------------|---------------------|
| `/api/auth/magic/request` | authLimiter (10/min) | Vollständig | AUTH_SUCCESS | Vollständig | Anti-Abuse, CSRF/Origin-Checks |
| `/api/auth/callback` | standardApiLimiter (50/min) | Vollständig | AUTH_SUCCESS | Vollständig | Redirect-only, Cookie-Setzung |
| `/api/user/logout` | standardApiLimiter (50/min) | Vollständig | AUTH_SUCCESS | Vollständig | Session-Invalidierung |
| `/api/user/logout-v2` | standardApiLimiter (50/min) | Vollständig | AUTH_SUCCESS | Vollständig | Session-Invalidierung |

### Benutzer-APIs

| Endpunkt | Rate-Limit | Security-Headers | Audit-Logging | Input-Validierung | Besondere Maßnahmen |
|----------|------------|------------------|---------------|-------------------|---------------------|
| `/api/user/me` | standardApiLimiter (50/min) | Vollständig | API_ACCESS | Vollständig | Whitelist-Filterung sensibler Daten |
| `/api/user/profile` | sensitiveActionLimiter (5/min) | Vollständig | PROFILE_UPDATE | Vollständig | Username-Kollisionsprüfung |

### Projekt-APIs

| Endpunkt | Rate-Limit | Security-Headers | Audit-Logging | Input-Validierung | Besondere Maßnahmen |
|----------|------------|------------------|---------------|-------------------|---------------------|
| `/api/projects` (GET) | standardApiLimiter (50/min) | Vollständig | API_ACCESS | Vollständig | Benutzer-spezifische Filterung |
| `/api/projects` (POST) | sensitiveActionLimiter (5/min) | Vollständig | API_ACCESS | Vollständig | Berechtigungsprüfung |
| `/api/projects/:id` | standardApiLimiter (50/min) | Vollständig | API_ACCESS | Vollständig | Eigentümer-Validierung |

### Dashboard-APIs

| Endpunkt | Rate-Limit | Security-Headers | Audit-Logging | Input-Validierung | Besondere Maßnahmen |
|----------|------------|------------------|---------------|-------------------|---------------------|
| `/api/dashboard/projects` | standardApiLimiter (50/min) | Vollständig | API_ACCESS | Vollständig | Benutzer-spezifische Filterung |
| `/api/dashboard/activities` | standardApiLimiter (50/min) | Vollständig | API_ACCESS | Vollständig | Benutzer-spezifische Filterung |
| `/api/dashboard/perform-action` | sensitiveActionLimiter (5/min) | Vollständig | API_ACCESS | Vollständig | Aktions-Validierung |

### Öffentliche APIs

| Endpunkt | Rate-Limit | Security-Headers | Audit-Logging | Input-Validierung | Besondere Maßnahmen |
|----------|------------|------------------|---------------|-------------------|---------------------|
| `/api/comments` | standardApiLimiter (50/min) | Vollständig | API_ACCESS | Vollständig | Content-Filterung |
| `/api/tools` | standardApiLimiter (50/min) | Vollständig | API_ACCESS | Vollständig | - |

## Sicherheitsrichtlinien

### Session-Management

- Session ausschließlich über HttpOnly-Cookie `__Host-session` (Secure, SameSite=Strict, Path=/)
- Keine clientseitige Speicherung von Tokens im localStorage oder sessionStorage
- Sichere Cookie-Attribute erzwungen
- Session-Timeout-Strategie über Server-Seite konfiguriert

### Fehlerbehandlung

- Keine sensiblen Informationen in Fehlermeldungen
- Konsistente Fehlerstruktur für alle API-Endpunkte
- Detaillierte interne Fehlerprotokolle
- Generische Fehlermeldungen für Benutzer

### Datenschutz

- Minimale Datenspeicherung (nur notwendige Daten)
- Datenfilterung vor der Rückgabe an den Client
- Verschlüsselte Übertragung (HTTPS)
- Regelmäßige Datenlöschung für inaktive Konten

## Bekannte Sicherheitsprobleme

<!-- Abschnitt zu Password-Reset und legacy Enumeration entfernt: System ist Stytch‑only, keine Passwort‑Flows mehr. -->

### 3. In-Memory Rate-Limiting

**Problem**: Das aktuelle Rate-Limiting verwendet einen In-Memory-Store, der bei Worker-Neustarts zurückgesetzt wird.

**Verbesserung**: Persistente Rate-Limiting-Lösung mit Cloudflare KV oder D1 implementieren.

## Empfehlungen für zukünftige Verbesserungen

### Kurzfristige Verbesserungen

1. **Rate-Limiting-Persistenz**: Umstellung des In-Memory-Stores auf eine persistente Lösung (D1)
2. **Erweiterte Logging-Analyse**: Implementierung eines Dashboards zur Überwachung von Sicherheitsereignissen
3. **Spezifischere Fehlerbehandlung**: Verbesserung der Fehlerbehandlung für kritische APIs

### Mittelfristige Verbesserungen

1. **Zwei-Faktor-Authentifizierung**: Implementierung von 2FA für erhöhte Kontosicherheit
2. **Geolocation-basiertes Blocking**: Blockieren von verdächtigen IP-Ranges und Regionen
3. **Automatisierte Security-Scans**: Integration von OWASP ZAP oder ähnlichen Tools in die CI/CD-Pipeline

### Langfristige Verbesserungen

1. **Security-Monitoring-System**: Echtzeit-Überwachung und Benachrichtigung bei verdächtigen Aktivitäten
2. **Erweiterte Berechtigungsmodelle**: Feinkörnigere Zugriffskontrollen und Rollenbasierte Berechtigungen
3. **Regelmäßige Penetrationstests**: Externe Sicherheitsüberprüfungen durch Experten
