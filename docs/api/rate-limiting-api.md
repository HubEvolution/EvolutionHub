---
description: 'Rate-Limiting-Header, 429-Responses und Traffic-Management für Evolution Hub APIs'
owner: 'API Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/lib/rate-limiter.ts, src/lib/api-middleware.ts'
testRefs: 'tests/integration/api/rate-limiting'
---

# Rate Limiting API

**Detaillierte Dokumentation** für Rate-Limiting-Header, 429-Responses und Traffic-Management in Evolution Hub APIs. Dieses Dokument erklärt die verschiedenen Rate-Limiting-Strategien, Header-Formate und Client-Integration.

## Übersicht

Evolution Hub implementiert mehrere Rate-Limiting-Strategien, um die API-Performance zu gewährleisten und Missbrauch zu verhindern. Jeder Endpunkt-Typ hat spezifische Limits basierend auf der Sensitivität und Ressourcenintensität.

### Rate-Limiting-Typen

#### 1. Standard-API-Limiter (`apiRateLimiter`)
- **Limit**: 30 Anfragen pro Minute
- **Verwendung**: Standardmäßige API-Endpunkte
- **Beispiel**: GET `/api/user/profile`, POST `/api/comments/create`

#### 2. AI-Generation-Limiter (`aiGenerateLimiter`)
- **Limit**: 15 Anfragen pro Minute
- **Verwendung**: KI-generative Endpunkte
- **Beispiel**: POST `/api/prompt-enhance`, POST `/api/ai-image/generate`

#### 3. Authentifizierung-Limiter (`authLimiter`)
- **Limit**: 10 Anfragen pro Minute
- **Verwendung**: Login, Registrierung, Passwort-Reset
- **Beispiel**: POST `/api/auth/magic/request`, POST `/api/auth/login`

#### 4. AI-Job-Management-Limiter (`aiJobsLimiter`)
- **Limit**: 10 Anfragen pro Minute
- **Verwendung**: Job-Status und -Management
- **Beispiel**: GET `/api/ai-image/jobs/{id}`, POST `/api/ai-image/jobs/{id}/cancel`

#### 5. Sensitive-Action-Limiter (`sensitiveActionLimiter`)
- **Limit**: 5 Anfragen pro Stunde
- **Verwendung**: Kritische administrative Aktionen
- **Beispiel**: POST `/api/admin/credits/grant`, DELETE `/api/admin/users/{id}`

## HTTP-Header

### Rate-Limit-Header

Jede API-Response enthält Rate-Limiting-Informationen in den HTTP-Headern:

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1634567890
```

#### Header-Beschreibungen

| Header | Beschreibung | Beispiel |
|--------|-------------|----------|
| `X-RateLimit-Limit` | Maximale Anzahl Anfragen pro Zeitfenster | `30` |
| `X-RateLimit-Remaining` | Verbleibende Anfragen im aktuellen Zeitfenster | `25` |
| `X-RateLimit-Reset` | Unix-Timestamp (Sekunden) für das Ende des Zeitfensters | `1634567890` |

### 429-Response-Header

Bei Überschreitung der Limits wird eine 429-Response mit zusätzlichen Headern zurückgegeben:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1634567890
Retry-After: 60
Content-Type: application/json
```

#### Retry-After-Header

Der `Retry-After`-Header gibt an, wie viele Sekunden gewartet werden sollte:

```http
Retry-After: 60
```

- **Format**: Sekunden (dezimal)
- **Bereich**: 1-3600 Sekunden
- **Genauigkeit**: ±1 Sekunde

## Response-Formate

### 429-Response-Body

Bei Rate-Limit-Überschreitung wird eine standardisierte JSON-Response zurückgegeben:

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

#### Error-Details

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|-------------|----------|
| `limit` | `number` | Maximale Anfragen pro Zeitfenster | `30` |
| `remaining` | `number` | Verbleibende Anfragen | `0` |
| `resetIn` | `number` | Sekunden bis zum Reset | `45` |
| `retryAfter` | `number` | Empfohlene Wartezeit in Sekunden | `60` |

### Normale Response mit Rate-Limit-Info

Auch erfolgreiche Responses enthalten Rate-Limiting-Informationen:

```json
{
  "success": true,
  "data": {
    "enhancedPrompt": "...",
    "usage": { "used": 1, "limit": 5, "resetAt": null }
  }
}
```

Header:
```http
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 14
X-RateLimit-Reset: 1634567890
```

## Client-Integration

### Header-Auswertung

#### JavaScript/TypeScript
```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

function parseRateLimitHeaders(response: Response): RateLimitInfo {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
    reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
    retryAfter: response.status === 429
      ? parseInt(response.headers.get('Retry-After') || '60')
      : undefined,
  };
}

async function makeApiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const rateLimit = parseRateLimitHeaders(response);

  if (response.status === 429) {
    console.log(`Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds`);
    return null;
  }

  if (rateLimit.remaining < 5) {
    console.log(`Warning: Only ${rateLimit.remaining} requests remaining`);
  }

  return response.json();
}
```

#### cURL-Beispiele
```bash
# Rate-Limit-Status prüfen
curl -I http://127.0.0.1:8787/api/prompt/usage

# Response-Header:
# X-RateLimit-Limit: 15
# X-RateLimit-Remaining: 10
# X-RateLimit-Reset: 1634567890

# 429-Response testen
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: test" \
  -H "Cookie: csrf_token=test" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{"input":{"text":"test"}}' \
  http://127.0.0.1:8787/api/prompt-enhance \
  --max-time 1 \
  --repeat 20
```

### Retry-Logik

#### Exponential Backoff
```typescript
class ApiClient {
  private retryAttempts = 0;
  private maxRetries = 3;

  async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');

        if (this.retryAttempts < this.maxRetries) {
          this.retryAttempts++;
          await this.delay(retryAfter * 1000);
          return this.makeRequest(url, options);
        }

        throw new Error('Rate limit exceeded, max retries reached');
      }

      this.retryAttempts = 0; // Reset on success
      return response.json();
    } catch (error) {
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        const delay = Math.pow(2, this.retryAttempts) * 1000; // Exponential backoff
        await this.delay(delay);
        return this.makeRequest(url, options);
      }

      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Smart Retry mit Jitter
```typescript
function calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% Jitter
  return exponentialDelay + jitter;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;

      const delay = calculateRetryDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retry attempts exceeded');
}
```

### Rate-Limit-Monitoring

#### Client-seitiges Monitoring
```typescript
class RateLimitMonitor {
  private limits: Map<string, RateLimitInfo> = new Map();

  updateLimit(endpoint: string, info: RateLimitInfo) {
    this.limits.set(endpoint, info);

    // Warnung bei niedrigem Limit
    if (info.remaining < 5) {
      this.notifyLowLimit(endpoint, info);
    }

    // Proaktive Throttling
    if (info.remaining < 2) {
      this.enableThrottling(endpoint);
    }
  }

  private notifyLowLimit(endpoint: string, info: RateLimitInfo) {
    console.warn(`Low rate limit for ${endpoint}: ${info.remaining}/${info.limit}`);

    // Optional: Analytics-Event senden
    if (typeof gtag !== 'undefined') {
      gtag('event', 'rate_limit_warning', {
        endpoint,
        remaining: info.remaining,
        limit: info.limit,
      });
    }
  }

  private enableThrottling(endpoint: string) {
    console.log(`Enabling throttling for ${endpoint}`);

    // Queue requests or increase delays
    this.requestQueue[endpoint] = this.requestQueue[endpoint] || [];
  }
}
```

## Server-seitige Implementierung

### Rate-Limiter-Definitionen

#### Standard-Limiter
```typescript
// src/lib/rate-limiter.ts
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  message: {
    success: false,
    error: {
      type: 'rate_limit',
      message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    },
  },
  standardHeaders: true, // X-RateLimit-*-Headers
  legacyHeaders: false, // X-RateLimit-*-Headers (deprecated)
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        type: 'rate_limit',
        message: 'Rate limit exceeded',
        details: {
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
        },
      },
    });
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.locals?.user?.id || req.clientAddress || 'anonymous';
  },
});
```

#### AI-Generation-Limiter
```typescript
export const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per window
  message: {
    success: false,
    error: {
      type: 'rate_limit',
      message: 'AI-Generierungs-Limit erreicht. Bitte versuchen Sie es später erneut.',
    },
  },
  standardHeaders: true,
  keyGenerator: (req) => {
    // Stricter key generation for AI endpoints
    const userId = req.locals?.user?.id;
    const guestId = getGuestId(req);

    if (userId) {
      // Premium users get higher limits
      const subscription = getUserSubscription(userId);
      return subscription === 'premium' ? `premium:${userId}` : `user:${userId}`;
    }

    return `guest:${guestId}`;
  },
});
```

### Middleware-Integration

#### Automatische Rate-Limiting
```typescript
// src/pages/api/prompt-enhance.ts
import { withApiMiddleware } from '@/lib/api-middleware';
import { aiGenerateLimiter } from '@/lib/rate-limiter';

export const POST = withApiMiddleware(async (context) => {
  // Rate-Limiting wird automatisch angewendet
  const result = await enhancePrompt(context);
  return createApiSuccess(result);
}, {
  rateLimiter: aiGenerateLimiter,
});
```

#### Custom Rate-Limiting-Logik
```typescript
export const POST = withApiMiddleware(async (context) => {
  // Custom Rate-Limiting basierend auf Request-Content
  const body = await context.request.json();
  const isComplexRequest = body.options?.mode === 'agent' || body.files?.length > 0;

  const limiter = isComplexRequest ? aiGenerateLimiter : apiRateLimiter;
  const rateLimitResult = await limiter(context);

  if (rateLimitResult instanceof Response) {
    return rateLimitResult; // 429 Response
  }

  const result = await enhancePrompt(context);
  return createApiSuccess(result);
});
```

## Testing

### Rate-Limiting-Tests

#### Unit-Tests
```typescript
// tests/unit/rate-limiter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRateLimiter } from '@/lib/rate-limiter';

describe('Rate Limiter', () => {
  let mockContext: APIContext;

  beforeEach(() => {
    mockContext = createMockContext({
      method: 'POST',
      url: '/api/test',
      clientAddress: '127.0.0.1',
    });
  });

  it('should allow requests within limit', async () => {
    const result1 = await apiRateLimiter(mockContext);
    expect(result1).toBeUndefined(); // No response means allowed

    const result2 = await apiRateLimiter(mockContext);
    expect(result2).toBeUndefined();
  });

  it('should block requests exceeding limit', async () => {
    // Make 30 requests (at limit)
    for (let i = 0; i < 30; i++) {
      await apiRateLimiter(mockContext);
    }

    // 31st request should be blocked
    const result = await apiRateLimiter(mockContext);
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(429);
  });
});
```

#### Integration-Tests
```typescript
// tests/integration/rate-limiting.test.ts
describe('Rate Limiting Integration', () => {
  it('should handle burst requests correctly', async () => {
    const requests = Array(35).fill(null).map(() =>
      fetch('/api/prompt-enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test',
        },
        body: JSON.stringify({
          input: { text: 'test' }
        }),
      })
    );

    const responses = await Promise.all(requests);

    // Should have some 429 responses
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);

    // Check Retry-After header
    const retryAfter = rateLimited[0].headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    expect(parseInt(retryAfter!)).toBeGreaterThan(0);
  });

  it('should reset limits after time window', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 15; i++) {
      await fetch('/api/prompt-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { text: 'test' } }),
      });
    }

    // Should get 429
    const response1 = await fetch('/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text: 'test' } }),
    });
    expect(response1.status).toBe(429);

    // Wait for reset (in real test, use time mocking)
    await new Promise(resolve => setTimeout(resolve, 60000));

    // Should work again
    const response2 = await fetch('/api/prompt-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text: 'test' } }),
    });
    expect(response2.status).toBe(200);
  });
});
```

### Load-Testing

#### Artillery-Konfiguration
```yaml
# artillery/rate-limiting.yml
config:
  target: 'http://127.0.0.1:8787'
  phases:
    - duration: 60
      arrivalRate: 20  # 20 requests per second
  defaults:
    headers:
      Content-Type: 'application/json'
      X-CSRF-Token: 'test-token'

scenarios:
  - name: 'Test rate limiting'
    requests:
      - post:
          url: '/api/prompt-enhance'
          json:
            input:
              text: 'Test prompt for rate limiting'
          expect:
            - statusCode: [200, 429]
```

#### Load-Test-Ausführung
```bash
# Load-Test mit Artillery
npx artillery run artillery/rate-limiting.yml

# K6 Load-Test
k6 run --duration=60s --vus=10 k6/rate-limiting.js
```

## Monitoring & Analytics

### Metriken-Sammlung

#### Server-seitige Metriken
```typescript
// Rate-Limiting-Metriken tracken
export const POST = withApiMiddleware(async (context) => {
  const startTime = Date.now();

  try {
    const rateLimitInfo = await getRateLimitInfo(context);
    const result = await enhancePrompt(context);
    const duration = Date.now() - startTime;

    // Metriken loggen
    logger.info('API request completed', {
      endpoint: '/api/prompt-enhance',
      duration,
      rateLimitRemaining: rateLimitInfo.remaining,
      rateLimitLimit: rateLimitInfo.limit,
      userId: context.locals.user?.id,
    });

    return createApiSuccess(result);
  } catch (error) {
    // Error-Metriken
    logger.error('API request failed', {
      endpoint: '/api/prompt-enhance',
      error: error.message,
      userId: context.locals.user?.id,
    });

    throw error;
  }
});
```

#### Client-seitige Metriken
```typescript
// Client-Metriken senden
function trackRateLimitEvent(event: string, data: any) {
  if (typeof gtag !== 'undefined') {
    gtag('event', event, {
      event_category: 'rate_limiting',
      ...data,
    });
  }
}

// Usage-Tracking
function onRateLimitExceeded(endpoint: string, retryAfter: number) {
  trackRateLimitEvent('rate_limit_exceeded', {
    endpoint,
    retryAfter,
    timestamp: Date.now(),
  });
}

function onRateLimitWarning(endpoint: string, remaining: number, limit: number) {
  trackRateLimitEvent('rate_limit_warning', {
    endpoint,
    remaining,
    limit,
    percentage: (remaining / limit) * 100,
  });
}
```

### Dashboards & Alerts

#### Rate-Limiting-Dashboard
```typescript
// Metriken für Dashboard
interface RateLimitMetrics {
  endpoint: string;
  totalRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  peakConcurrentRequests: number;
  resetTime: number;
}

function generateRateLimitReport(): RateLimitMetrics[] {
  return Object.entries(requestMetrics).map(([endpoint, metrics]) => ({
    endpoint,
    totalRequests: metrics.total,
    rateLimitedRequests: metrics.rateLimited,
    averageResponseTime: metrics.totalTime / metrics.total,
    peakConcurrentRequests: metrics.peakConcurrent,
    resetTime: metrics.resetTime,
  }));
}
```

#### Alerting-Regeln
```typescript
// Alert wenn Rate-Limiting zu aggressiv
if (rateLimitedRequests / totalRequests > 0.1) { // >10% rate limited
  alert('High rate limit ratio detected', {
    endpoint,
    ratio: rateLimitedRequests / totalRequests,
    totalRequests,
    rateLimitedRequests,
  });
}

// Alert bei ungewöhnlichen Patterns
if (requestsFromSingleIP > 100) {
  alert('Suspicious activity detected', {
    ipAddress,
    requestCount: requestsFromSingleIP,
    timeWindow: '1 minute',
  });
}
```

## Best Practices

### Client-Entwicklung

#### 1. Header-Auswertung
```typescript
// Immer Rate-Limit-Header auswerten
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);
  const rateLimit = parseRateLimitHeaders(response);

  // Rate-Limit-Status speichern
  updateRateLimitStatus(url, rateLimit);

  if (response.status === 429) {
    throw new RateLimitError(rateLimit);
  }

  return response.json();
}
```

#### 2. Proaktive Throttling
```typescript
// Throttle Requests basierend auf Rate-Limit-Status
class ThrottledApiClient {
  private queue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private maxConcurrent = 3;

  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fetch(url, options);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeRequests++;
    const nextRequest = this.queue.shift();
    if (nextRequest) {
      await nextRequest();
    }
  }
}
```

#### 3. Graceful Degradation
```typescript
// Fallback bei Rate-Limiting
async function enhancePromptWithFallback(text: string) {
  try {
    return await apiClient.enhancePrompt(text);
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Fallback: Lokale Verarbeitung oder einfachere API
      return await fallbackEnhancer(text);
    }

    // Andere Fehler weiterwerfen
    throw error;
  }
}
```

### Server-Entwicklung

#### 1. Konsistente Konfiguration
```typescript
// Zentrale Rate-Limiting-Konfiguration
export const RATE_LIMITS = {
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
  },
  AI_GENERATION: {
    windowMs: 60 * 1000,
    max: 15,
  },
  AUTH: {
    windowMs: 60 * 1000,
    max: 10,
  },
  SENSITIVE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
  },
} as const;

// Factory-Funktion für Limiter
export function createRateLimiter(type: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[type];
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    keyGenerator: (req) => getUserKey(req),
  });
}
```

#### 2. User-basierte Limits
```typescript
// Intelligente Key-Generierung
function getUserKey(request: APIContext): string {
  const user = request.locals.user;
  const guestId = getGuestId(request);

  if (user?.id) {
    // Premium-User bekommen höhere Limits
    const subscription = getUserSubscription(user.id);
    return `user:${subscription}:${user.id}`;
  }

  return `guest:${guestId}`;
}

// Subscription-basierte Limits
export const PREMIUM_LIMITS = {
  API: 100,
  AI_GENERATION: 50,
  AUTH: 20,
} as const;

export const STANDARD_LIMITS = {
  API: 30,
  AI_GENERATION: 15,
  AUTH: 10,
} as const;
```

## Troubleshooting

### Häufige Probleme

#### Rate-Limiting zu aggressiv
```typescript
// Temporäres Erhöhen der Limits für Debugging
export const DEBUG_LIMITS = {
  API: 1000,
  AI_GENERATION: 500,
  AUTH: 100,
};

// In Development-Environment
const isDevelopment = process.env.NODE_ENV === 'development';
const limits = isDevelopment ? DEBUG_LIMITS : PRODUCTION_LIMITS;
```

#### False Positives
```typescript
// Bessere Key-Generierung um False Positives zu vermeiden
function getStableUserKey(request: APIContext): string {
  // Kombiniere User-ID mit Session-ID für stabilere Keys
  const userId = request.locals.user?.id;
  const sessionId = request.cookies.get('session')?.value;

  if (userId && sessionId) {
    return `user:${userId}:${sessionId.slice(0, 8)}`;
  }

  // Für Guests: Kombiniere IP mit User-Agent
  const ip = request.clientAddress;
  const userAgent = request.headers.get('user-agent')?.slice(0, 50);

  return `guest:${ip}:${hash(userAgent)}`;
}
```

#### Performance-Impact
```typescript
// Rate-Limiting mit minimalem Performance-Impact
export const lightweightLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  skip: (req) => {
    // Skip Rate-Limiting für Health-Checks
    return req.url.includes('/health');
  },
  keyGenerator: (req) => {
    // Schnelle Key-Generierung
    return req.locals?.user?.id || req.clientAddress || 'unknown';
  },
});
```

### Debug-Tools

#### Rate-Limit-Status prüfen
```bash
# Aktuelle Rate-Limit-Status abrufen
curl -H "Cookie: session=your-session-cookie" \
     http://127.0.0.1:8787/api/prompt/usage

# Response:
# {
#   "success": true,
#   "data": {
#     "usage": { "used": 3, "limit": 15, "resetAt": null },
#     "limits": { "user": 15, "guest": 5 }
#   }
# }
```

#### Rate-Limiting-Logs analysieren
```bash
# Cloudflare Workers Logs filtern
# Rate-Limiting-Events haben spezifische Marker
grep "rate_limit\|429\|RateLimit" logs/worker.log

# Client-seitige Rate-Limiting-Events
grep "rate_limit" logs/client.log
```

#### Load-Testing mit Rate-Limiting
```bash
# Simuliere verschiedene User-Patterns
for i in {1..50}; do
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: test" \
    -H "Cookie: csrf_token=test" \
    -H "Origin: http://127.0.0.1:8787" \
    -d "{\"input\":{\"text\":\"Test prompt $i\"}}" \
    http://127.0.0.1:8787/api/prompt-enhance &
done

# Prüfe wie viele 429-Responses
curl -s http://127.0.0.1:8787/api/prompt-enhance -w "%{http_code}" | grep 429 | wc -l
```

## Compliance & Standards

### RFC 6585 Compliance
Evolution Hub folgt RFC 6585 für 429-Responses:

- **Status Code**: 429 Too Many Requests
- **Retry-After**: Empfohlene Wartezeit in Sekunden
- **Rate-Limit-Header**: Standard-Header für Client-Information

### Security Considerations

#### DDoS-Schutz
Rate-Limiting dient auch als DDoS-Schutz:

```typescript
// Mehrstufige Rate-Limiting
export const ddosProtectionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Global limit per IP
  skip: (req) => {
    // Skip für authentifizierte Premium-User
    return req.locals?.user?.subscription === 'premium';
  },
  keyGenerator: (req) => req.clientAddress || 'unknown',
});
```

#### Brute-Force-Schutz
```typescript
// Strenge Limits für Auth-Endpunkte
export const bruteForceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Reset on successful login
  keyGenerator: (req) => {
    // Per IP and email combination
    const email = req.body?.email;
    const ip = req.clientAddress;
    return `${ip}:${email}`;
  },
});
```

## Migration & Updates

### Version-Updates
```typescript
// Backwards-kompatible Updates
const CURRENT_VERSION = '1.0';
const PREVIOUS_VERSION = '0.9';

export const POST = withApiMiddleware(async (context) => {
  const version = context.request.headers.get('API-Version') || CURRENT_VERSION;

  if (version === PREVIOUS_VERSION) {
    // Legacy-Verhalten
    return handleLegacyRequest(context);
  }

  // Neue Version
  return handleCurrentRequest(context);
});
```

### Limit-Anpassungen
```typescript
// Data-driven Limit-Anpassungen
async function getDynamicLimits(userId: string) {
  const userMetrics = await getUserMetrics(userId);
  const systemLoad = await getSystemLoad();

  let multiplier = 1.0;

  // Premium-User bekommen höhere Limits
  if (userMetrics.subscription === 'premium') {
    multiplier = 2.0;
  }

  // Bei hoher Systemlast Limits reduzieren
  if (systemLoad > 0.8) {
    multiplier *= 0.5;
  }

  return {
    api: Math.floor(30 * multiplier),
    aiGeneration: Math.floor(15 * multiplier),
    auth: Math.floor(10 * multiplier),
  };
}
```

## Ressourcen

### Weiterführende Dokumentation
- **[API Overview](./api-overview.md)** - Allgemeine API-Architektur
- **[API Guidelines](./api-guidelines.md)** - Best Practices für API-Entwicklung
- **[Error Handling](./error-handling.md)** - Fehlercodes und Response-Formate

### Tools & Libraries
- **[Rate Limiter Source](../../lib/rate-limiter.ts)** - Rate-Limiting-Implementierung
- **[API Middleware](../../lib/api-middleware.ts)** - Middleware-Implementierung
- **[Test Utils](../../tests/utils/rate-limit-helpers.ts)** - Test-Hilfsmittel

### Standards
- **[RFC 6585](https://tools.ietf.org/html/rfc6585)** - 429 Status Code Definition
- **[Rate Limiting Best Practices](https://tools.ietf.org/id/draft-ietf-httpapi-ratelimit-headers)** - IETF Draft für Rate-Limit-Header

---

## Cross-Referenzen

- **[Architecture](../../architecture/)** - Rate-Limiting in der System-Architektur
- **[Security](../../security/)** - Security-Aspekte des Rate-Limiting
- **[Testing](../../testing/)** - Rate-Limiting-Tests und Load-Testing

## Ownership & Maintenance

**Owner**: API Team (Lead: API Lead)  
**Update-Frequenz**: Bei Änderungen an Rate-Limiting-Logik oder neuen Endpunkten  
**Review-Prozess**: Security-Review + Performance-Testing  
**Eskalation**: Bei Rate-Limiting-Problemen → Infrastructure Team

---

*Zuletzt aktualisiert: 2025-10-27*