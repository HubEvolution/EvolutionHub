---
description: 'Rate-Limiting-Strategien und Implementierungsdetails für Evolution Hub'
owner: 'Security Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'src/lib/rate-limiter.ts, src/lib/api-middleware.ts, docs/security/'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Rate-Limiting-Dokumentation

## Überblick

Das Rate-Limit-System schützt Evolution Hub vor Missbrauch (Brute-Force, DoS, exzessive Nutzung) und sorgt für faire Ressourcennutzung. Alle Limiter liegen in `src/lib/rate-limiter.ts` und werden über `withApiMiddleware` bzw. gezielt in Services eingebunden.

## Presets & Einsatzbereiche

| Limiter | Fenster | Limit | Haupteinsatz | Beispiele |
| --- | --- | --- | --- | --- |
| `standardApiLimiter` | 60 s | 50 | Lese-APIs & Standard-Routen | `/api/dashboard/quick-actions`, `/api/user/me` |
| `apiRateLimiter` | 60 s | 30 Prod / 1000 Dev | Allgemeine schreibende APIs | `/api/projects`, `/api/comments` |
| `authLimiter` | 60 s | 10 | Auth-Workflows (Magic Link, OAuth) | `/api/auth/magic/request`, `/api/auth/oauth/*` |
| `sensitiveActionLimiter` | 1 h | 5 | Security-kritische Aktionen | `/api/user/profile`, `/api/admin/backup/create` |
| `aiGenerateLimiter` | 60 s | 15 | Synchrone Bild-Generierung | `/api/ai-image/generate` |
| `aiJobsLimiter` | 60 s | 10 | Asynchrone AI-Jobs | `/api/ai-image/jobs`, `/api/ai-video/generate` |
| `voiceTranscribeLimiter` | 60 s | 15 | Whisper-Transkription | `/api/voice/transcribe` |

Zusätzlich existiert eine service-seitige Hilfsfunktion `rateLimit(key, maxRequests, windowSeconds)` für Business-Logik ohne Request-Kontext (z. B. interne Counters).

## Verwendung im Code

Das Rate-Limiting wird als Middleware in den API-Routen implementiert:

```typescript
import { apiRateLimiter, authLimiter, sensitiveActionLimiter } from '@/lib/rate-limiter';

export const POST: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Normale API-Logik...
}

```text

### Beispiel: Image Enhancer

```typescript
import { withApiMiddleware } from '@/lib/api-middleware';
import { aiGenerateLimiter } from '@/lib/rate-limiter';

export const POST = withApiMiddleware(async (context) => {
  const rateLimitResponse = await aiGenerateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;

  // Bildgenerierung …
});
```

### Service-Level-Limit

```typescript
import { rateLimit } from '@/lib/rate-limiter';

await rateLimit(`lead-magnet:${leadMagnetId}`, 5, 60); // max. 5 Downloads / Minute
```

## Antwort bei überschrittenem Limit

Wenn ein Client das Rate-Limit überschreitet, erhält er eine strukturierte JSON-Antwort mit HTTP-Status 429:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45,
  "success": false
}

```

Dazu werden entsprechende HTTP-Header gesetzt:

```text
Status: 429 Too Many Requests
Content-Type: application/json
Retry-After: 45

```text

## Konfigurationsoptionen

Eigene Limiter lassen sich über `createRateLimiter({ maxRequests, windowMs, name })` definieren. Optional kann ein alternativer Key-Generator geschrieben werden, falls z. B. per Token statt IP limitiert werden soll.

### Beispiel: Feature-spezifischer Limiter

```typescript
const newsletterLimiter = createRateLimiter({
  name: 'newsletter',
  maxRequests: 3,
  windowMs: 60 * 60 * 1000,
});

const rateLimitResponse = await newsletterLimiter(context);
if (rateLimitResponse) return rateLimitResponse;
```

## Aktuelle Einschränkungen & Roadmap

- In-Memory-Store pro Worker: Reset bei Deployment/Restart, keine Cross-Worker-Persistenz.
- Keine built-in Berücksichtigung von Proxy-Headern (`cf-connecting-ip` etc.) – sollte bei Bedarf im Key-Generator ergänzt werden.
- Monitoring/Alerting erfolgt bisher über Logs (`logRateLimitExceeded`). Automatisierte Alerts stehen noch aus.

**Geplante Verbesserungen:** Persistente Stores (KV/D1), pro-User-Limits, Limits abhängig vom Plan (z. B. AI-Entitlements) automatisch synchronisieren.

## Best Practices

1. **Limits regelmäßig evaluieren** – Logs prüfen, ob legitime Nutzer geblockt werden.
1. **Retry-After beibehalten** – Clients sollen sauber reagieren können.
1. **Dokumentation synchron halten** – Neue Limiter oder veränderte Werte hier ergänzen.

## Endpoint-Referenzen (Stand heute)

| Bereich | Typische Limiter | Beispiel-Routen |
| --- | --- | --- |
| Auth (Magic Link / OAuth) | `authLimiter` | `/api/auth/magic/request`, `/api/auth/oauth/:provider/callback` |
| User/Profile | `standardApiLimiter`, `sensitiveActionLimiter` | `/api/user/me`, `/api/user/profile` |
| Admin/Backups | `sensitiveActionLimiter`, `apiRateLimiter` | `/api/admin/backup/create`, `/api/admin/status` |
| AI Image/Video | `aiGenerateLimiter`, `aiJobsLimiter` | `/api/ai-image/generate`, `/api/ai-video/jobs` |
| Voice | `voiceTranscribeLimiter` | `/api/voice/transcribe` |
| Lead Magnets | `standardApiLimiter` (öffentlich), Service `rateLimit` | `/api/lead-magnets/download` |
