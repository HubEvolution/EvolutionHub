# API README

Diese Übersicht beschreibt die wichtigsten HTTP‑APIs von Evolution Hub, inkl. Struktur, Response‑Format, Auth-Hinweise und Beispielaufrufe.

## Grundlegendes

- Basis: Cloudflare Workers (lokal i. d. R. `http://127.0.0.1:8787`)
- Alle JSON‑Responses folgen dem konsistenten Format:

```json
{
  "success": true,
  "data": {},
  "error": { "type": "string", "message": "string", "details": {} }
}
```

- CSRF/Origin:
  - Unsichere Methoden (POST/PUT/PATCH/DELETE) erfordern Same‑Origin; dies wird durch die API‑Middleware erzwungen.
  - Optionaler Double‑Submit‑CSRF über `enforceCsrfToken: true` (Header `X-CSRF-Token` muss dem Cookie `csrf_token` entsprechen).
  - Allowed Origins können zusätzlich per Env (`ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN`) erweitert werden.

- Rate Limiting: Kritische Endpunkte sind limitiert (z. B. AI‑Enhancer). Antworten mit 429 enthalten i. d. R. `Retry-After`.

## Prompt‑Enhancer API

### POST `/api/prompt-enhance`

Enhance‑Endpoint für Text mit optionalen Anhängen (Bilder, Textdateien, PDF). Verwendet intern OpenAI (Chat Completions / Responses API mit `file_search`).

- Content‑Types:
  - `application/json` (Text‑only)
  - `multipart/form-data` (mit Dateien)
- Felder:
  - `text`: zu optimierender Prompt‑Text (string, max 1000 Zeichen)
  - `mode`: `agent` | `concise` (optional; UI‑Labels `creative`/`professional` mappen auf `agent`)
  - `files[]`: 0..3 Dateien (`image/jpeg|png|webp`, `text/plain|markdown`, `application/pdf`)

- Beispiel (curl, JSON):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{
    "text": "Bitte verbessere meinen Prompt.",
    "mode": "agent"
  }' \
  http://127.0.0.1:8787/api/prompt-enhance
```

- Beispiel (curl):

```bash
curl -X POST \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -F "text=Bitte verbessere meinen Prompt." \
  -F "mode=professional" \
  -F "files[]=@tests/fixtures/tiny.png;type=image/png" \
  http://127.0.0.1:8787/api/prompt-enhance
```

- Erfolg (200):

```json
{
  "success": true,
  "data": {
    "enhancedPrompt": "...",
    "safetyReport": { "score": 0, "warnings": [] },
    "usage": { "used": 1, "limit": 5, "resetAt": null }
  }
}
```

- Validierungsfehler (400):

```json
{
  "success": false,
  "error": { "type": "validation_error", "message": "..." }
}
```

### GET `/api/prompt/usage`

Liefert den aktuellen Usage‑Stand und Limits (24h Fenster) für den aktuellen Besitzer (User oder Gast mit `guest_id`‑Cookie). `usage.limit` ist maßgeblich; `limits.*` sind statische Defaults.

- Beispiel (curl):

```bash
curl -i http://127.0.0.1:8787/api/prompt/usage
```

- Erwartete Header:
  - `X-Usage-OwnerType: user|guest`
  - `X-Usage-Limit: <zahl>`

- Erfolg (200):

```json
{
  "success": true,
  "data": {
    "ownerType": "guest",
    "usage": { "used": 0, "limit": 5, "resetAt": null },
    "limits": { "user": 20, "guest": 5 }
  }
}
```

## AI‑Image Enhancer API

### POST `/api/ai-image/generate`

Startet eine Bildverbesserung (z. B. Real‑ESRGAN). Erwartet Multipart mit Bild und Parametern.

- Felder (Beispiel):
  - `model`: Modell‑Slug
  - `scale`: 2|4
  - `face_enhance`: true|false
  - `image`: Datei (image/jpeg|png|webp)

- Beispiel (curl):

```bash
curl -X POST \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -F "model=real-esrgan" \
  -F "scale=4" \
  -F "face_enhance=false" \
  -F "image=@tests/fixtures/tiny.png;type=image/png" \
  http://127.0.0.1:8787/api/ai-image/generate
```

- Erfolg (200):

```json
{
  "success": true,
  "data": {
    "jobId": "job_...",
    "usage": { "used": 1, "limit": 10, "resetAt": null },
    "limits": { "user": 20, "guest": 3 }
  }
}
```

### GET `/api/ai-image/jobs/{id}`

Fragt den Status eines Jobs ab.

- Beispiel:

```bash
curl http://127.0.0.1:8787/api/ai-image/jobs/JOB_ID \
  -H "X-CSRF-Token: 123" -H "Cookie: csrf_token=123" -H "Origin: http://127.0.0.1:8787"
```

- Erfolg (200): `data.status = queued|processing|succeeded|failed|canceled`

### POST `/api/ai-image/jobs/{id}/cancel`

Bricht einen laufenden Job ab (sofern Berechtigungen stimmen).

```bash
curl -X POST http://127.0.0.1:8787/api/ai-image/jobs/JOB_ID/cancel \
  -H "X-CSRF-Token: 123" -H "Cookie: csrf_token=123" -H "Origin: http://127.0.0.1:8787"
```

## Comments API

**Status:** ✅ Vollständig implementiert (Production-Ready 80%)

Das Kommentarsystem bietet CRUD-Operationen, Moderation, Spam-Detection und XSS-Protection.

### POST `/api/comments/create`

Erstellt einen neuen Kommentar (Guest oder Auth).

- **Security:** Rate-Limiting (5/min), CSRF-Protection, Spam-Detection, XSS-Sanitization
- **Auth:** Optional (Guest-Modus verfügbar)

**Request-Body (Auth User):**

```json
{
  "content": "Great article!",
  "entityType": "blog_post",
  "entityId": "digital-detox-kreativitaet",
  "parentId": "abc123" // Optional (für Replies)
}
```

**Request-Body (Guest):**

```json
{
  "content": "Great article!",
  "entityType": "blog_post",
  "entityId": "digital-detox-kreativitaet",
  "authorName": "Guest User",
  "authorEmail": "guest@example.com"
}
```

**Beispiel (curl):**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{
    "content": "Great article!",
    "entityType": "blog_post",
    "entityId": "test-post",
    "authorName": "Guest User",
    "authorEmail": "guest@example.com"
  }' \
  http://127.0.0.1:8787/api/comments/create
```

**Erfolg (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "xyz789",
    "content": "Great article!",
    "status": "pending",  // 'approved' für auth users
    ...
  }
}
```

### GET `/api/comments`

Ruft Kommentare ab mit Filterung und Pagination.

**Query-Parameter:**

- `entityType`: `blog_post` | `project` | `general`
- `entityId`: ID/Slug des Entities
- `status`: `approved` | `pending` | `flagged` | `hidden` (Standard: `approved`)
- `limit`: Anzahl (Standard: 20)
- `offset`: Offset (Standard: 0)
- `includeReplies`: true | false (Standard: true)

**Beispiel:**

```bash
curl "http://127.0.0.1:8787/api/comments?entityType=blog_post&entityId=test-post&limit=10"
```

### PUT `/api/comments/[id]`

Aktualisiert einen Kommentar (nur durch Autor).

**Beispiel:**

```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -d '{"content":"Updated text","csrfToken":"123"}' \
  http://127.0.0.1:8787/api/comments/xyz789
```

### DELETE `/api/comments/[id]`

Löscht einen Kommentar (Soft-Delete → Status: `hidden`).

**Beispiel:**

```bash
curl -X DELETE \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -d '{"csrfToken":"123"}' \
  http://127.0.0.1:8787/api/comments/xyz789
```

**Vollständige Dokumentation:** [`docs/api/public_api.md#1-kommentare-api`](./public_api.md#1-kommentare-api)

---

## Auth & Sessions

- Magic‑Link (Stytch). Registrierung implizit beim ersten Callback, Passwörter entfallen.
- Cookies: `__Host-session` für authentifizierte Nutzer; Gästen kann serverseitig eine `guest_id` gesetzt werden (Rate‑Limit/Quota).

### Auth API (Magic Link)

- Siehe: [`docs/api/auth_api.md`](./auth_api.md)
- Endpunkte:
  - `POST /api/auth/magic/request` → JSON `{ success: true, data: { sent: true } }` oder HTML `303` Redirect bei Formular‑POST
  - `GET  /api/auth/callback` → `302` Redirect zum Ziel (lokalisiert)

Beispiele:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{"email":"user@example.com","r":"/dashboard","locale":"en"}' \
  http://127.0.0.1:8787/api/auth/magic/request
```

```bash
curl -i "http://127.0.0.1:8787/api/auth/callback?token=dev-ok&email=user@example.com&r=/dashboard"
```

## Telemetrie (Prompt‑Enhancer)

- Feature‑Flag: `PUBLIC_PROMPT_TELEMETRY_V1` (default: off). Ist das Flag deaktiviert, werden clientseitig keine Events gesendet und der Server antwortet mit `403 forbidden`.
- Endpoint: `POST /api/telemetry`
- Schutz:
  - CSRF: Double‑Submit (Header `X-CSRF-Token` + Cookie `csrf_token`).
  - Origin/Referer: Same‑Origin Check (per API‑Middleware).
  - Rate‑Limit: 30/min.
- Payload‑Envelope (Beispiel):

```json
{
  "eventName": "prompt_enhance_started",
  "ts": 1712345678901,
  "context": { "tool": "prompt-enhancer" },
  "props": { "mode": "concise", "hasFiles": false, "fileTypes": [] }
}
```

- Unterstützte Events:
  - `prompt_enhance_started` (Props: `mode`, `hasFiles`, `fileTypes[]`)
  - `prompt_enhance_succeeded` (Props: `latencyMs`, optional `maskedCount`)
  - `prompt_enhance_failed` (Props: `errorKind`, optional `httpStatus`)
  - `prompt_enhance_cta_upgrade_click` (keine Props)

- Beispiel (curl):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: 123" \
  -H "Cookie: csrf_token=123" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{
    "eventName": "prompt_enhance_started",
    "ts": 1712345678901,
    "context": { "tool": "prompt-enhancer" },
    "props": { "mode": "creative", "hasFiles": true, "fileTypes": ["application/pdf"] }
  }' \
  http://127.0.0.1:8787/api/telemetry
```

## Sicherheit

- CSRF, Rate‑Limiting, strukturierte Logs. Fehler werden auf ein Provider‑neutrales `error.type` gemappt (z. B. `validation_error`, `forbidden`, `server_error`).
- Bei sensiblen Endpunkten immer HTTPS und Origins beachten.

## Hinweise für lokale Entwicklung

- Lokaler Start: `npm run dev` (Wrangler Dev, D1/R2 lokal)
- Integrationstests: `RUN_PDF_TEST=1` für PDF‑Pfad (OpenAI‑Key erforderlich).

---

## Voice — Visualizer & Transcriptor

- **Architektur & API**: Siehe `docs/architecture/voice-visualizer-transcriptor.md` (SSE/Poll Endpunkte, Flags, Security, Quoten, Observability).
- **E2E Smoke (SSE/Poll)**: `test-suite-v2/src/e2e/voice/stream-and-poll.spec.ts` (verbindet SSE mit explizitem `jobId` und prüft Poll‑Snapshot).
