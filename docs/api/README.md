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

- CSRF‑Schutz: POST‑/mutierende Requests erwarten einen Token‑Header und ein Cookie.
  - Header: `X-CSRF-Token: <token>`
  - Cookie: `csrf_token=<token>`
  - Zusätzlich ist eine passende `Origin`/`Referer` empfohlen.

- Rate Limiting: Kritische Endpunkte sind limitiert (z. B. AI‑Enhancer). Antworten mit 429 enthalten i. d. R. `Retry-After`.

## Prompt‑Enhancer API

### POST `/api/prompt-enhance`

Enhance‑Endpoint für Text mit optionalen Anhängen (Bilder, Textdateien, PDF). Verwendet intern OpenAI (Chat Completions / Responses API mit `file_search`).

- Content‑Type: `multipart/form-data`
- Felder:
  - `text`: zu optimierender Prompt‑Text (string)
  - `mode`: `creative` | `professional` | `concise` (optional, default `creative`)
  - `files[]`: 0..3 Dateien (`image/jpeg|png|webp`, `text/plain|markdown`, `application/pdf`)

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
    "usage": { "used": 1, "limit": 5, "resetAt": null },
    "safetyReport": { "masked": [], "types": [] }
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

## Auth & Sessions

- Magic‑Link (Stytch). Registrierung implizit beim ersten Callback, Passwörter entfallen.
- Cookies: `__Host-session` für authentifizierte Nutzer; Gästen kann serverseitig eine `guest_id` gesetzt werden (Rate‑Limit/Quota).

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
