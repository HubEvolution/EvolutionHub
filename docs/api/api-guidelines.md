---
description: 'Best Practices und Richtlinien für die API-Entwicklung bei Evolution Hub'
owner: 'API Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/lib/api-middleware.ts, src/lib/rate-limiter.ts'
testRefs: 'tests/integration/api'
---

<!-- markdownlint-disable MD051 -->

# API Guidelines

**Best Practices** für die API-Entwicklung bei Evolution Hub. Dieses Dokument definiert Standards, Konventionen und bewährte Methoden für die Entwicklung robuster, sicherer und wartbarer APIs.

## Grundprinzipien

### 1. Einheitlichkeit (Consistency)

#### Response-Format

Alle APIs folgen dem standardisierten Response-Format:

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

**✅ Do:**

```typescript
// Verwende die standardisierten Helper-Funktionen
import { createApiSuccess, createApiError } from '@/lib/api-middleware';

export async function GET() {
  try {
    const data = await getUserData();
    return createApiSuccess(data);
  } catch (error) {
    return createApiError('server_error', 'Failed to fetch user data');
  }
}
```

**❌ Don't:**

```typescript
// Vermeide benutzerdefinierte Response-Formate
return new Response(JSON.stringify({ user: data }), {
  headers: { 'Content-Type': 'application/json' }
});

```text

#### HTTP-Status-Codes

Verwende semantisch korrekte Status-Codes:

- **200**: Erfolgreiche GET-Anfragen

- **201**: Erfolgreiche POST-Anfragen (Ressource erstellt)

- **204**: Erfolgreiche DELETE-Anfragen (kein Content)

- **400**: Validierungsfehler

- **401**: Nicht authentifiziert

- **403**: Zugriff verweigert

- **404**: Ressource nicht gefunden

- **405**: Methode nicht erlaubt

- **429**: Rate limit erreicht

- **500**: Server-Fehler

### 2. Sicherheit (Security)

#### Middleware-Nutzung

Verwende immer die entsprechende Middleware für API-Endpunkte:

```typescript
// Für öffentliche APIs
import { withApiMiddleware } from '@/lib/api-middleware';

export const GET = withApiMiddleware(async (context) => {
  // Handler-Logik
  return createApiSuccess(data);
});

// Für authentifizierte APIs
import { withAuthApiMiddleware } from '@/lib/api-middleware';

export const POST = withAuthApiMiddleware(async (context) => {
  // Nur authentifizierte Benutzer
  return createApiSuccess(data);
}, {
  rateLimiter: aiGenerateLimiter, // Custom Rate-Limiting
  enforceCsrfToken: true,        // CSRF-Schutz
});
```

#### Rate-Limiting-Strategien

Wähle den passenden Limiter basierend auf dem Endpunkt-Typ:

```typescript
import {
  apiRateLimiter,      // 30/min - Standard-API
  authLimiter,         // 10/min - Authentifizierung
  aiGenerateLimiter,   // 15/min - AI-Generierung
  aiJobsLimiter,       // 10/min - AI-Job-Management
  sensitiveActionLimiter // 5/hour - Kritische Aktionen
} from '@/lib/rate-limiter';

// Beispiel: Prompt-Enhancer
export const POST = withApiMiddleware(async (context) => {
  return createApiSuccess(enhancedPrompt);
}, {
  rateLimiter: aiGenerateLimiter,
  enforceCsrfToken: true,
});

```text

#### CSRF-Schutz

Für unsichere Methoden (POST, PUT, PATCH, DELETE):

```typescript
// Automatisch aktiviert für alle unsicheren Methoden
export const POST = withApiMiddleware(async (context) => {
  // Same-Origin-Check wird automatisch durchgeführt
  return createApiSuccess(data);
});

// Für zusätzlichen Double-Submit-Schutz
export const DELETE = withApiMiddleware(async (context) => {
  return createApiSuccess(result);
}, {
  enforceCsrfToken: true, // X-CSRF-Token Header erforderlich
});
```

### 3. Error-Handling

#### Strukturierte Fehler

Verwende typisierte Fehler mit aussagekräftigen Meldungen:

```typescript
import { createApiError } from '@/lib/api-middleware';
import type { ApiErrorType } from '@/lib/api-middleware';

// Typisierte Fehler
export async function validateUserInput(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Invalid input'), {
      apiErrorType: 'validation_error' as ApiErrorType
    });
  }

  const data = input as Record<string, unknown>;
  if (!data.email || !data.email.includes('@')) {
    throw Object.assign(new Error('Valid email required'), {
      apiErrorType: 'validation_error' as ApiErrorType
    });
  }
}

// Im Handler
export const POST = withApiMiddleware(async (context) => {
  try {
    const body = await context.request.json();
    await validateUserInput(body);
    const result = await processData(body);
    return createApiSuccess(result);
  } catch (error) {
    // Middleware wandelt automatisch in ApiError um
    throw error;
  }
});

```text

#### Validierungsfehler

Gib spezifische Validierungshinweise:

```typescript
// Detaillierte Validierungsfehler
function validatePromptEnhanceInput(input: unknown) {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
  } else {
    const data = input as Record<string, unknown>;

    if (!data.text || typeof data.text !== 'string') {
      errors.push('Text field is required and must be a string');
    } else if (data.text.length > 5000) {
      errors.push('Text must not exceed 5000 characters');
    }

    if (data.mode && !['agent', 'concise'].includes(data.mode as string)) {
      errors.push('Mode must be either "agent" or "concise"');
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(`Validation failed: ${errors.join(', ')}`), {
      apiErrorType: 'validation_error' as ApiErrorType,
      details: { errors }
    });
  }
}
```

### 4. Authentifizierung & Autorisierung

#### Magic Link Flow

Implementiere korrekte Authentifizierung:

```typescript
// Prüfe Authentifizierung
export const GET = withAuthApiMiddleware(async (context) => {
  // context.locals.user ist verfügbar
  const user = context.locals.user;

  if (!user?.id) {
    throw Object.assign(new Error('User ID required'), {
      apiErrorType: 'auth_error' as ApiErrorType
    });
  }

  const data = await getUserData(user.id);
  return createApiSuccess(data);
});

// Für optionale Authentifizierung
export const GET = withApiMiddleware(async (context) => {
  const user = context.locals.user; // Optional

  let data;
  if (user?.id) {
    data = await getPersonalizedData(user.id);
  } else {
    data = await getPublicData();
  }

  return createApiSuccess(data);
});

```text

#### Guest-Mode

Unterstütze anonyme Nutzung wo sinnvoll:

```typescript
// Guest-Zugang mit Limits
export const POST = withApiMiddleware(async (context) => {
  // Guest-ID wird automatisch aus Cookie gelesen
  const guestId = getGuestId(context);
  const usage = await checkUsage(guestId, 'guest');

  if (usage.exceeded) {
    return createApiError('forbidden', 'Guest limit exceeded');
  }

  const result = await processRequest(guestId);
  return createApiSuccess(result);
});
```

### 5. Performance & Skalierbarkeit

#### Edge-Optimierung

Nutze Cloudflare Workers Features:

```typescript
// Cache-Strategien
export const GET = withApiMiddleware(async (context) => {
  const cacheKey = `user:${context.locals.user?.id}`;
  const cached = await context.locals.runtime?.env?.KV?.get(cacheKey);

  if (cached) {
    return createApiSuccess(JSON.parse(cached));
  }

  const data = await fetchFreshData();
  // Cache für 5 Minuten
  await context.locals.runtime?.env?.KV?.put(cacheKey, JSON.stringify(data), {
    expirationTtl: 300
  });

  return createApiSuccess(data);
});

```text

#### Datenbank-Optimierung

Effiziente Queries für D1:

```typescript
// Index-gestützte Queries
export async function getUserComments(userId: string, limit: number = 20) {
  const query = `
    SELECT * FROM comments
    WHERE user_id = ? AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT ?
  `;

  const result = await context.locals.runtime?.env?.DB
    .prepare(query)
    .bind(userId, limit)
    .all();

  return result.results;
}
```

### 6. Testing

#### Unit-Tests

Teste API-Handler isoliert:

```typescript
// tests/api/prompt-enhance.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createApiSuccess, createApiError } from '@/lib/api-middleware';

describe('/api/prompt-enhance', () => {
  it('should enhance prompt successfully', async () => {
    const mockContext = createMockContext({
      body: { input: { text: 'Test prompt' } }
    });

    const response = await GET(mockContext);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('enhanced');
  });

  it('should handle validation errors', async () => {
    const mockContext = createMockContext({
      body: { input: { text: '' } } // Invalid
    });

    const response = await GET(mockContext);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.type).toBe('validation_error');
  });
});

```text

#### Integration-Tests

Teste vollständige API-Flows:

```typescript
// tests/integration/prompt-enhance.test.ts
describe('Prompt Enhance Integration', () => {
  it('should handle complete flow with rate limiting', async () => {
    // Test multiple requests to trigger rate limiting
    const requests = Array(20).fill(null).map(() =>
      fetch('/api/prompt-enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-token',
        },
        body: JSON.stringify({
          input: { text: 'Test prompt' }
        })
      })
    );

    const responses = await Promise.all(requests);

    // Should have some 429 responses
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### 7. Dokumentation

#### OpenAPI-Spezifikation

Dokumentiere alle Endpunkte in der OpenAPI-Spec:

```yaml
/api/prompt-enhance:
  post:
    summary: Enhance prompt
    description: Transforms raw text into a structured, AI-ready prompt
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              input:
                type: object
                properties:
                  text:
                    type: string
                    description: The raw text to enhance
    responses:
      '200':
        description: Successful enhancement
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: object
                  properties:
                    enhanced:
                      $ref: '#/components/schemas/EnhancedPrompt'

```text

#### Code-Kommentare

Dokumentiere komplexe Business-Logik:

```typescript
/**
 * Verarbeitet eine Prompt-Enhancement-Anfrage
 *
 * Workflow:
 * 1. Validiert Input-Daten
 * 2. Prüft Rate-Limits und Usage
 * 3. Ruft AI-Service auf
 * 4. Verarbeitet und bereinigt Response
 * 5. Aktualisiert Usage-Statistiken
 *
 * @param context - Astro API Context
 * @returns Promise<Response> - JSON Response mit enhanced prompt
 */
export const POST = withApiMiddleware(async (context) => {
  // Implementation...
});
```

### 8. Monitoring & Logging

#### Strukturiertes Logging

Verwende strukturierte Logs für bessere Nachverfolgung:

```typescript
import { loggerFactory } from '@/server/utils/logger-factory';

const logger = loggerFactory.createLogger('prompt-enhancer');
const securityLogger = loggerFactory.createSecurityLogger();

export const POST = withApiMiddleware(async (context) => {
  const startTime = Date.now();
  const requestId = context.request.headers.get('x-request-id') || 'unknown';

  try {
    logger.info('Processing prompt enhancement', {
      requestId,
      userId: context.locals.user?.id,
      hasFiles: false, // aus request body
    });

    const result = await enhancePrompt(context);
    const duration = Date.now() - startTime;

    logger.info('Prompt enhancement completed', {
      requestId,
      duration,
      success: true,
    });

    return createApiSuccess(result);
  } catch (error) {
    const duration = Date.now() - startTime;

    securityLogger.logApiError({
      endpoint: '/api/prompt-enhance',
      method: 'POST',
      error: error.message,
      duration,
      requestId,
    }, {
      userId: context.locals.user?.id,
      ipAddress: context.clientAddress,
    });

    throw error;
  }
});

```text

#### Metriken

Tracke wichtige Metriken:

```typescript
// Response-Time-Metriken
const duration = Date.now() - startTime;
if (duration > 5000) {
  logger.warn('Slow API response', {
    endpoint: '/api/prompt-enhance',
    duration,
    requestId,
  });
}

// Usage-Metriken
await trackUsage({
  endpoint: '/api/prompt-enhance',
  userId: context.locals.user?.id || 'guest',
  tokens: result.usage.tokens,
  duration,
});
```

### 9. Deployment & Versioning

#### Environment-Konfiguration

Verwende environment-spezifische Konfigurationen:

```typescript
// src/config/api.ts
export const API_CONFIG = {
  development: {
    maxPromptLength: 1000,
    rateLimit: 10,
    enableDebug: true,
  },
  staging: {
    maxPromptLength: 2000,
    rateLimit: 20,
    enableDebug: true,
  },
  production: {
    maxPromptLength: 5000,
    rateLimit: 30,
    enableDebug: false,
  },
};

export function getApiConfig() {
  const env = process.env.NODE_ENV || 'development';
  return API_CONFIG[env] || API_CONFIG.development;
}

```text

#### Feature-Flags

Implementiere Feature-Flags für kontrolliertes Rollout:

```typescript
// Feature-Flag für neue Funktionalität
const ENABLE_ADVANCED_SAFETY = process.env.PUBLIC_ADVANCED_SAFETY === 'true';

export const POST = withApiMiddleware(async (context) => {
  const result = await enhancePrompt(context);

  if (ENABLE_ADVANCED_SAFETY) {
    result.safetyReport = await advancedSafetyCheck(result.enhanced);
  }

  return createApiSuccess(result);
});
```

### 10. Client-Integration

#### SDK-Patterns

Entwirf APIs für einfache Client-Integration:

```typescript
// Client-seitiger Helper
export class ApiClient {
  private baseUrl: string;
  private csrfToken: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.csrfToken = this.getCsrfToken();
  }

  async enhancePrompt(text: string, options?: EnhanceOptions) {
    const response = await fetch(`${this.baseUrl}/api/prompt-enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.csrfToken,
      },
      credentials: 'include', // Für Session-Cookies
      body: JSON.stringify({
        input: { text },
        options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.message, error.error.type);
    }

    return response.json();
  }

  private getCsrfToken(): string {
    // CSRF-Token aus Cookie oder generieren
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='))
      ?.split('=')[1] || '';
  }
}

```text

#### Error-Handling für Clients

Implementiere robustes Error-Handling:

```typescript
// Client-seitiges Error-Handling
export class ApiError extends Error {
  constructor(
    message: string,
    public type: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, data: any): ApiError {
    return new ApiError(
      data.error?.message || 'API Error',
      data.error?.type || 'unknown_error',
      response.status
    );
  }

  isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }

  getRetryDelay(): number {
    if (this.status === 429) {
      return parseInt(this.message.match(/retry after (\d+)/i)?.[1] || '60');
    }
    return 1000; // 1 Sekunde für Server-Fehler
  }
}
```

## Code-Style & Konventionen

### Datei-Organisation

Organisiere API-Code logisch:

```text
src/pages/api/
├── auth/                    # Authentifizierung
│   ├── magic/
│   └── callback.ts
├── prompt/                  # Prompt-Enhancer
│   ├── enhance.ts
│   └── usage.ts
├── ai-image/               # AI-Bild-Tools
│   ├── generate.ts
│   ├── jobs/
│   └── usage.ts
└── admin/                  # Admin-Funktionen
    ├── users/
    └── metrics.ts
```

### Naming-Konventionen

- **Dateien**: `kebab-case.ts` (z.B. `prompt-enhance.ts`)

- **Funktionen**: `camelCase` (z.B. `enhancePrompt`)

- **Typen**: `PascalCase` (z.B. `EnhancedPrompt`)

- **Konstanten**: `SCREAMING_SNAKE_CASE` (z.B. `MAX_PROMPT_LENGTH`)

### Import-Organisation

Gruppiere Imports logisch:

```typescript
// 1. Node.js Standard-Library
import { readFileSync } from 'fs';

// 2. Third-Party Libraries
import { z } from 'zod';

// 3. Astro Framework
import type { APIContext } from 'astro';

// 4. Internal Libraries (alphabetisch)
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { loggerFactory } from '@/server/utils/logger-factory';

// 5. Local Utilities (relativ)
import { validateInput } from '../utils/validation';

```text

## Qualitätsstandards

### Code-Coverage

Ziele für hohe Test-Coverage ab:

```json
{
  "coverage": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  }
}
```

### Performance-Benchmarks

Definiere Performance-Ziele:

- **Response-Time**: <200ms für einfache APIs

- **AI-APIs**: <5s für Generierung

- **Error-Rate**: <0.1%

- **Uptime**: >99.9%

### Security-Review

Führe Security-Reviews für neue APIs durch:

- [ ] Input-Validierung implementiert

- [ ] SQL-Injection-Schutz (D1 parameterized queries)

- [ ] XSS-Schutz (Output-Encoding)

- [ ] CSRF-Schutz aktiviert

- [ ] Rate-Limiting konfiguriert

- [ ] Authentifizierung korrekt

- [ ] Logging implementiert

- [ ] Secrets nicht hardcoded

## Troubleshooting

### Häufige Probleme

#### Rate-Limiting zu streng

```typescript
// Passe Rate-Limits an
export const POST = withApiMiddleware(async (context) => {
  return createApiSuccess(data);
}, {
  rateLimiter: (context) => {
    // Custom Logic für höhere Limits bei Premium-Usern
    const user = context.locals.user;
    if (user?.subscription === 'premium') {
      return standardApiLimiter(context); // 50/min statt 30/min
    }
    return apiRateLimiter(context); // 30/min
  }
});

```text

#### CSRF-Fehler in Tests

```typescript
// Test-Setup mit korrekten Headers
const testContext = {
  request: new Request('http://localhost/api/test', {
    method: 'POST',
    headers: {
      'Origin': 'http://localhost',
      'X-CSRF-Token': 'test-token',
    },
  }),
  locals: { user: { id: 'test-user' } },
  cookies: new Map([['csrf_token', 'test-token']]),
};
```

#### Performance-Probleme

```typescript
// Performance-Optimierung
export const GET = withApiMiddleware(async (context) => {
  // 1. Cache prüfen
  const cacheKey = `data:${hash(context.request.url)}`;
  const cached = await context.locals.runtime?.env?.KV?.get(cacheKey);

  if (cached) {
    return createApiSuccess(JSON.parse(cached));
  }

  // 2. Parallele Verarbeitung
  const [data1, data2] = await Promise.all([
    fetchData1(),
    fetchData2(),
  ]);

  // 3. Streaming für große Responses
  if (isLargeResponse(data1, data2)) {
    return new Response(createStream(data1, data2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = combineData(data1, data2);
  return createApiSuccess(result);
});

```text

## Migration & Wartung

### API-Deprecation

Markiere veraltete APIs korrekt:

```typescript
/**
 * @deprecated Use /api/v2/prompt-enhance instead
 * This endpoint will be removed in v2.0
 */
export const POST = withApiMiddleware(async (context) => {
  // Add deprecation warning
  const warning = 'This API endpoint is deprecated. Please migrate to v2.';

  const result = await enhancePrompt(context);
  return createApiSuccess(result, 200, {
    'Warning': warning,
    'Sunset': '2025-06-01'
  });
});
```

### Breaking Changes

Dokumentiere Breaking Changes:

```typescript
/**
 * BREAKING CHANGE in v2.0:
 * - `mode` parameter is now required
 * - Response format changed from { enhanced: string } to { enhanced: { ... } }
 * - Rate limits increased from 10/min to 30/min
 */

```text

## Ressourcen

### Weiterführende Dokumentation

- **[API Overview](./api-overview.md)** — Architektur und Standards

- **[Error Handling](./error-handling.md)** — Detaillierte Fehlerbehandlung

- **[Rate Limiting](./rate-limiting-api.md)** — Rate-Limiting-Strategien

- **[OpenAPI Spec](./openapi.yaml)** — Maschinenlesbare Spezifikation

### Tools & Libraries

- **[API Middleware](../../lib/api-middleware.ts)** — Core Middleware-Implementierung

- **[Rate Limiter](../../lib/rate-limiter.ts)** — Rate-Limiting-Implementierung

- **[Validation Utils](../../utils/validation.ts)** — Validierungshilfsmittel

### Testing

- **[API Test Utils](../../tests/utils/api-helpers.ts)** — Test-Hilfsmittel

- **[Mock Context](../../tests/utils/mock-context.ts)** — Mock-Implementierungen

---

## Cross-Referenzen

- **[Architecture](../architecture/)** — API-Middleware, Security-Header, CSP

- **[Development](../development/)** — Lokales Setup, Tooling, Scripts

- **[Security](../security/)** — Security-Policies, Incident-Response

- **[Testing](../testing/)** — Integrationstests, E2E, Coverage

## Ownership & Maintenance

**Owner**: API Team (Lead: API Lead)
**Update-Frequenz**: Bei API-Änderungen oder neuen Best Practices
**Review-Prozess**: Code-Review + Security-Review
**Eskalation**: Bei Konflikten zwischen Guidelines → Architecture Team

---

*Zuletzt aktualisiert: 2025-10-27*

```text
