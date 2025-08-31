# AI Image Enhancer – Architektur, To‑Do & Protokoll (Provisorisch)

Status: Draft
Letztes Update: 2025-08-31

Dieses Dokument sammelt Architekturentscheidungen, offene Fragen, To‑Dos und Umsetzungsdetails für das Imag‑Enhancer‑Tool innerhalb von Evolution Hub.

Ziel: Saubere, erweiterbare Architektur mit Cloudflare Workers (D1 + R2), konsistenter API‑Middleware, solider Security (Rate‑Limiting, Auth, CSP), Integration von Replicate als AI‑Provider, und moderner UI (Astro + React Island) inkl. Tests und Doku.

---

## 1) Überblick & Ziele

 - Einfacher Upload eines Bildes → AI‑Enhancement (Upscaling, Denoise/Sharpness) → Download/Ansicht.
 - Jobs sind asynchron und werden per Polling abgefragt (SSE optional später).
 - Einheitliche API‑Responses: `{ success: boolean, data?: T, error?: { type, message, details? } }` (siehe `src/lib/api-middleware.ts`).
 - Strikte Security‑Baselines: Rate‑Limiting, Auth, Input‑Validierung (Zod), sichere Logs.

Bezug auf bestehende Standards:

 
 - Middleware: `withAuthApiMiddleware()`, `createApiSuccess()`, `createApiError()` in `src/lib/api-middleware.ts`
 
 - Rate‑Limiter: `apiRateLimiter` (30/min) aus `src/lib/rate-limiter.ts`
 
 - Security Headers: `applySecurityHeaders()` in `src/lib/security-headers.ts`
 
 - R2 Proxy: `src/pages/r2/[...path].ts` (aktuell für `R2_AVATARS`)

---

## 2) Komponenten & Verantwortlichkeiten

 
 - Server‑Side Service Layer (`src/lib/services/ai-image-service.ts`)
   - Startet synchrone Generierungen bei Replicate, speichert Metadaten in D1, legt Input/Output in R2 ab.
   - Liefert `{ model, originalUrl, imageUrl, usage }` zurück; Quoten via KV.
 - Async Jobs Service (`src/lib/services/ai-jobs-service.ts`)
   - Erstellt Jobs, verarbeitet Status und Cancel, persistiert in D1 (`ai_jobs`), nutzt R2 (`R2_AI_IMAGES`) und KV (`KV_AI_ENHANCER`).
   - Unterstützt Polling der Job‑Ergebnisse und Übergang von queued → processing → succeeded/failed/canceled.
 - API‑Routen (Astro API Pages)
 
  - `POST /api/ai-image/jobs` – Job anlegen (Upload, Validierung, Queue/Provider call)
 - `GET /api/ai-image/jobs/[id]` – Job‑Status abfragen (Polling)
 - `POST /api/ai-image/jobs/[id]/cancel` – Cancel eines laufenden Jobs
 
 - Storage (R2)
 
  - Eigener Bucket: `R2_AI_IMAGES` (privat)
 
  - Schlüssel: `ai-enhancer/{userId}/{jobId}/input.{ext}` und `.../output.png`
 
  - Worker‑gated Proxy‑Route für Auslieferung (s. Abschnitt 5)
 
 - Datenbank (D1)
 
  - Tabelle `ai_jobs` (siehe Abschnitt 3)
 
 - Client (React Island)
 
  - Upload + Parameter, Polling, Vorher/Nachher‑Slider, Download, Sonner‑Toasts

---

## 3) Datenmodell (D1)

 
 Neue Tabelle `ai_jobs`:
 
  - `id` (TEXT, PK)
 
  - `user_id` (TEXT, FK → users.id)
 
  - `provider` (TEXT) – z. B. `replicate`
 
 - `model` (TEXT) – z. B. Replicate Modellname/Tag
 
 - `status` (TEXT) – `queued|processing|succeeded|failed|canceled`
 
 - `provider_job_id` (TEXT)
 
 - `input_r2_key` (TEXT), `input_content_type` (TEXT), `input_size` (INTEGER)
 
 - `output_r2_key` (TEXT)
 
 - `params_json` (TEXT)
 
 - `error_message` (TEXT)
 
 - `created_at` (TEXT ISO), `updated_at` (TEXT ISO)

Migrationsdatei: neue Migration unter `migrations/` anlegen (Dateiname folgt dem Projekt‑Schema, laufende Nummer beachten).
TypeScript‑Types: `src/lib/db/types.ts` um `AIJob` (und ggf. Create/Update‑Typen) erweitern.

---

## 4) API‑Design

 
 Alle Endpunkte mit `withApiMiddleware()` (siehe `src/lib/api-middleware.ts`), für AI‑Routen mit `aiJobsLimiter` (10/min). Auth ist für Jobs optional (Gäste erlaubt); Eigentümer‑Gating erfolgt bei Ergebnisabruf/Proxy.

 
 - POST `/api/ai-image/generate`
 
  - Content‑Type: `multipart/form-data`
 
  - Felder: `image` (jpeg/png/webp), `model` (string; Allowlist siehe `src/config/ai-image.ts`)
 
  - Validierung: Content‑Type‑Whitelist, max. Größe 10 MB; Fehler → `validation_error`
 
  - Antwort: `{ success: true, data: { model, originalUrl, imageUrl, usage, limits } }`
 
 
 - GET `/api/ai-image/usage`
 
  - Antwort: `{ success: true, data: { ownerType, usage, limits } }`
 
 
 - Asynchrones Job‑Modell (Phase 1)

  - POST `/api/ai-image/jobs` — Job anlegen

  - GET `/api/ai-image/jobs/[id]` — Job‑Status abfragen (Polling)

  - POST `/api/ai-image/jobs/[id]/cancel` — Cancel
 
 
 - Methoden‑Policy: Nicht erlaubte Methoden → `405 Method Not Allowed` (Header `Allow` gesetzt).

 
Fehlerformat (Beispiel):

 
```json
{
  "success": false,
  "error": { "type": "validation_error", "message": "Ungültige Eingabedaten" }
}
```

---

## 5) R2 Storage & Auslieferung

 
 - Neuer Bucket‑Binding: `R2_AI_IMAGES` in `wrangler.toml` (alle Umgebungen).
 - Ergebnis‑Auslieferung (implementiert)
   - Proxy‑Route mit Owner‑Gating für Ergebnisse: `src/pages/r2-ai/[...path].ts`.
   - Pfadschema: `ai-enhancer/results/<ownerType>/<ownerId>/...` nur für Eigentümer zugänglich.
   - Cache: Ergebnisse `Cache-Control: private, max-age=31536000, immutable`; Uploads `public, max-age=900, immutable` (für externe Provider‑Fetches).
 - Optional (später): Signierte/expirierende URLs für Sharing/Downloads; Admin‑Override.

---

## 6) Service‑Layer (Replicate)

 
 Datei: `src/lib/services/ai-image-service.ts`

Funktionen (Phase 1 – umgesetzt):

 
  - `generate({ ownerType, ownerId, modelSlug, file, requestOrigin })`
 
    - Validiert Eingaben, lädt Original in R2, ruft Replicate (`/v1/run/{model.slug}`) auf, lädt Output, speichert in R2, inkrementiert KV‑Quota, liefert `{ model, originalUrl, imageUrl, usage }`.
 
  - `getUsage(ownerType, ownerId, limit)` — liest Quota aus KV (`KV_AI_ENHANCER`) inkl. Reset‑Zeitpunkt, sofern vorhanden.

Funktionen (Phase 2 – optional, asynchrones Job‑Modell):

 
  - `startJob(...)`, `getStatus(...)`, `cancelJob(...)` — Persistenz in D1 (`ai_jobs`) und Polling.

Provider‑Client: REST via `fetch` mit `Authorization: Token ${REPLICATE_API_TOKEN}` (Secret; nie loggen). Keine SDK‑Pflicht.

 
 - Model‑Allowlist (Start): Real‑ESRGAN 4x, GFPGAN, CodeFormer. Exakte Replicate‑Slugs bei Implementierung verifizieren; UI zeigt nur erlaubte Modelle.

Logging/Security:

 
 - Nutzung der zentralen Logger (`logger-factory`, `security-logger`); sensible Felder (Tokens) nie loggen.
 
 - Fehlerwege vereinheitlichen über `createApiError()`.

---

## 7) Security & Compliance

 
 - Rate‑Limiting: `apiRateLimiter` (30/min) oder projektspezifisch konfigurieren.
 
  - Auth‑Gating: `withAuthApiMiddleware()`; optional E‑Mail‑Verifikation erzwingen (siehe Auth‑Service Regeln).
 
  - Input‑Validierung: Zod; strikte Content‑Type‑Whitelist, max. Größe.
 
  - Logs: Redaction sensibler Felder; kein Token/Passwort/Raw‑Image in Logs.
 
 - CSP/Security‑Headers: automatisch durch Middleware/`applySecurityHeaders()`.
 
 - Quoten: 20 Jobs/Nutzer/24h (konfigurierbar). Durchsetzung via D1‑Query (letzte 24h) + Rate‑Limiter‑Fallback.

Hinweis auf bestehende Security‑Fixes (Double‑Opt‑In, Redaction, 405‑Policy, POST‑only): beibehalten.

---

## 8) Client‑UI (React Island)

 
 - Seite: `src/pages/tools/imag-enhancer/index.astro` (vorhanden)
 
 - React‑Island: TBD (`src/components/tools/imag-enhancer/ImagEnhancer.tsx`, Hydration z. B. `client:load`)
 
  - Funktionen:
 
    - Datei‑Upload (Drag&Drop/Picker), Parameter‑Form.
 
    - POST Job → Polling GET Status.
 
  - Vorher/Nachher‑Slider, Vorschau, Download‑Button.
 
  - Sonner‑Notifications (bestehende Toaster‑Infra vorhanden).
 
 - Einbindung: Island wird in `index.astro` importiert (sobald erstellt).

---

## 9) Konfiguration & Umgebung

 
 - `wrangler.toml`
 
    - `[[r2_buckets]] binding = "R2_AI_IMAGES" bucket_name = "<bucket-name>"`
 
    - Secret: `REPLICATE_API_TOKEN` (via Wrangler Secret)
 
  - `src/env.d.ts`
 
  - `runtime.env` umfasst `R2_AI_IMAGES`, `KV_AI_ENHANCER` (optional in Dev), `REPLICATE_API_TOKEN`, `ENVIRONMENT`.
 
 - `.env.example`
 
  - Aktualisiert: `REPLICATE_API_TOKEN` ergänzt; Hinweise zu Cloudflare‑Bindings (KV/R2).
 
  - Bucket‑Prefix: `ai-enhancer/` (siehe `AI_R2_PREFIX`).

 
 - Scheduled Cleanup (Retention): via Cron (Cloudflare Triggers) — Beispiel `wrangler.toml`:
 
  ```toml
  [triggers]
  crons = ["0 3 * * *"] # täglich 03:00 UTC
  ```
 
  - Model‑Allowlist‑Konfiguration: Konstante `ALLOWED_MODELS` (z. B. in `src/config/ai-image.ts`) für Service und UI verwenden.

---

## 10) Tests

 
 - Unit (Vitest): Zod‑Schemas, Service‑Funktionen (R2/Replicate via Mocks), Status‑Transitions.
 
  - Integration: API Flow (POST → GET Polling) mit gemocktem Provider.
 
  - E2E (Playwright): Upload → Ergebnis → Download; UI‑Toasts & URL‑Hygiene.

 
 - Security/Policies: Quoten‑Enforcement (20/24h), gated Proxy (401/403 bei Fremdzugriff), Header (`Cache-Control`), Retention‑Cleanup (Cron Trigger Simulation).

---

## 11) Offene Fragen (noch zu entscheiden)

 
 1. i18n: UI‑ und Fehlertexte in DE/EN aufnehmen? Empfehlung: Ja; API liefert `error.type`, der Client mappt auf i18n‑Keys (`src/locales/*.json`).

---

 ## 12) Aufgabenliste (Synchron mit Projekt‑TODOs)

 - [x] D1‑Migration für `ai_jobs` erstellen (0008, 0009 angelegt)
 - [x] Service‑Layer (`ai-image-service.ts`) implementiert (Replicate + R2 + KV‑Quoten)
 - [x] API: `POST /api/ai-image/generate` (multipart: image, model)
 - [x] API: `GET /api/ai-image/usage`
 - [x] API (Jobs): `POST /api/ai-image/jobs`, `GET /api/ai-image/jobs/[id]`, `POST /api/ai-image/jobs/[id]/cancel` (inkl. 405s, einheitliche Responses, Rate‑Limit)
 - [x] `.env.example` updaten (REPLICATE_API_TOKEN, Hinweise)
- [x] R2‑AI Proxy (`src/pages/r2-ai/[...path].ts`) mit Owner‑Gating für Ergebnisse; Cache‑Policy: Ergebnisse private, Uploads public
- [ ] Wrangler: `KV_AI_ENHANCER` Namespace‑IDs in `wrangler.toml` in allen Umgebungen ersetzen (dev/staging/prod)
- [ ] Signierte/expirierende URLs für AI‑Images (optional)
- [ ] React‑Island UI (Upload, Polling, Slider, Download, Sonner)
- [ ] Tests: Unit, Integration, E2E (Jobs + R2 Owner‑Gating)
 - [ ] OpenAPI‑Dokumentation ergänzen (Jobs + R2 Proxy Security)
 - [ ] Security‑Hardening (Rate‑Limit, Content‑Type/Size Checks, Log‑Redaction)
 - [x] Quoten‑Durchsetzung (24h‑Fenster) – KV‑basiert umgesetzt
 - [ ] (Optional) D1‑basierte Quoten/Job‑Historie integrieren
 - [ ] Cron‑Cleanup: Input 24h, Output 30d, DB 90d (Scheduled Worker)
 - [x] Model‑Allowlist (`ALLOWED_MODELS`) definieren (Tags prüfen)
 - [ ] Gated‑Route Tests (401/403 bei Fremdzugriff), Header (`Cache-Control`) prüfen

---

## 13) CLI‑Cheat‑Sheet (Wrangler/GitHub)

 Wrangler (lokal; nicht in CI ausführen ohne Bestätigung):

 
  ```bash
  # Secret setzen
  wrangler secret put REPLICATE_API_TOKEN

# R2 Bucket (falls noch nicht vorhanden)
wrangler r2 bucket create <bucket-name>
```

 `wrangler.toml` Ausschnitt (Beispiel):

 
  ```toml
  [[r2_buckets]]
  binding = "R2_AI_IMAGES"
  bucket_name = "<bucket-name>"
  ```

 Git/PR‑Flow (GitHub CLI):

 
  ```bash
  git checkout -b feature/ai-image-enhancer
  # Änderungen committen
  # git add -A && git commit -m "feat(ai): scaffold Image Enhancer (DB, API, R2, docs)"

git push -u origin feature/ai-image-enhancer
gh pr create --fill --base main --head feature/ai-image-enhancer
```

Hinweis: Diese Kommandos sind als Referenz gedacht und werden nicht automatisch ausgeführt.

---

## 14) Referenzen (Code)

 
 - `src/lib/api-middleware.ts` – `withAuthApiMiddleware`, `createApiSuccess`, `createApiError`
 
  - `src/lib/rate-limiter.ts` – `apiRateLimiter`, `standardApiLimiter`
 
  - `src/lib/security-headers.ts` – `applySecurityHeaders`
 
  - `src/pages/r2-ai/[...path].ts` – AI‑Images Proxy‑Route (Phase 1)
 
 - `src/lib/services/ai-image-service.ts`
 
 - `src/config/ai-image.ts`
 
 - `src/pages/api/ai-image/generate.ts`
 
 - `src/pages/api/ai-image/usage.ts`
 
 - `src/pages/api/user/avatar.ts` – R2‑Upload‑Muster (Dateiname, httpMetadata)

---

## 15) Nächste Schritte

 
 - Entscheidungen zu den offenen Fragen (Abschnitt 11) treffen.
 
  - Dann Umsetzung in folgender Reihenfolge starten: Migration → Env/Bindings → Worker‑gated Proxy → Service‑Layer → API → Client → Tests → OpenAPI/Docs.
