---
description: 'POST /api/prompt-enhance - KI-gestützte Prompt-Optimierung für Evolution Hub'
owner: 'API Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/pages/api/prompt-enhance.ts, src/lib/services/prompt-enhancer-service.ts'
testRefs: 'tests/integration/prompt-enhance-multipart.test.ts'
---

<!-- markdownlint-disable MD051 -->

# POST /api/prompt-enhance

**KI-gestützte Prompt-Optimierung** für Evolution Hub. Dieser Endpunkt transformiert rohe Texte in strukturierte, AI-ready Prompts mit optionaler Dateianhängen-Unterstützung.

## Übersicht

Der Prompt-Enhancer nutzt OpenAI's Chat Completions API mit `file_search` für die Verarbeitung von Texten und optionalen Anhängen. Er unterstützt sowohl authentifizierte als auch Gast-Benutzer mit entsprechenden Quota-Management.

### Features

- **Text-zu-Prompt Transformation**: Konvertiert einfache Texte in strukturierte AI-Prompts

- **Dateianhänge**: Unterstützt Bilder, Textdateien und PDFs (bis zu 3 Dateien)

- **Safety-Checks**: Automatische PII-Maskierung (Emails, Telefonnummern, Adressen)

- **Modi**: `agent` (schrittweise Anleitung) oder `concise` (kurze Version)

- **Quota-Management**: Unterschiedliche Limits für User und Gäste

- **Feature-Flag**: Kann via `PUBLIC_PROMPT_ENHANCER_V1` aktiviert/deaktiviert werden

## HTTP-Anfrage

### Endpunkt

```text
POST /api/prompt-enhance
```

### Content-Types

#### JSON-Format (Text-only)

```http
Content-Type: application/json

```text

#### Multipart-Format (mit Dateien)

```http
Content-Type: multipart/form-data
```

### Header

#### Erforderliche Header

```http
X-CSRF-Token: <csrf-token>
Cookie: csrf_token=<csrf-token>
Origin: http://127.0.0.1:8787

```text

#### Rate-Limit-Header (Response)

```http
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 14
X-RateLimit-Reset: 1634567890
X-RateLimit-Reset-After: 60
```

## Request-Body

### JSON-Format

#### Minimale Anfrage

```json
{
  "input": {
    "text": "Erkläre mir Quantenphysik"
  }
}

```text

#### Vollständige Anfrage

```json
{
  "input": {
    "text": "Analysiere diese Marketing-Strategie und schlage Verbesserungen vor"
  },
  "options": {
    "mode": "agent",
    "safety": true,
    "includeScores": false,
    "outputFormat": "markdown"
  }
}
```

Hinweis: Der kanonische JSON‑Request ist in der OpenAPI‑Spezifikation als Komponente definiert:
`#/components/schemas/PromptEnhanceRequest`. Das Backend akzeptiert weiterhin Legacy‑Formate
(`input.text` oder `text` + optionales `mode` auf Top‑Level), normalisiert diese jedoch vor der
Validierung gegen das Schema.

### Multipart-Format (mit Dateien) (2)

```bash
curl -X POST \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -F "text=Analysiere diese Marketing-Strategie" \
  -F "mode=agent" \
  -F "files[]=@marketing-plan.pdf;type=application/pdf" \
  -F "files[]=@screenshot.png;type=image/png" \
  http://127.0.0.1:8787/api/prompt-enhance

```text

### Parameter-Details

#### `input` (erforderlich)

| Feld | Typ | Beschreibung | Einschränkungen |
|------|-----|-------------|----------------|
| `text` | `string` | Der zu optimierende Prompt-Text | 1-5000 Zeichen, erforderlich |

#### `options` (optional)

| Feld | Typ | Standard | Beschreibung |
|------|-----|----------|-------------|
| `mode` | `string` | `"agent"` | `"agent"` oder `"concise"` |
| `safety` | `boolean` | `true` | PII-Maskierung aktivieren |
| `includeScores` | `boolean` | `false` | Quality-Scores in Response einschließen |
| `outputFormat` | `string` | `"markdown"` | `"markdown"` oder `"json"` |

#### `mode` Parameter

- **`agent`**: Erstellt detaillierte, schrittweise Anleitungen (empfohlen für komplexe Aufgaben)

- **`concise`**: Erstellt kürzere, prägnante Prompts (empfohlen für einfache Anfragen)

### Dateianhänge (Multipart only)

#### Unterstützte Formate

- **Bilder**: `image/jpeg`, `image/png`, `image/webp`

- **Dokumente**: `text/plain`, `text/markdown`, `application/pdf`

- **Maximale Anzahl**: 3 Dateien pro Anfrage

- **Größenlimit**: Abhängig von OpenAI's Limits (typisch 20MB pro Datei)

#### Form-Felder

```bash
# Einzelne Datei
-F "file=@document.pdf;type=application/pdf"

# Mehrere Dateien
-F "files[]=@doc1.pdf;type=application/pdf"
-F "files[]=@doc2.txt;type=text/plain"
```

## Response-Format

### Erfolgreiche Response (200)

```json
{
  "success": true,
  "data": {
    "enhancedPrompt": "# Role\nYou are an expert marketing strategist.\n\n## Objective\nAnalyze the provided marketing strategy and suggest specific improvements.\n\n## Constraints\n- Focus on actionable recommendations\n- Consider budget constraints\n- Maintain brand consistency\n\n## Original (sanitized)\nAnalysiere diese Marketing-Strategie und schlage Verbesserungen vor",
    "safetyReport": {
      "score": 0,
      "warnings": []
    },
    "usage": {
      "used": 1,
      "limit": 5,
      "resetAt": null
    },
    "limits": {
      "user": 20,
      "guest": 5
    }
  }
}

```text

### Response-Felder

#### `enhancedPrompt`

**Typ**: `string`

Der optimierte Prompt im angeforderten Format:

- **Markdown**: Strukturierte Sektionen (Role, Objective, Constraints, Steps, Examples)

- **Plain**: Einfacher Text (wenn LLM-Modus verwendet wird)

#### `safetyReport`

**Typ**: `object`

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `score` | `number` | Safety-Score (0-1, 0 = sicher) |
| `warnings` | `array` | Liste maskierter PII-Elemente |

#### `usage`

**Typ**: `object`

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `used` | `number` | Verwendete Anfragen im aktuellen Zeitfenster |
| `limit` | `number` | Limit für den aktuellen Benutzer-Typ |
| `resetAt` | `number|null` | Unix-Timestamp für Limit-Reset |

#### `limits`

**Typ**: `object`

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `user` | `number` | Limit für authentifizierte Benutzer |
| `guest` | `number` | Limit für Gast-Benutzer |

## Error-Responses

### Validierungsfehler (400)

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Input text is required",
    "details": {
      "field": "text",
      "code": "REQUIRED"
    }
  }
}
```

### Quota-Überschreitung (403)

```json
{
  "success": false,
  "error": {
    "type": "forbidden",
    "message": "Usage limit exceeded",
    "details": {
      "reason": "quota_exceeded",
      "limit": 5,
      "used": 5,
      "resetAt": 1634567890
    }
  }
}

```text

### Feature-Deaktiviert (403)

```json
{
  "success": false,
  "error": {
    "type": "forbidden",
    "message": "Feature not enabled"
  }
}
```

### Rate-Limit (429)

```json
{
  "success": false,
  "error": {
    "type": "rate_limit",
    "message": "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
    "details": {
      "limit": 15,
      "remaining": 0,
      "resetAfter": 60,
      "resetAt": 1634567890
    }
  }
}

```text

## Client-Implementierung

### JavaScript/TypeScript

```typescript
interface EnhanceOptions {
  mode?: 'agent' | 'concise';
  safety?: boolean;
  includeScores?: boolean;
  outputFormat?: 'markdown' | 'json';
}

interface EnhanceRequest {
  input: {
    text: string;
  };
  options?: EnhanceOptions;
}

interface EnhanceResponse {
  success: true;
  data: {
    enhancedPrompt: string;
    safetyReport?: {
      score: number;
      warnings: string[];
    };
    usage: {
      used: number;
      limit: number;
      resetAt: number | null;
    };
    limits: {
      user: number;
      guest: number;
    };
  };
}

class PromptEnhancer {
  private baseUrl: string;
  private csrfToken: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.csrfToken = this.getCsrfToken();
  }

  async enhance(
    text: string,
    options: EnhanceOptions = {},
    files?: File[]
  ): Promise<EnhanceResponse> {
    const formData = new FormData();
    formData.append('text', text);

    if (options.mode) formData.append('mode', options.mode);
    if (options.safety !== undefined) formData.append('safety', String(options.safety));
    if (options.includeScores) formData.append('includeScores', 'true');
    if (options.outputFormat) formData.append('outputFormat', options.outputFormat);

    // Dateien hinzufügen
    files?.forEach((file, index) => {
      formData.append('files[]', file, file.name);
    });

    const response = await fetch(`${this.baseUrl}/api/prompt-enhance`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': this.csrfToken,
      },
      credentials: 'include', // Für Session-Cookies
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message);
    }

    return response.json();
  }

  private getCsrfToken(): string {
    // CSRF-Token aus Cookie oder generieren
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrf_token='));
    return csrfCookie ? csrfCookie.split('=')[1] : '';
  }
}
```

### React Hook

```typescript
import { useState } from 'react';

interface UsePromptEnhancerReturn {
  enhance: (text: string, files?: File[]) => Promise<string>;
  loading: boolean;
  error: string | null;
  usage: { used: number; limit: number } | null;
}

export function usePromptEnhancer(): UsePromptEnhancerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  const enhance = async (text: string, files?: File[]): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/prompt-enhance', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
        credentials: 'include',
        body: createFormData(text, files),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error.message);
      }

      setUsage(data.data.usage);
      return data.data.enhancedPrompt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { enhance, loading, error, usage };
}

function createFormData(text: string, files?: File[]): FormData {
  const formData = new FormData();
  formData.append('text', text);

  files?.forEach(file => {
    formData.append('files[]', file);
  });

  return formData;
}

```text

## Testing

### Unit-Tests

```typescript
// tests/unit/hooks/useEnhance.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptEnhancer } from '@/hooks/useEnhance';

describe('usePromptEnhancer', () => {
  it('should enhance prompt successfully', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          enhancedPrompt: '# Role\nYou are an expert...',
          usage: { used: 1, limit: 5, resetAt: null },
          limits: { user: 20, guest: 5 },
        },
      }),
    });

    const { result } = renderHook(() => usePromptEnhancer());

    await act(async () => {
      const enhanced = await result.current.enhance('Test prompt');
      expect(enhanced).toContain('# Role');
      expect(result.current.usage).toEqual({ used: 1, limit: 5 });
    });
  });

  it('should handle validation errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: {
          type: 'validation_error',
          message: 'Input text is required',
        },
      }),
    });

    const { result } = renderHook(() => usePromptEnhancer());

    await act(async () => {
      try {
        await result.current.enhance('');
      } catch (error) {
        expect(error.message).toBe('Input text is required');
        expect(result.current.error).toBe('Input text is required');
      }
    });
  });
});
```

### Integration-Tests

```typescript
// tests/integration/prompt-enhance-multipart.test.ts
describe('Prompt Enhance Multipart', () => {
  it('should handle file uploads correctly', async () => {
    const formData = new FormData();
    formData.append('text', 'Analyze this document');
    formData.append('mode', 'agent');

    // Mock file
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    formData.append('files[]', mockFile);

    const response = await fetch('/api/prompt-enhance', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'test-token',
      },
      body: formData,
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.enhancedPrompt).toContain('test content');
  });

  it('should validate file types', async () => {
    const formData = new FormData();
    formData.append('text', 'Test');

    // Invalid file type
    const mockFile = new File(['test'], 'test.exe', { type: 'application/octet-stream' });
    formData.append('files[]', mockFile);

    const response = await fetch('/api/prompt-enhance', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'test-token',
      },
      body: formData,
    });

    expect(response.status).toBe(400);
    const data = await response.json();

    expect(data.error.type).toBe('validation_error');
    expect(data.error.message).toContain('Invalid files');
  });
});

```json

### E2E-Tests

```typescript
// test-suite-v2/src/e2e/prompt-enhancer.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Prompt Enhancer', () => {
  test('should enhance prompt via UI', async ({ page }) => {
    await page.goto('/tools/prompt-enhancer');

    // Fill form
    await page.fill('[data-testid="prompt-input"]', 'Explain quantum physics');
    await page.selectOption('[data-testid="mode-select"]', 'agent');
    await page.click('[data-testid="enhance-button"]');

    // Wait for result
    await page.waitForSelector('[data-testid="enhanced-prompt"]');

    // Verify result
    const enhancedText = await page.textContent('[data-testid="enhanced-prompt"]');
    expect(enhancedText).toContain('# Role');
    expect(enhancedText).toContain('## Objective');
  });

  test('should show usage information', async ({ page }) => {
    await page.goto('/tools/prompt-enhancer');

    // Check initial usage
    await page.waitForSelector('[data-testid="usage-info"]');
    const usageText = await page.textContent('[data-testid="usage-info"]');
    expect(usageText).toMatch(/\d+\/\d+/); // "X/Y" format
  });

  test('should handle rate limiting', async ({ page }) => {
    await page.goto('/tools/prompt-enhancer');

    // Exhaust rate limit
    for (let i = 0; i < 20; i++) {
      await page.fill('[data-testid="prompt-input"]', `Test prompt ${i}`);
      await page.click('[data-testid="enhance-button"]');
      await page.waitForTimeout(100);
    }

    // Should show rate limit message
    await page.waitForSelector('[data-testid="rate-limit-message"]');
    const rateLimitText = await page.textContent('[data-testid="rate-limit-message"]');
    expect(rateLimitText).toContain('zu viele Anfragen');
  });
});
```

## Best Practices

### Client-seitige Optimierungen

#### Request-Deduplication

```typescript
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, request: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const promise = request().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

```text

#### Progressive Enhancement

```typescript
// Fallback für nicht unterstützte Features
async function enhancePromptWithFallback(text: string): Promise<string> {
  try {
    return await enhancePrompt(text);
  } catch (error) {
    if (error.type === 'forbidden' && error.message.includes('not enabled')) {
      // Fallback: Einfache Text-Optimierung
      return createBasicPrompt(text);
    }
    throw error;
  }
}
```

### Error-Handling

#### Retry-Logic

```typescript
async function enhanceWithRetry(text: string, maxRetries: number = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await enhancePrompt(text);
    } catch (error) {
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Exponential Backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

function isRetryableError(error: any): boolean {
  return error.type === 'rate_limit' || error.type === 'server_error';
}

```text

#### User-Friendly Error-Messages

```typescript
function getUserFriendlyErrorMessage(error: any): string {
  switch (error.type) {
    case 'validation_error':
      return 'Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.';
    case 'rate_limit':
      return 'Sie haben zu viele Anfragen gestellt. Bitte warten Sie einen Moment.';
    case 'forbidden':
      if (error.details?.reason === 'quota_exceeded') {
        return 'Ihr kostenloses Limit wurde erreicht. Bitte upgraden Sie für mehr Nutzung.';
      }
      return 'Sie haben keine Berechtigung für diese Aktion.';
    case 'server_error':
      return 'Ein temporäres Problem ist aufgetreten. Bitte versuchen Sie es später erneut.';
    default:
      return error.message || 'Ein unbekannter Fehler ist aufgetreten.';
  }
}
```

## Performance-Optimierung

### Caching-Strategie

```typescript
// Client-seitiges Caching
class PromptCache {
  private cache = new Map<string, { result: string; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 Minuten

  async get(key: string, fetcher: () => Promise<string>): Promise<string> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.result;
    }

    const result = await fetcher();
    this.cache.set(key, { result, timestamp: Date.now() });
    return result;
  }

  generateKey(text: string, options: EnhanceOptions): string {
    return `${options.mode}-${options.outputFormat}-${hash(text)}`;
  }
}

```text

### Request-Optimierung

```typescript
// Optimierte Request-Größe
function optimizeTextLength(text: string, maxLength: number = 5000): string {
  if (text.length <= maxLength) return text;

  // Intelligente Kürzung bei Überschreitung
  const words = text.split(' ');
  let result = '';

  for (const word of words) {
    if ((result + word).length > maxLength - 50) { // 50 Zeichen Reserve
      result += '...';
      break;
    }
    result += (result ? ' ' : '') + word;
  }

  return result;
}
```

## Security-Considerations

### Input-Sanitization

```typescript
// Client-seitige Vorverarbeitung
function sanitizeInput(text: string): string {
  return text
    // Entferne potenziell schädliche Inhalte
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Normalisiere Whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

```text

### File-Validation

```typescript
function validateFileUpload(file: File): { valid: boolean; reason?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/markdown',
    'application/pdf',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      reason: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return {
      valid: false,
      reason: `File size ${file.size} exceeds maximum of ${maxSize} bytes`,
    };
  }

  return { valid: true };
}
```

## Monitoring & Analytics

### Usage-Tracking

```typescript
// Client-seitiges Usage-Tracking
function trackEnhancement(
  originalText: string,
  enhancedText: string,
  options: EnhanceOptions,
  duration: number
): void {
  analytics.track('prompt_enhanced', {
    originalLength: originalText.length,
    enhancedLength: enhancedText.length,
    mode: options.mode,
    hasFiles: false, // aus context
    duration,
    timestamp: Date.now(),
  });
}

```text

### Performance-Metriken

```typescript
// Performance-Tracking
const startTime = performance.now();

try {
  const result = await enhancePrompt(text, options);
  const duration = performance.now() - startTime;

  if (duration > 10000) { // 10 Sekunden
    analytics.track('slow_enhancement', {
      duration,
      textLength: text.length,
      mode: options.mode,
    });
  }

  return result;
} catch (error) {
  const duration = performance.now() - startTime;
  analytics.track('enhancement_error', {
    duration,
    errorType: error.type,
    errorMessage: error.message,
  });
  throw error;
}
```

## Troubleshooting

### Häufige Probleme

#### Rate-Limit-Fehler

```bash

# Rate-Limit-Status prüfen

curl -I http://127.0.0.1:8787/api/prompt/usage

# Response:

# X-RateLimit-Limit: 15

# X-RateLimit-Remaining: 0

# X-RateLimit-Reset-After: 60

```bash

#### CSRF-Fehler

```bash
# CSRF-Token setzen
curl -H "X-CSRF-Token: $(cat /tmp/csrf_token)" \
     -H "Cookie: csrf_token=$(cat /tmp/csrf_token)" \
     -H "Origin: http://127.0.0.1:8787" \
     -d '{"input":{"text":"Test"}}' \
     http://127.0.0.1:8787/api/prompt-enhance
```

#### Datei-Upload-Fehler

```bash

# Multipart-Request mit korrekten Content-Type

curl -X POST \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -F "text=Analyze this document" \
  -F "files[]=@document.pdf;type=application/pdf" \
  http://127.0.0.1:8787/api/prompt-enhance

```text

### Debug-Modi

#### Development-Logging

```typescript
// Erweiterte Logs in Development
if (process.env.NODE_ENV === 'development') {
  console.log('Prompt enhancement request:', {
    textLength: text.length,
    mode: options.mode,
    hasFiles: Boolean(files),
    timestamp: Date.now(),
  });
}
```

#### Response-Debugging

```typescript
// Detaillierte Response-Analyse
async function debugEnhancement(text: string): Promise<void> {
  const response = await fetch('/api/prompt-enhance', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': getCsrfToken(),
      'X-Debug': 'true', // Development-only
    },
    body: createFormData(text),
  });

  console.log('Response status:', response.status);
  console.log('Rate limit headers:', {
    limit: response.headers.get('X-RateLimit-Limit'),
    remaining: response.headers.get('X-RateLimit-Remaining'),
    resetAfter: response.headers.get('X-RateLimit-Reset-After'),
  });

  const data = await response.json();
  console.log('Response data:', data);
}

```text

## Migration & Updates

### Backwards-Kompatibilität

#### Legacy-Format-Unterstützung

```typescript
// Alte API-Format-Unterstützung
interface LegacyEnhanceRequest {
  text: string; // Direkt statt input.text
  mode?: string;
}

// Automatische Konvertierung
function normalizeRequest(body: unknown): EnhanceRequest {
  if (typeof body === 'object' && body !== null) {
    const obj = body as any;

    // Legacy-Format
    if (typeof obj.text === 'string') {
      return {
        input: { text: obj.text },
        options: {
          mode: obj.mode || 'agent',
          safety: true,
        },
      };
    }

    // Neues Format
    return obj as EnhanceRequest;
  }

  throw new Error('Invalid request format');
}
```

### Feature-Flags

#### Graduelles Rollout

```typescript
// Feature-Flag für neue Funktionalität
const ENABLE_ADVANCED_SAFETY = process.env.PUBLIC_ADVANCED_SAFETY === 'true';

export const POST = withApiMiddleware(async (context) => {
  const result = await enhancePrompt(context);

  if (ENABLE_ADVANCED_SAFETY) {
    result.safetyReport = await advancedSafetyCheck(result.enhancedPrompt);
  }

  return createApiSuccess(result);
});

```text

## Ressourcen

### Weiterführende Dokumentation

- **[API Overview](./api-overview.md)** - Allgemeine API-Architektur

- **[API Guidelines](./api-guidelines.md)** - Best Practices für API-Entwicklung

- **[Error Handling](./error-handling.md)** - Fehlercodes und Response-Formate

- **[Rate Limiting](./rate-limiting-api.md)** - Rate-Limiting-Strategien

### Tools & Libraries

- **[Prompt Enhancer Service](../../lib/services/prompt-enhancer-service.ts)** - Core Service-Implementierung

- **[File Validation](../../lib/services/prompt-attachments.ts)** - Datei-Validierung

- **[Rate Limiter](../../lib/rate-limiter.ts)** - Rate-Limiting-Implementierung

### Testing (2)

- **[Integration Tests](../../tests/integration/prompt-enhance-multipart.test.ts)** - Multipart-Tests

- **[E2E Tests](../../../test-suite-v2/src/e2e/prompt-enhancer.spec.ts)** - End-to-End-Tests

- **[Unit Tests](../../tests/unit/hooks/useEnhance.test.tsx)** - Hook-Tests

### Standards

- **[OpenAI File Search](https://platform.openai.com/docs/assistants/tools/file-search)** - OpenAI File Search API

- **[RFC 7578](https://tools.ietf.org/html/rfc7578)** - Multipart Form Data

- **[RFC 7231](https://tools.ietf.org/html/rfc7231)** - HTTP/1.1 Semantics

---

## Cross-Referenzen

- **[Architecture > Prompt Enhancer](../architecture/prompt-enhancer.md)**

- **[Development Documentation](../development/README.md)** — Tooling & lokale Workflows

- **[Security Documentation](../security/README.md)** — CSRF, Rate-Limiting, Safety Controls

- **[Testing Documentation](../testing/README.md)** — Integration- und E2E-Tests

## Ownership & Maintenance

**Owner**: API Team (Lead: API Lead)
**Update-Frequenz**: Bei API-Änderungen oder neuen Features
**Review-Prozess**: Code-Review + Integration-Tests
**Eskalation**: Bei Prompt-Enhancer-spezifischen Problemen → Product Team

---

*Zuletzt aktualisiert: 2025-10-27*

```text
