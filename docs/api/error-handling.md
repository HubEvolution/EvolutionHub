---
description: 'API-Fehlercodes, Response-Formate und Error-Handling-Strategien für Evolution Hub'
owner: 'API Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/lib/api-middleware.ts, src/lib/rate-limiter.ts'
testRefs: 'tests/integration/api/error-handling'
---

# Error Handling

**Umfassende Dokumentation** für API-Fehlercodes, Response-Formate und Error-Handling-Strategien in Evolution Hub. Dieses Dokument erklärt die standardisierten Fehlerformate, HTTP-Status-Codes und bewährte Methoden für robuste Fehlerbehandlung.

## Standard Response-Format

Alle API-Responses folgen einem einheitlichen Format, sowohl für erfolgreiche als auch fehlgeschlagene Anfragen:

### Erfolgs-Response
```json
{
  "success": true,
  "data": {
    // Anfragespezifische Daten
  }
}
```

### Fehler-Response
```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Ungültige Eingabedaten",
    "details": {
      // Zusätzliche Informationen (optional)
    }
  }
}
```

## HTTP-Status-Codes

Evolution Hub verwendet semantisch korrekte HTTP-Status-Codes:

### 2xx - Erfolgreiche Responses

| Code | Bedeutung | Verwendung |
|------|-----------|------------|
| **200** | OK | Standard-Erfolg für GET, PUT, PATCH |
| **201** | Created | Ressource erfolgreich erstellt (POST) |
| **204** | No Content | Erfolgreiche Aktion ohne Response-Body |

### 4xx - Client-Fehler

| Code | Bedeutung | Verwendung | Error-Type |
|------|-----------|------------|------------|
| **400** | Bad Request | Validierungsfehler, ungültige Parameter | `validation_error` |
| **401** | Unauthorized | Nicht authentifiziert | `auth_error` |
| **403** | Forbidden | Zugriff verweigert | `forbidden` |
| **404** | Not Found | Ressource nicht gefunden | `not_found` |
| **405** | Method Not Allowed | HTTP-Methode nicht unterstützt | `method_not_allowed` |
| **429** | Too Many Requests | Rate-Limit überschritten | `rate_limit` |

### 5xx - Server-Fehler

| Code | Bedeutung | Verwendung | Error-Type |
|------|-----------|------------|------------|
| **500** | Internal Server Error | Unerwartete Server-Fehler | `server_error` |
| **502** | Bad Gateway | Upstream-Service nicht verfügbar | `server_error` |
| **503** | Service Unavailable | Service temporär nicht verfügbar | `server_error` |

## Error-Types

### Standardisierte Error-Types

Jeder Fehler hat einen spezifischen `type`, der die Art des Fehlers kategorisiert:

#### `validation_error` (400)
Validierungsfehler in Benutzereingaben.

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Text field is required and must be a string",
    "details": {
      "field": "text",
      "expected": "string",
      "received": "null"
    }
  }
}
```

**Verwendung:**
- Fehlende erforderliche Felder
- Falsche Datentypen
- Werte außerhalb gültiger Bereiche
- Format-Fehler (z.B. ungültige Email)

#### `auth_error` (401)
Authentifizierungsfehler.

```json
{
  "success": false,
  "error": {
    "type": "auth_error",
    "message": "Authentifizierung fehlgeschlagen",
    "details": {
      "reason": "invalid_session"
    }
  }
}
```

**Verwendung:**
- Ungültige oder abgelaufene Session
- Fehlende Authentifizierung
- Ungültige Credentials

#### `forbidden` (403)
Zugriff verweigert.

```json
{
  "success": false,
  "error": {
    "type": "forbidden",
    "message": "Zugriff verweigert",
    "details": {
      "reason": "insufficient_permissions",
      "requiredRole": "admin"
    }
  }
}
```

**Verwendung:**
- Unzureichende Berechtigungen
- Ressourcen-Zugriff verweigert
- Feature nicht verfügbar für aktuellen Plan

#### `not_found` (404)
Ressource nicht gefunden.

```json
{
  "success": false,
  "error": {
    "type": "not_found",
    "message": "Ressource nicht gefunden",
    "details": {
      "resource": "user",
      "id": "user_123"
    }
  }
}
```

**Verwendung:**
- Nicht existierende Ressourcen
- Gelöschte oder verschobene Ressourcen

#### `rate_limit` (429)
Rate-Limit überschritten.

```json
{
  "success": false,
  "error": {
    "type": "rate_limit",
    "message": "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
    "details": {
      "limit": 30,
      "remaining": 0,
      "resetIn": 45,
      "retryAfter": 60
    }
  }
}
```

**Verwendung:**
- Zu viele Anfragen pro Zeitfenster
- DDoS-Schutz aktiviert

#### `method_not_allowed` (405)
HTTP-Methode nicht unterstützt.

```json
{
  "success": false,
  "error": {
    "type": "method_not_allowed",
    "message": "DELETE method not allowed for this resource",
    "details": {
      "allowedMethods": ["GET", "POST", "PUT"]
    }
  }
}
```

**Verwendung:**
- Falsche HTTP-Methode für Endpunkt
- Deaktivierte Methoden

#### `server_error` (500)
Interne Server-Fehler.

```json
{
  "success": false,
  "error": {
    "type": "server_error",
    "message": "Interner Serverfehler",
    "details": {
      "service": "ai-provider",
      "errorId": "err_abc123"
    }
  }
}
```

**Verwendung:**
- Unerwartete Server-Fehler
- Upstream-Service-Fehler
- Datenbank-Verbindungsfehler

#### `db_error` (500)
Datenbank-spezifische Fehler.

```json
{
  "success": false,
  "error": {
    "type": "db_error",
    "message": "Datenbankfehler",
    "details": {
      "operation": "insert",
      "table": "users"
    }
  }
}
```

**Verwendung:**
- Datenbank-Verbindungsfehler
- Constraint-Verletzungen
- Query-Fehler

#### `subscription_active` (400)
Abonnement-bezogene Fehler.

```json
{
  "success": false,
  "error": {
    "type": "subscription_active",
    "message": "Aktives Abonnement verhindert die Aktion",
    "details": {
      "currentPlan": "premium",
      "action": "downgrade"
    }
  }
}
```

**Verwendung:**
- Abonnement-Änderungen blockiert
- Plan-Downgrades verhindert

## Client-Integration

### Error-Handling in JavaScript/TypeScript

#### Basis-Error-Klasse
```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public type: string,
    public status: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, data: any): ApiError {
    return new ApiError(
      data.error?.message || 'API Error',
      data.error?.type || 'unknown_error',
      response.status,
      data.error?.details
    );
  }

  // Hilfsmethoden für spezifische Error-Types
  isValidationError(): boolean {
    return this.type === 'validation_error';
  }

  isAuthError(): boolean {
    return this.type === 'auth_error';
  }

  isRateLimitError(): boolean {
    return this.type === 'rate_limit';
  }

  isRetryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }

  getRetryDelay(): number {
    if (this.type === 'rate_limit') {
      return this.details?.retryAfter || 60;
    }
    return this.status >= 500 ? 1000 : 0;
  }
}
```

#### Error-Handler
```typescript
async function handleApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw ApiError.fromResponse(response, data);
  }

  if (!data.success) {
    throw ApiError.fromResponse(response, data);
  }

  return data.data;
}

// Verwendung
async function enhancePrompt(text: string) {
  try {
    const response = await fetch('/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text } }),
    });

    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.type) {
        case 'validation_error':
          showValidationError(error.message);
          break;
        case 'rate_limit':
          showRateLimitError(error);
          break;
        case 'auth_error':
          redirectToLogin();
          break;
        default:
          showGenericError(error.message);
      }
    }
    throw error;
  }
}
```

### Retry-Logik

#### Automatische Wiederholung
```typescript
async function apiRequestWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<T> {
  let lastError: ApiError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return await handleApiResponse<T>(response);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      lastError = error;

      // Nicht wiederholbare Fehler
      if (!error.isRetryable() || attempt === maxRetries) {
        throw error;
      }

      // Wartezeit berechnen
      const delay = error.getRetryDelay() * Math.pow(2, attempt); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

#### Smart Retry mit Jitter
```typescript
function calculateRetryDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% Jitter
  return exponentialDelay + jitter;
}

async function retryWithJitter<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts - 1) {
        throw error;
      }

      const delay = calculateRetryDelay(attempt, 1000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### Error-Logging

#### Client-seitiges Logging
```typescript
function logApiError(error: ApiError, context: Record<string, any> = {}) {
  const errorInfo = {
    type: error.type,
    message: error.message,
    status: error.status,
    details: error.details,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...context,
  };

  // Send to logging service
  if (typeof gtag !== 'undefined') {
    gtag('event', 'exception', {
      description: `API Error: ${error.type}`,
      fatal: false,
      ...errorInfo,
    });
  }

  // Console logging für Development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', errorInfo);
  }
}
```

## Server-seitige Implementierung

### Error-Handler-Middleware

#### Automatische Error-Verarbeitung
```typescript
// src/lib/api-middleware.ts
export function withApiMiddleware(
  handler: ApiHandler,
  options: ApiMiddlewareOptions = {}
): ApiHandler {
  return async (context: APIContext) => {
    try {
      // Handler ausführen
      const response = await handler(context);
      return applySecurityHeaders(response);
    } catch (error) {
      // Automatische Error-Verarbeitung
      return handleError(context, error, options);
    }
  };
}

function handleError(
  context: APIContext,
  error: unknown,
  options: ApiMiddlewareOptions
): Response {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Custom Error-Handler
  if (options.onError) {
    return applySecurityHeaders(options.onError(context, error));
  }

  // Typisierter Fehler
  const typedError = error as { apiErrorType?: ApiErrorType };
  if (typedError.apiErrorType) {
    return applySecurityHeaders(createApiError(typedError.apiErrorType, errorMessage));
  }

  // Automatische Typ-Erkennung
  let errorType: ApiErrorType = 'server_error';

  if (errorMessage.includes('UNIQUE constraint failed')) {
    errorType = 'validation_error';
  } else if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
    errorType = 'auth_error';
  } else if (errorMessage.includes('not found')) {
    errorType = 'not_found';
  } else if (errorMessage.includes('SQLITE_CONSTRAINT') || errorMessage.includes('database')) {
    errorType = 'db_error';
  }

  // Security-Logging
  securityLogger.logApiError({
    endpoint: new URL(context.request.url).pathname,
    method: context.request.method,
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  }, {
    userId: context.locals.user?.id || 'anonymous',
    ipAddress: context.clientAddress || 'unknown',
  });

  return applySecurityHeaders(createApiError(errorType, errorMessage));
}
```

### Custom Error-Classes

#### Business-Logic-Fehler
```typescript
// src/lib/errors.ts
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public details?: any) {
    super(message);
    this.apiErrorType = 'validation_error';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentifizierung fehlgeschlagen', public reason?: string) {
    super(message);
    this.apiErrorType = 'auth_error';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Zugriff verweigert', public requiredRole?: string) {
    super(message);
    this.apiErrorType = 'forbidden';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource} nicht gefunden`);
    this.apiErrorType = 'not_found';
    this.details = { resource, id };
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message);
    this.apiErrorType = 'rate_limit';
    this.details = { retryAfter };
  }
}
```

#### Service-Layer-Fehler
```typescript
// src/lib/services/prompt-enhancer.ts
export async function enhancePrompt(input: PromptInput): Promise<EnhancedPrompt> {
  // Validierung
  if (!input.text || input.text.length > 5000) {
    throw new ValidationError(
      'Text muss zwischen 1 und 5000 Zeichen lang sein',
      'text',
      { length: input.text?.length || 0 }
    );
  }

  // Usage prüfen
  const usage = await getUsage(input.userId);
  if (usage.exceeded) {
    throw new AuthorizationError(
      'Nutzungslimit erreicht',
      'premium'
    );
  }

  try {
    // AI-Service aufrufen
    const result = await callAIService(input);

    // Safety-Check
    if (result.safetyReport.score > 0.8) {
      throw new ValidationError(
        'Inhalt verstößt gegen Sicherheitsrichtlinien',
        'content',
        result.safetyReport
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }

    // AI-Service-Fehler
    throw new Error(`AI-Service-Fehler: ${error.message}`);
  }
}
```

## Testing

### Error-Testing-Strategien

#### Unit-Tests für Error-Handler
```typescript
// tests/unit/api-middleware.test.ts
import { describe, it, expect } from 'vitest';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';

describe('API Error Handling', () => {
  it('should create validation error correctly', () => {
    const response = createApiError('validation_error', 'Invalid input');
    expect(response.status).toBe(400);

    const data = JSON.parse(response.body);
    expect(data.success).toBe(false);
    expect(data.error.type).toBe('validation_error');
    expect(data.error.message).toBe('Invalid input');
  });

  it('should create success response correctly', () => {
    const data = { enhanced: 'test prompt' };
    const response = createApiSuccess(data);
    expect(response.status).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
  });
});
```

#### Integration-Tests für Error-Flows
```typescript
// tests/integration/error-handling.test.ts
describe('Error Handling Integration', () => {
  it('should handle validation errors correctly', async () => {
    const response = await fetch('/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: '' } // Invalid: empty text
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error.type).toBe('validation_error');
    expect(data.error.message).toContain('required');
  });

  it('should handle rate limit errors correctly', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 15; i++) {
      await fetch('/api/prompt-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { text: 'test' } }),
      });
    }

    // Should get rate limit error
    const response = await fetch('/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text: 'test' } }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error.type).toBe('rate_limit');
    expect(data.error.details).toHaveProperty('retryAfter');
  });

  it('should handle authentication errors correctly', async () => {
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      // No auth headers
    });

    expect(response.status).toBe(401);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error.type).toBe('auth_error');
  });
});
```

### Error-Simulation

#### Test-Utilities für Error-Simulation
```typescript
// tests/utils/error-helpers.ts
export function createMockErrorResponse(
  type: string,
  message: string,
  status: number = 400,
  details?: any
): Response {
  const body = {
    success: false,
    error: {
      type,
      message,
      details,
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createMockSuccessResponse(data: any): Response {
  const body = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Mock für Rate-Limit-Error
export function createRateLimitError(retryAfter: number = 60): Response {
  return createMockErrorResponse(
    'rate_limit',
    'Rate limit exceeded',
    429,
    {
      limit: 15,
      remaining: 0,
      resetIn: 45,
      retryAfter,
    }
  );
}
```

## Monitoring & Debugging

### Error-Metriken

#### Server-seitige Metriken
```typescript
// Error-Tracking
interface ErrorMetrics {
  endpoint: string;
  errorType: string;
  count: number;
  lastOccurred: number;
  userAgent?: string;
  userId?: string;
}

class ErrorTracker {
  private errors: Map<string, ErrorMetrics> = new Map();

  trackError(error: ApiError, context: APIContext) {
    const key = `${context.request.method} ${context.request.url}`;

    const existing = this.errors.get(key) || {
      endpoint: key,
      errorType: error.type,
      count: 0,
      lastOccurred: 0,
    };

    existing.count++;
    existing.lastOccurred = Date.now();

    this.errors.set(key, existing);

    // Alert bei zu vielen Fehlern
    if (existing.count > 10) {
      this.alertHighErrorRate(existing);
    }
  }

  private alertHighErrorRate(metrics: ErrorMetrics) {
    logger.error('High error rate detected', {
      endpoint: metrics.endpoint,
      errorType: metrics.errorType,
      count: metrics.count,
      timeWindow: '1 hour',
    });
  }
}
```

#### Client-seitige Metriken
```typescript
// Client-Error-Tracking
function trackClientError(error: ApiError, context: Record<string, any> = {}) {
  const errorEvent = {
    type: error.type,
    message: error.message,
    status: error.status,
    url: window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    ...context,
  };

  // Analytics-Event
  if (typeof gtag !== 'undefined') {
    gtag('event', 'api_error', {
      event_category: 'error',
      event_label: error.type,
      value: error.status,
      custom_map: errorEvent,
    });
  }

  // Error-Reporting-Service
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(error, {
      tags: {
        apiErrorType: error.type,
        statusCode: error.status,
      },
      extra: errorEvent,
    });
  }
}
```

### Error-Debugging

#### Request-Tracing
```typescript
// Request-ID für bessere Nachverfolgung
export const POST = withApiMiddleware(async (context) => {
  const requestId = context.request.headers.get('x-request-id') ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('Processing request', {
    requestId,
    endpoint: '/api/prompt-enhance',
    method: 'POST',
    userId: context.locals.user?.id,
  });

  try {
    const result = await enhancePrompt(context);

    logger.info('Request completed successfully', {
      requestId,
      duration: Date.now() - startTime,
    });

    return createApiSuccess(result);
  } catch (error) {
    logger.error('Request failed', {
      requestId,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
});
```

#### Error-Context
```typescript
// Detaillierter Error-Context
function createErrorContext(context: APIContext, error: Error): Record<string, any> {
  return {
    requestId: context.request.headers.get('x-request-id'),
    endpoint: context.request.url,
    method: context.request.method,
    userId: context.locals.user?.id,
    userAgent: context.request.headers.get('user-agent'),
    ipAddress: context.clientAddress,
    timestamp: new Date().toISOString(),
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack,
    requestBody: context.request.method !== 'GET'
      ? await context.request.text().catch(() => 'unreadable')
      : undefined,
  };
}
```

## Best Practices

### Error-Design

#### 1. Aussagekräftige Fehlermeldungen
```typescript
// ✅ Gute Fehlermeldung
throw new ValidationError(
  'Email-Adresse muss ein gültiges Format haben (z.B. user@example.com)',
  'email'
);

// ❌ Schlechte Fehlermeldung
throw new Error('Invalid email');
```

#### 2. Strukturierte Details
```typescript
// ✅ Mit strukturierten Details
throw new ValidationError(
  'Passwort entspricht nicht den Anforderungen',
  'password',
  {
    requirements: {
      minLength: 8,
      needsUppercase: true,
      needsLowercase: true,
      needsNumber: true,
    },
    actual: {
      length: 6,
      hasUppercase: false,
      hasLowercase: true,
      hasNumber: false,
    },
  }
);
```

#### 3. Lokalisierte Meldungen
```typescript
// Lokalisierbare Error-Messages
const ERROR_MESSAGES = {
  validation_error: {
    de: 'Ungültige Eingabedaten',
    en: 'Invalid input data',
  },
  auth_error: {
    de: 'Authentifizierung fehlgeschlagen',
    en: 'Authentication failed',
  },
} as const;

function createLocalizedError(type: ApiErrorType, locale: string = 'de'): string {
  return ERROR_MESSAGES[type]?.[locale] || ERROR_MESSAGES[type]?.de || type;
}
```

### Client-Entwicklung

#### 1. Graceful Degradation
```typescript
// Fallback bei API-Fehlern
async function enhancePromptWithFallback(text: string) {
  try {
    return await apiClient.enhancePrompt(text);
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.type) {
        case 'rate_limit':
          // Zeige Rate-Limit-UI
          showRateLimitDialog(error.details.retryAfter);
          return null;

        case 'auth_error':
          // Redirect zu Login
          redirectToLogin();
          return null;

        case 'validation_error':
          // Zeige Validierungsfehler
          showValidationErrors(error.details);
          return null;

        default:
          // Generischer Error
          showErrorToast(error.message);
          return null;
      }
    }

    throw error;
  }
}
```

#### 2. User-Friendly Messages
```typescript
// Benutzerfreundliche Fehlermeldungen
function getUserFriendlyMessage(error: ApiError): string {
  switch (error.type) {
    case 'validation_error':
      return 'Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.';

    case 'rate_limit':
      return `Zu viele Anfragen. Bitte warten Sie ${error.details.retryAfter} Sekunden.`;

    case 'auth_error':
      return 'Bitte melden Sie sich an, um diese Funktion zu nutzen.';

    case 'forbidden':
      return 'Sie haben keine Berechtigung für diese Aktion.';

    case 'not_found':
      return 'Die gewünschte Ressource wurde nicht gefunden.';

    case 'server_error':
      return 'Ein vorübergehender Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';

    default:
      return 'Ein unerwarteter Fehler ist aufgetreten.';
  }
}
```

### Security Considerations

#### 1. Information Disclosure
```typescript
// Vermeide sensible Informationen in Error-Messages
export async function getUserData(userId: string) {
  try {
    const user = await db.users.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Safe to expose
    }

    // Logge interne Fehler, aber expose nur generische Messages
    logger.error('Database error in getUserData', {
      error: error.message,
      userId,
    });

    throw new Error('Ein Datenbankfehler ist aufgetreten');
  }
}
```

#### 2. Error-Rate-Monitoring
```typescript
// Tracke Error-Rates für Security-Monitoring
function trackErrorRate(error: ApiError, context: APIContext) {
  const key = `${context.clientAddress}:${error.type}`;

  // Erhöhe Error-Count für IP + Error-Type
  const errorCount = getErrorCount(key) + 1;
  setErrorCount(key, errorCount);

  // Alert bei verdächtigen Patterns
  if (errorCount > 50) {
    securityLogger.logSecurityEvent('HIGH_ERROR_RATE', {
      ipAddress: context.clientAddress,
      errorType: error.type,
      count: errorCount,
      timeWindow: '1 hour',
    });
  }
}
```

## Migration & Updates

### Backwards Compatibility

#### Error-Format-Versioning
```typescript
// Support für ältere Error-Formate
const ERROR_FORMAT_VERSION = '1.0';

export function createApiError(
  type: ApiErrorType,
  message?: string,
  details?: Record<string, unknown>
): Response {
  const errorMessage = message || errorMessages[type];

  const responseBody = {
    success: false,
    error: {
      type,
      message: errorMessage,
      ...(details ? { details } : {}),
    },
    // Backwards compatibility
    meta: {
      formatVersion: ERROR_FORMAT_VERSION,
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(responseBody), {
    status: errorStatusCodes[type],
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
```

### Error-Code-Dokumentation

#### Automatische Dokumentation
```typescript
// Generiere Error-Dokumentation aus Code
interface ErrorDocumentation {
  type: string;
  statusCode: number;
  description: string;
  examples: Array<{
    scenario: string;
    request?: any;
    response: any;
  }>;
}

function generateErrorDocs(): ErrorDocumentation[] {
  return Object.entries(errorMessages).map(([type, message]) => ({
    type,
    statusCode: errorStatusCodes[type],
    description: message,
    examples: generateErrorExamples(type),
  }));
}
```

## Troubleshooting

### Häufige Probleme

#### Error-Types nicht konsistent
```typescript
// Stelle sicher, dass Error-Types konsistent verwendet werden
const ERROR_TYPE_MAP = {
  'ValidationError': 'validation_error',
  'AuthenticationError': 'auth_error',
  'AuthorizationError': 'forbidden',
  'NotFoundError': 'not_found',
  'RateLimitError': 'rate_limit',
} as const;

function normalizeErrorType(error: any): ApiErrorType {
  if (error.apiErrorType) {
    return error.apiErrorType;
  }

  // Mappe gängige Error-Namen
  const errorName = error.constructor?.name || error.name;
  return ERROR_TYPE_MAP[errorName] || 'server_error';
}
```

#### Fehlende Error-Details
```typescript
// Stelle sicher, dass alle Errors ausreichende Details haben
function enhanceErrorDetails(error: Error, context: APIContext): Record<string, any> {
  const baseDetails: Record<string, any> = {
    timestamp: new Date().toISOString(),
    endpoint: context.request.url,
    method: context.request.method,
  };

  // Füge kontextspezifische Details hinzu
  if (error.name === 'ValidationError') {
    baseDetails.validation = {
      field: (error as any).field,
      expected: (error as any).expected,
      received: (error as any).received,
    };
  }

  return baseDetails;
}
```

#### Performance-Impact von Error-Logging
```typescript
// Optimiere Error-Logging für Performance
const ERROR_LOG_CACHE = new Map<string, number>();
const LOG_THROTTLE_MS = 60000; // 1 minute

function shouldLogError(error: ApiError, context: APIContext): boolean {
  const key = `${context.clientAddress}:${error.type}`;

  const lastLog = ERROR_LOG_CACHE.get(key) || 0;
  const now = Date.now();

  if (now - lastLog > LOG_THROTTLE_MS) {
    ERROR_LOG_CACHE.set(key, now);
    return true;
  }

  return false;
}
```

### Debug-Tools

#### Error-Response-Testing
```bash
# Teste verschiedene Error-Szenarien
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: test" \
  -H "Cookie: csrf_token=test" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{"input":{"text":""}}' \
  http://127.0.0.1:8787/api/prompt-enhance

# Response:
# {
#   "success": false,
#   "error": {
#     "type": "validation_error",
#     "message": "Text field is required",
#     "details": {
#       "field": "text",
#       "expected": "non-empty string"
#     }
#   }
# }
```

#### Error-Log-Analyse
```bash
# Analysiere Error-Logs
grep "error" logs/api.log | jq '.error.type' | sort | uniq -c

# Gruppiere Errors nach Type
grep "validation_error" logs/api.log | jq '.details.field' | sort | uniq -c

# Tracke Error-Rates über Zeit
grep "auth_error" logs/api.log | cut -d' ' -f1-2 | uniq -c
```

## Compliance & Standards

### Security Standards

#### OWASP Error-Handling
Evolution Hub folgt OWASP-Richtlinien für sichere Error-Handling:

- **Keine sensiblen Daten** in Error-Messages
- **Generische Messages** für unerwartete Fehler
- **Strukturierte Logging** für Security-Events
- **Rate-Limiting** für Error-Responses

#### GDPR Compliance
```typescript
// Stelle sicher, dass Error-Logs GDPR-konform sind
function sanitizeErrorDetails(details: Record<string, any>): Record<string, any> {
  const sanitized = { ...details };

  // Entferne PII aus Error-Details
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.address;
  delete sanitized.ipAddress;

  // Hash sensitive data
  if (sanitized.userId) {
    sanitized.userId = hash(sanitized.userId);
  }

  return sanitized;
}
```

## Ressourcen

### Weiterführende Dokumentation
- **[API Overview](./api-overview.md)** - Allgemeine API-Architektur
- **[API Guidelines](./api-guidelines.md)** - Best Practices für API-Entwicklung
- **[Rate Limiting](./rate-limiting-api.md)** - Rate-Limiting-Strategien

### Tools & Libraries
- **[API Middleware](../../lib/api-middleware.ts)** - Error-Handling-Implementierung
- **[Error Types](../../lib/types/errors.ts)** - TypeScript-Error-Definitionen
- **[Validation Utils](../../utils/validation.ts)** - Validierungshilfsmittel

### Standards
- **[RFC 7231](https://tools.ietf.org/html/rfc7231)** - HTTP/1.1 Semantics and Content
- **[OWASP Error Handling](https://owasp.org/www-community/Improper_Error_Handling)** - Security Best Practices
- **[JSON:API Errors](https://jsonapi.org/format/#errors)** - Error Format Standards

---

## Cross-Referenzen

- **[Architecture](../../architecture/)** - Error-Handling in der System-Architektur
- **[Security](../../security/)** - Security-Aspekte der Error-Handling
- **[Testing](../../testing/)** - Error-Testing und Edge-Case-Tests

## Ownership & Maintenance

**Owner**: API Team (Lead: API Lead)  
**Update-Frequenz**: Bei Änderungen an Error-Handling-Logik oder neuen Error-Types  
**Review-Prozess**: Security-Review + Code-Review  
**Eskalation**: Bei Error-Handling-Security-Problemen → Security Team

---

*Zuletzt aktualisiert: 2025-10-27*