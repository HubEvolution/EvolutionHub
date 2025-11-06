---
description: 'Sicherheits-Features, Best Practices und Security-Architektur für Evolution Hub'
owner: 'Security Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/middleware.ts, src/lib/api-middleware.ts, src/lib/rate-limiter.ts'
testRefs: 'tests/integration/security, test-suite-v2/src/e2e/security'
---

<!-- markdownlint-disable MD051 -->

# Security Documentation

**Scope** — Diese Kategorie dokumentiert alle Sicherheits-Features, Best Practices und Security-Architektur von Evolution Hub. Umfasst Rate-Limiting, Security-Headers, Authentifizierung, Input-Validierung und Audit-Logging. Zielgruppe sind Security-Ingenieure, Entwickler und Compliance-Verantwortliche. Nicht enthalten: Operative Security (→ Ops-Kategorie) oder UI/UX-Security (→ Frontend-Kategorie).

## Primärdokumente

- **[Implementierte Sicherheitsverbesserungen](./improvements.md)** — Überblick über bereits umgesetzte Hardening-Maßnahmen (User-APIs, Logging, Header-Setup)

- **[Rate Limiting](./rate_limiting.md)** — Presets, Implementierungsdetails und zukünftige Verbesserungen

- **[Security Headers](./security_headers.md)** — Aktive HTTP-Sicherheitsheader inkl. CSP/HSTS/Permissions-Policy

## Sekundär-/Spezialdokumente (geplant)

Die folgenden Themen sind aktuell noch nicht als eigenständige Dokumente vorhanden. Sie bleiben hier als Roadmap erhalten:

- **Security Overview** — Gesamtarchitektur (Middleware, Auth, API)
- **Auth/API Security** — Detailtiefe zu `withAuthApiMiddleware`, CSRF, Origin-Checks
- **Input Validation & Sanitization** — Zod-/Server-Validierung & Sanitization-Strategien
- **Audit Logging** — Strukturierte Security-Logs & Incident Response Workflow
- **CSP/Permissions/HSTS Deep Dive** — Ergänzende Beispiele je Umgebung
- **Rate-Limiter Presets** — Matrix aller aktiven Limits inkl. Tool-Spezifika

TODO: Sobald neue Kapitel erstellt werden, bitte hier verlinken und die Roadmap kürzen.

## Cross-Referenzen

- **[Architecture](../architecture/)** — Security-Architektur und Middleware-Integration

- **[Development](../development/)** — Security-Tooling und CI-Security-Gates

- **[API](../api/)** — API-Security und Middleware-Standards

- **[Testing](../testing/)** — Security-Tests und Penetration-Testing

## Ownership & Maintenance

**Owner:** Security Team (Lead: Security Lead)
**Update-Frequenz:** Bei Security-relevanten Code-Änderungen (Middleware, Auth, API)
**Review-Prozess:** Security-Review + Code-Review durch Entwickler
**Eskalation:** Bei Security-Vorfällen → Incident-Response-Team

## Standards & Konventionen

- **Security-First:** Alle neuen Features durchlaufen Security-Review

- **Headers:** Automatisch via Middleware, keine manuellen Header-Sets

- **Rate-Limiting:** Einheitliche Presets via `src/lib/rate-limiter.ts`

- **Logging:** Strukturiert und PII-frei, siehe Audit-Logging-Dokumentation

- **Updates:** OWASP-Top-10-Compliance, regelmäßige Security-Scans

## Bekannte Lücken

- TODO: Vollständige Penetration-Test-Dokumentation

- TODO: Security-Incident-Response-Plan

- TODO: Compliance-Framework (GDPR, SOC2) Dokumentation

## Übersicht

Evolution Hub implementiert mehrschichtige Sicherheitsmaßnahmen:

- **Authentication**: Stytch Magic Link (passwortlos)

- **Rate Limiting**: IP-basiert für alle kritischen Endpunkte

- **Security Headers**: CSP, HSTS, CORS, etc.

- **Audit Logging**: Zentrale Security-Event-Protokollierung

- **Input Validation**: Strenge Validierung aller Benutzereingaben

Siehe auch: [../SECURITY.md](../SECURITY.md) für Security-Policy und Vulnerability-Reporting

## Implementierte Sicherheits-Features

### Core Security Systems (2)

- **[Security Improvements](./improvements.md)** — **Hauptdokument** für implementierte Sicherheitsverbesserungen

  - User-API Sicherheit (Whitelist-Ansatz, Validierung)

  - Rate-Limiting-System (`src/lib/rate-limiter.ts`)

  - Security-Headers-System (`src/lib/security-headers.ts`)

  - Security-Audit-Logging (`src/lib/security-logger.ts`)

  - Integration-Beispiele

  - Empfehlungen für zukünftige Verbesserungen

### Detailed Documentation (2)

- **[Rate Limiting](./rate_limiting.md)** — Rate-Limiting-Konfiguration und -Implementierung

  - In-Memory-Store

  - Konfigurierbare Limiter (standard, auth, sensitive)

  - 429-Response-Format

- **[Security Headers](./security_headers.md)** — HTTP-Security-Headers-Konfiguration

  - Content-Security-Policy (CSP)

  - HSTS, X-Frame-Options, etc.

  - Anwendung in API-Responses

## Security-Architektur (2)

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

## Rate Limiting Configuration (2)

```typescript
// Standard API (50 req/min)
import { standardApiLimiter } from '@/lib/rate-limiter';

// Auth Endpoints (10 req/min)
import { authLimiter } from '@/lib/rate-limiter';

// Sensitive Actions (5 req/hour)
import { sensitiveActionLimiter } from '@/lib/rate-limiter';

```text

## Security Headers (2)

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

```text

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
1. **Geolocation-Blocking**: IP-basiertes Blocking verdächtiger Regionen
1. **WAF-Integration**: Web Application Firewall für zusätzlichen Schutz
1. **Automated Security Scans**: OWASP ZAP oder Snyk in CI/CD
1. **2FA-Support**: Optional für Power-User
