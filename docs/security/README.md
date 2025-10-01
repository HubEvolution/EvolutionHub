# Security Documentation

Diese Dokumentation beschreibt die Sicherheits-Features, Best Practices und implementierte Schutzmaßnahmen von Evolution Hub.

## Übersicht

Evolution Hub implementiert mehrschichtige Sicherheitsmaßnahmen:
- **Authentication**: Stytch Magic Link (passwortlos)
- **Rate Limiting**: IP-basiert für alle kritischen Endpunkte
- **Security Headers**: CSP, HSTS, CORS, etc.
- **Audit Logging**: Zentrale Security-Event-Protokollierung
- **Input Validation**: Strenge Validierung aller Benutzereingaben

Siehe auch: [../SECURITY.md](../SECURITY.md) für Security-Policy und Vulnerability-Reporting

## Implementierte Sicherheits-Features

### Core Security Systems

- **[Security Improvements](./improvements.md)** — **Hauptdokument** für implementierte Sicherheitsverbesserungen
  - User-API Sicherheit (Whitelist-Ansatz, Validierung)
  - Rate-Limiting-System (`src/lib/rate-limiter.ts`)
  - Security-Headers-System (`src/lib/security-headers.ts`)
  - Security-Audit-Logging (`src/lib/security-logger.ts`)
  - Integration-Beispiele
  - Empfehlungen für zukünftige Verbesserungen

### Detailed Documentation

- **[Rate Limiting](./rate_limiting.md)** — Rate-Limiting-Konfiguration und -Implementierung
  - In-Memory-Store
  - Konfigurierbare Limiter (standard, auth, sensitive)
  - 429-Response-Format

- **[Security Headers](./security_headers.md)** — HTTP-Security-Headers-Konfiguration
  - Content-Security-Policy (CSP)
  - HSTS, X-Frame-Options, etc.
  - Anwendung in API-Responses

## Security-Architektur

### Authentication

Die Authentifizierung basiert auf Stytch Magic Link:
- **Passwortlos**: Keine Passwort-Speicherung
- **Session-basiert**: HttpOnly, Secure, SameSite=Strict Cookies
- **Token-Validierung**: Server-seitige Validierung aller Tokens
- **Rate-Limiting**: Schutz gegen Brute-Force-Angriffe

Siehe: [../architecture/auth-architecture.md](../architecture/auth-architecture.md)

### API Security

- **CSRF-Schutz**: Double-Submit-Cookie-Pattern
- **CORS**: Strict Origin-Validierung
- **Input-Sanitization**: Alle Eingaben werden validiert
- **Error-Handling**: Keine sensiblen Informationen in Fehler-Messages

Siehe: [../api/README.md](../api/README.md)

## Rate Limiting Configuration

```typescript
// Standard API (50 req/min)
import { standardApiLimiter } from '@/lib/rate-limiter';

// Auth Endpoints (10 req/min)
import { authLimiter } from '@/lib/rate-limiter';

// Sensitive Actions (5 req/hour)
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
```

## Security Headers

Alle API-Responses beinhalten:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security`
- `Permissions-Policy`

Siehe: `src/lib/security-headers.ts`

## Audit Logging

Security-Events werden strukturiert geloggt:

```typescript
import { logAuthSuccess, logAuthFailure, logRateLimitExceeded } from '@/lib/security-logger';

// Erfolgreiche Authentifizierung
logAuthSuccess(userId, { method: 'magic_link', ip });

// Fehlgeschlagene Authentifizierung
logAuthFailure({ reason: 'invalid_token', ip });

// Rate-Limit überschritten
logRateLimitExceeded(ip, endpoint, { limit, window });
```

Event-Typen:
- `AUTH_SUCCESS` / `AUTH_FAILURE`
- `PASSWORD_RESET`
- `PROFILE_UPDATE`
- `PERMISSION_DENIED`
- `RATE_LIMIT_EXCEEDED`
- `SUSPICIOUS_ACTIVITY`
- `API_ERROR`

## Security Best Practices

### Input Validation

```typescript
// Beispiel: Username-Validierung
if (username.length < 3 || username.length > 30) {
  return secureErrorResponse('Invalid username length', 400);
}

if (!/^[a-zA-Z0-9_]+$/.test(username)) {
  return secureErrorResponse('Invalid username format', 400);
}
```

### Secure Responses

```typescript
import { secureJsonResponse, secureErrorResponse } from '@/lib/security-headers';

// Erfolg
return secureJsonResponse({ data: safeUserData }, 200);

// Fehler
return secureErrorResponse('Not authenticated', 401);
```

## Known Security Issues

Bekannte Verbesserungspotentiale in den APIs finden Sie in:
- [../api/known-issues.md](../api/known-issues.md)

## Security Testing

- **Unit Tests**: Security-Feature-Tests in `src/**/*.test.ts`
- **E2E Tests**: Authentication-Flow-Tests
- **Security Scans**: `npm audit` in CI/CD-Pipeline

Siehe: [../testing/](../testing/)

## Vulnerability Reporting

Für Security-Vulnerabilities siehe: [../SECURITY.md](../SECURITY.md)

## Weitere Dokumentation

- **[Architecture Documentation](../architecture/)** — System-Architektur und Auth-Flow
- **[API Documentation](../api/)** — API-Security und Known Issues
- **[Development Documentation](../development/)** — CI/CD und Security-Scans

## Zukünftige Verbesserungen

1. **Rate-Limiting-Persistenz**: Migration zu D1/KV statt In-Memory
2. **Geolocation-Blocking**: IP-basiertes Blocking verdächtiger Regionen
3. **WAF-Integration**: Web Application Firewall für zusätzlichen Schutz
4. **Automated Security Scans**: OWASP ZAP oder Snyk in CI/CD
5. **2FA-Support**: Optional für Power-User
