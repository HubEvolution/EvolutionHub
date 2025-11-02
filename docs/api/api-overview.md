---
description: 'API-Architektur, Standards und Übersicht für Evolution Hub'
owner: 'API Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/pages/api, src/lib/api-middleware.ts'
testRefs: 'tests/integration/api, test-suite-v2/src/e2e'
---

<!-- markdownlint-disable MD051 -->

# API Overview

**Hauptdokument** für die API-Architektur und Standards von Evolution Hub. Dieses Dokument bietet eine umfassende Übersicht über die API-Landschaft, Architekturentscheidungen und grundlegende Standards.

## Architektur

### Tech-Stack

- **Backend**: Cloudflare Workers (via Astro 5)

- **Runtime**: Edge Runtime mit D1 (SQLite), R2 (Object Storage), KV (Key-Value Store)

- **API-Format**: RESTful JSON APIs mit standardisierten Response-Formaten

- **Authentifizierung**: Magic Link via Stytch (keine API-Keys erforderlich)

- **Middleware**: Einheitliche API-Middleware für Security, Rate-Limiting und Error-Handling

### Core-Prinzipien

1. **Einheitliche Response-Formate**: Alle APIs folgen dem konsistenten JSON-Format
1. **Security-First**: Automatische Security-Headers, CSRF-Schutz, Rate-Limiting
1. **Developer Experience**: Umfassende OpenAPI-Spezifikation, detaillierte Dokumentation
1. **Performance**: Edge-basierte Ausführung, optimierte Caching-Strategien
1. **Monitoring**: Automatische Request-Logging, Security-Event-Tracking

## API-Kategorien

### AI-Tools APIs

#### Prompt-Enhancer API

- **POST** `/api/prompt-enhance` - KI-gestützte Prompt-Optimierung

- **GET** `/api/prompt/usage` - Nutzungsstatistiken und Limits

#### AI-Image Enhancer API

- **POST** `/api/ai-image/generate` - Bildverbesserung via Replicate/Workers AI

- **GET** `/api/ai-image/jobs/{id}` - Job-Status und Ergebnisse

- **POST** `/api/ai-image/jobs/{id}/cancel` - Job-Abbruch

### Authentication & User APIs

#### Magic Link Authentication

- **POST** `/api/auth/magic/request` - Magic Link Request

- **GET** `/api/auth/callback` - OAuth/Magic Link Callback

- **GET** `/api/user/profile` - Benutzerprofil

#### Session Management

- **Cookies**: `__Host-session` (HttpOnly, Secure, SameSite=Strict)

- **Guest Mode**: Automatische `guest_id` Generierung für Rate-Limiting

### Business APIs

#### Billing & Subscription

- **POST** `/api/billing/session` - Stripe-Checkout-Session

- **GET** `/api/billing/sync` - Subscription-Synchronisation

- **POST** `/api/billing/credits` - Credit-Paket-Kauf

#### Comments System

- **POST** `/api/comments/create` - Kommentar erstellen

- **GET** `/api/comments` - Kommentare abrufen

- **PUT** `/api/comments/{id}` - Kommentar aktualisieren

- **DELETE** `/api/comments/{id}` - Kommentar löschen

## Standards & Konventionen

### Request/Response-Format

#### Standard Response Format

```json
{
  "success": true,
  "data": {},
  "error": {
    "type": "string",
    "message": "string",
    "details": {}
  }
}

```text

#### HTTP-Status-Codes

- **200**: Erfolgreiche Anfrage

- **201**: Ressource erfolgreich erstellt

- **400**: Validierungsfehler (Bad Request)

- **401**: Nicht authentifiziert

- **403**: Zugriff verweigert

- **404**: Ressource nicht gefunden

- **405**: Methode nicht erlaubt

- **429**: Rate limit erreicht

- **500**: Interner Serverfehler

### Content-Types

- **JSON APIs**: `application/json`

- **File Uploads**: `multipart/form-data`

- **Form Submissions**: `application/x-www-form-urlencoded`

### Authentifizierung

#### Magic Link Flow

1. Client sendet Email an `/api/auth/magic/request`
1. Server generiert Token und sendet Magic Link
1. User klickt Link → `/api/auth/callback` verifiziert Token
1. Session-Cookie wird gesetzt (`__Host-session`)
1. Redirect zu Zielseite

#### Session-Cookies

```http
Set-Cookie: __Host-session=eyJ...; Path=/; Secure; HttpOnly; SameSite=Strict
```

### Rate-Limiting

#### Standard-Limits

- **API Endpoints**: 30/min (Standard)

- **AI Generation**: 15/min (strenger)

- **Auth Endpoints**: 10/min (Auth)

- **Sensitive Actions**: 5/hour (kritisch)

#### Rate-Limit-Header

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1634567890

```text

#### 429 Response

```json
{
  "success": false,
  "error": {
    "type": "rate_limit",
    "message": "Zu viele Anfragen. Bitte versuchen Sie es später erneut."
  }
}
```

Header: `Retry-After: 60`

### Security

#### CSRF-Schutz

- **Same-Origin**: Automatische Validierung für unsichere Methoden

- **Double-Submit**: Optional via `X-CSRF-Token` Header

- **Cookie**: `csrf_token` (Lax, für Formulare)

#### Security-Headers (automatisch)

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()

```bash

#### Origin-Validierung

- **Allowed Origins**: Konfigurierbar via Environment-Variablen

- **Auto-Detection**: Request-Origin wird automatisch erlaubt

- **Environment**: `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`

## Development & Testing

### Lokale Entwicklung

#### Server-Start

```bash
# Worker-Dev (empfohlen)
npm run dev

# Nur UI (ohne Worker)
npm run dev:astro

# Worker-only
npm run dev:worker
```

#### API-Base-URLs

- **Development**: `http://127.0.0.1:8787`

- **Production**: `https://api.hub-evolution.com/v1`

- **Staging**: `https://staging.hub-evolution.com/v1`

### Testing

#### API-Tests

```bash

# Integration-Tests

npm run test:integration

# E2E-Tests (mit API-Testing)

npm run test:e2e

# Coverage-Report

npm run test:coverage

```bash

#### Test-Beispiele

```bash
# Prompt-Enhance testen
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{"input":{"text":"Test prompt"},"options":{"mode":"agent"}}' \
  http://127.0.0.1:8787/api/prompt-enhance

# Usage abrufen
curl http://127.0.0.1:8787/api/prompt/usage
```

### OpenAPI-Spezifikation

#### Vollständige Spezifikation

- **Location**: [`./openapi.yaml`](./openapi.yaml)

- **Version**: 1.0.0

- **Format**: OpenAPI 3.0.0

- **Tools**: Swagger UI, Postman, Insomnia kompatibel

#### Schema-Validierung

```bash

# OpenAPI validieren

npm run openapi:validate

# Schema gegen Tests prüfen

npx swagger-codegen validate -i docs/api/openapi.yaml

```text

## Deployment & Infrastructure

### Cloudflare Workers

#### Environment-Konfiguration

```toml
# wrangler.toml
[env.production.vars]
ALLOWED_ORIGINS = "https://hub-evolution.com,https://www.hub-evolution.com"
PUBLIC_PROMPT_ENHANCER_V1 = "true"
PUBLIC_PROMPT_TELEMETRY_V1 = "false"

# Bindings
[[env.production.d1_databases]]
database_name = "evolution-hub-prod"
database_id = "xxx"

[[env.production.r2_buckets]]
bucket_name = "evolution-hub-images"
binding = "R2_AI_IMAGES"
```

#### Build & Deploy

```bash

# Production-Build

npm run build:worker

# Staging-Build

npm run build:worker:staging

# Deploy

wrangler deploy --env production

```bash

### Monitoring & Observability

#### Request-Logging

- **Security Events**: Automatische Protokollierung verdächtiger Aktivitäten

- **API Access**: Strukturierte Logs für alle API-Zugriffe

- **Error Tracking**: Detaillierte Fehlerprotokollierung mit Stack-Traces

#### Health Checks

```bash
# API-Health
curl https://api.hub-evolution.com/api/health

# Auth-Health
curl https://api.hub-evolution.com/api/health/auth
```

## Migration & Versioning

### API-Versioning

- **Current**: v1 (kein Prefix in URLs)

- **Breaking Changes**: Neue Version (z.B. `/api/v2/`)

- **Backwards Compatibility**: Mindestens 6 Monate Support

### Feature-Flags

- **Prompt-Enhancer**: `PUBLIC_PROMPT_ENHANCER_V1`

- **Telemetry**: `PUBLIC_PROMPT_TELEMETRY_V1`

- **Debug Panel**: `PUBLIC_ENABLE_DEBUG_PANEL`

## Best Practices

### Client-Integration

#### Error-Handling

```typescript
// Empfohlene Error-Handling-Struktur
try {
  const response = await fetch('/api/prompt-enhance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(),
    },
    body: JSON.stringify({ input: { text: prompt } }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const result = await response.json();
  return result.data;
} catch (error) {
  // Rate-Limit: Retry mit Backoff
  if (error.status === 429) {
    await delay(retryAfter * 1000);
    return retry();
  }

  throw error;
}

```text

#### Rate-Limit-Handling

```typescript
// Rate-Limit-Header auswerten
const limit = response.headers.get('X-RateLimit-Limit');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (remaining === '0') {
  const retryAfter = reset - Date.now() / 1000;
  await delay(retryAfter * 1000);
}
```

### Security-Considerations

#### CSRF-Tokens

```typescript
// Client-seitige CSRF-Token-Generierung
function getCsrfToken(): string {
  let token = localStorage.getItem('csrf_token');
  if (!token) {
    token = generateRandomToken();
    localStorage.setItem('csrf_token', token);
  }
  return token;
}

```text

#### Origin-Validierung (2)

```typescript
// Automatische Origin-Ermittlung
const allowedOrigins = [
  window.location.origin,
  'https://hub-evolution.com',
  'https://www.hub-evolution.com',
];
```

## Troubleshooting

### Häufige Probleme

#### Rate-Limit-Fehler

```bash

# Rate-Limit-Status prüfen

curl -I http://127.0.0.1:8787/api/prompt/usage

# Response:

# X-RateLimit-Limit: 5

# X-RateLimit-Remaining: 0

# X-RateLimit-Reset: 1634567890

```bash

#### CSRF-Fehler

```bash
# CSRF-Token setzen
curl -H "X-CSRF-Token: $(cat /tmp/csrf_token)" \
     -H "Cookie: csrf_token=$(cat /tmp/csrf_token)" \
     -H "Origin: http://127.0.0.1:8787" \
     http://127.0.0.1:8787/api/prompt-enhance
```

#### Authentication-Fehler

```bash

# Session-Cookie prüfen

curl -H "Cookie: __Host-session=..." \
     http://127.0.0.1:8787/api/user/profile

```bash

### Debug-Modi

#### Debug-Logging aktivieren

```bash
# Environment-Variable setzen
PUBLIC_ENABLE_DEBUG_PANEL=true

# Debug-Logs abrufen
curl http://127.0.0.1:8787/api/debug/client-log
```

#### Request-Tracing

```bash

# Request-ID aus Response-Headern

curl -v http://127.0.0.1:8787/api/prompt-enhance 2>&1 | grep -i "request-id"

# Logs mit Request-ID filtern

# (in Cloudflare Workers Logs)

```text

## Support & Community

### Documentation

- **[OpenAPI Spec](./openapi.yaml)** - Maschinenlesbare API-Spezifikation

- **[API Guidelines](./api-guidelines.md)** - Best Practices für API-Entwicklung

- **[Error Handling](./error-handling.md)** - Detaillierte Fehlercodes und Lösungen

- **[Rate Limiting](./rate-limiting-api.md)** - Rate-Limiting-Strategien und Header

### Testing (2)

- **[Postman Collection](./postman-collection.json)** - Vollständige API-Test-Suite

- **[Curl Examples](./curl-examples.md)** - Kommandozeilen-API-Tests

- **[Integration Tests](./integration-tests.md)** - Automatisierte API-Tests

### Community

- **GitHub Issues**: Bug-Reports und Feature-Requests

- **Discord**: Community-Diskussionen und Support

- **Email**: <api-support@hub-evolution.com>

---

## Cross-Referenzen

- **[Architecture](../../architecture/)** - API-Middleware und Security-Architektur

- **[Development](../../development/)** - API-Tooling und lokale Entwicklung

- **[Security](../../security/)** - API-Security und Rate-Limiting

- **[Testing](../../testing/)** - API-Tests und Integration-Testing

## Ownership & Maintenance

**Owner**: API Team (Lead: API Lead)
**Update-Frequenz**: Bei neuen Endpunkten oder API-Änderungen
**Review-Prozess**: API-Review + OpenAPI-Validierung
**Eskalation**: Bei API-Design-Konflikten → Architecture Team

---

*Zuletzt aktualisiert: 2025-10-27*

```text
