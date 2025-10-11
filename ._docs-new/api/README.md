# 🔌 API Documentation

Vollständige API-Dokumentation für Evolution Hub, inklusive Endpunkte, Request/Response-Formate, Authentifizierung und praktische Beispiele.

## Übersicht

Diese Dokumentation beschreibt alle HTTP-APIs von Evolution Hub. Basierend auf Cloudflare Workers mit konsistenten Response-Formaten, CSRF-Schutz und Rate-Limiting.

## 📚 Hauptthemen

### API-Grundlagen

- **[API Reference](./reference.md)** — Vollständige Übersicht aller API-Endpunkte
- **[Authentication](./auth.md)** — Authentifizierung und Session-Management
- **[Error Handling](./errors.md)** — Standardisierte Fehlercodes und Behandlung
- **[Rate Limiting](./rate-limiting.md)** — Rate-Limiting-Richtlinien und Header

### Core APIs

- **[Prompt Enhancer API](./prompt-enhancer.md)** — Text-Enhancement mit KI-Unterstützung
- **[AI Image Enhancer API](./ai-image-enhancer.md)** — Bildverbesserung mit Real-ESRGAN/GFPGAN
- **[Comments API](./comments.md)** — Kommentarsystem mit Moderation
- **[User API](./user.md)** — Benutzerverwaltung und Profile

### Integration APIs

- **[Telemetry API](./telemetry.md)** — Nutzungsdaten und Analytics
- **[WebScraper API](./webscraper.md)** — Web-Scraping-Funktionalität
- **[Billing API](./billing.md)** — Stripe-Integration und Subscriptions

### Spezifikationen

- **[OpenAPI Schema](./openapi.yaml)** — Maschinenlesbare API-Spezifikation
- **[Schema Documentation](./schemas.md)** — Datenbank- und API-Schema

## 🚀 Schnellstart

### Basis-Setup

**Base URL:** `http://127.0.0.1:8787` (lokal), `https://hub-evolution.com` (Production)

**Response-Format:**

```json
{
  "success": true,
  "data": {},
  "error": { "type": "string", "message": "string", "details": {} }
}
```

**CSRF-Schutz:**

```bash
curl -X POST \
  -H "X-CSRF-Token: <token>" \
  -H "Cookie: csrf_token=<token>" \
  -H "Origin: http://127.0.0.1:8787" \
  [URL]
```

### Häufige Endpunkte

**Prompt Enhancement:**

```bash
curl -X POST \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -F "text=Bitte verbessere meinen Prompt." \
  -F "mode=professional" \
  http://127.0.0.1:8787/api/prompt-enhance
```

**AI Image Enhancement:**

```bash
curl -X POST \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -F "model=real-esrgan" \
  -F "scale=4" \
  -F "image=@image.png" \
  http://127.0.0.1:8787/api/ai-image/generate
```

## 📖 Verwandte Kategorien

- **[🏗️ Architecture](../architecture/)** — API-Architektur und Middleware
- **[🔒 Security](../security/)** — API-Sicherheit und Authentifizierung
- **[🧪 Testing](../testing/)** — API-Tests und Test-Strategien
- **[💻 Development](../development/)** — API-Entwicklung und Debugging

## 🔍 Navigation

### Nach API-Typ

**"Ich möchte KI-Tools nutzen"**
→ [Prompt Enhancer API](./prompt-enhancer.md) → [AI Image Enhancer API](./ai-image-enhancer.md)

**"Ich möchte Kommentare verwalten"**
→ [Comments API](./comments.md) → [Moderation Guide](./comments-moderation.md)

**"Ich möchte Benutzer verwalten"**
→ [User API](./user.md) → [Authentication](./auth.md)

**"Ich möchte Analytics implementieren"**
→ [Telemetry API](./telemetry.md) → [Usage Tracking](./usage-tracking.md)

### Nach Dokument-Typ

- **[📋 Referenzen](./reference.md)** — Vollständige API-Referenz
- **[🔧 Integration](./integration.md)** — Third-Party-Integrationen
- **[📊 Analytics](./telemetry.md)** — Nutzungsdaten und Metriken
- **[🛠️ Tools](./ai-image-enhancer.md)** — KI-Tool-APIs

## 📝 Standards

### Request/Response-Format

**Konsistente Response-Struktur:**

```json
{
  "success": true,
  "data": {
    "id": "unique-id",
    "status": "pending|processing|succeeded|failed",
    "result": {},
    "usage": { "used": 1, "limit": 10, "resetAt": "2025-01-01T00:00:00Z" }
  }
}
```

**Standardisierte Fehler:**

```json
{
  "success": false,
  "error": {
    "type": "validation_error|rate_limit_exceeded|authentication_required",
    "message": "Menschenlesbare Fehlermeldung",
    "details": { "field": "error-details" }
  }
}
```

### Authentifizierung

**Magic Link (Stytch):**

```bash
# Request Magic Link
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","r":"/dashboard"}' \
  http://127.0.0.1:8787/api/auth/magic/request

# Callback
curl "http://127.0.0.1:8787/api/auth/callback?token=xyz&email=user@example.com"
```

**Session-Cookies:**

- `__Host-session` — Authentifizierte Benutzer
- `guest_id` — Gast-Benutzer für Rate-Limiting

### Rate-Limiting

**Standard-Limits:**

- `authLimiter`: 10/min für Auth-Endpunkte
- `standardApiLimiter`: 50/min für Standard-APIs
- `sensitiveActionLimiter`: 5/h für sensible Aktionen

**Rate-Limit-Response:**

```json
{
  "success": false,
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Too many requests",
    "details": { "retryAfter": 60 }
  }
}
```

## 🔧 Testing

### API-Test-Beispiele

**Unit Tests:**

```typescript
// tests/api/prompt-enhancer.test.ts
describe('Prompt Enhancer API', () => {
  it('should enhance text successfully', async () => {
    const response = await app.request('/api/prompt-enhance', {
      method: 'POST',
      body: formDataWithText('Test prompt'),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { enhancedPrompt: expect.any(String) },
    });
  });
});
```

**E2E Tests:**

```typescript
// test-suite-v2/src/e2e/tools/prompt-enhancer.spec.ts
test('complete prompt enhancement flow', async ({ page }) => {
  await page.goto('/tools/prompt-enhancer');
  await page.fill('[data-testid="prompt-input"]', 'Test prompt');
  await page.click('[data-testid="enhance-button"]');

  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});
```

## 🤝 Contribution

Bei API-Dokumentation:

1. **Aktualisieren Sie OpenAPI-Schema** bei API-Änderungen
2. **Dokumentieren Sie neue Endpunkte** sofort nach Implementierung
3. **Testen Sie alle Beispiele** vor der Veröffentlichung
4. **Prüfen Sie Rate-Limiting** für neue Endpunkte

## 📚 Ressourcen

- **OpenAPI Specification:** [spec.openapis.org](https://spec.openapis.org/)
- **REST API Guidelines:** [restfulapi.net](https://restfulapi.net/)
- **HTTP Status Codes:** [httpstatuses.com](https://httpstatuses.com/)
- **Cloudflare Workers API:** [developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)

---

**Kategorie-Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-10
**Verantwortlich:** API Team
