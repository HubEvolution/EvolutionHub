# Service‑Wissen — src/lib/services/\*\*

- **Titel & Geltungsbereich**
  - Überblick über zentrale Services (AI‑Image, AI‑Jobs, Prompt‑Enhancer, Voice‑Transcribe, Voice‑Stream‑Aggregator, Provider‑Error, Auth/E‑Mail) inkl. Abhängigkeiten, Boundaries und Fehlermappings.

- **Zentrale Abhängigkeiten & Grenzen**
  - **AI Image (Sync)** `src/lib/services/ai-image-service.ts`
    - Abhängigkeiten: `@/config/ai-image` (Modelle/Limits), `OpenAI` (optionale Assistant‑Hilfen), `KV_AI_ENHANCER` (Tages/Monats‑Quoten + Credits), `R2_AI_IMAGES` (Original/Result), optional `REPLICATE_API_TOKEN`.
    - Sicherheitslogik: Magic‑Bytes‑Sniff via `detectImageMimeFromBytes`, Modellfähigkeiten validiert (Scale/FaceEnhance), plan‑basierte Overrides (`limitOverride`, `monthlyLimitOverride`, `maxUpscaleOverride`, `allowFaceEnhanceOverride`).
    - Provider: Replicate via `runReplicate()`; Fehler werden mit `buildProviderError()` typisiert. Dev‑Echo: in Dev/Test ohne Token/bei 404 wird Originalbild zurückgegeben.
    - URLs: `buildPublicUrl()` baut öffentliche `/r2-ai/<key>` URLs (R2‑Proxy erforderlich).
  - **AI Jobs (Async/Queue)** `src/lib/services/ai-jobs-service.ts`
    - Boundaries: D1 (Tabelle `ai_jobs`) über `AbstractBaseService`, `KV_AI_ENHANCER` (Quoten/Credits), `R2_AI_IMAGES` (Input/Output). Provider: Replicate.
    - Statusfluss: `queued` → `processing` → `succeeded|failed|canceled`, Poll per `getAndProcessIfNeeded()` treibt Verarbeitung an.
    - Quoten: tägliche und monatliche Limits; Monatsüberschreitung darf über Credits (KV) für User konsumiert werden.
  - **Prompt Enhancer** `src/lib/services/prompt-enhancer-service.ts`
    - Abhängigkeiten: `KV_PROMPT_ENHANCER` (Quoten + Pfad‑Metriken), `OpenAI` (Chat Completions bzw. Responses API bei PDFs), `@/config/prompt-enhancer` (Model/Params), `uploadPdfFilesToProvider` (Datei‑Uploads).
    - Pipeline: `parseInput` → `structurePrompt` → `rewriteMode` → optional `callRewriteLLM` (Vision/File‑Search) → `calculateScores`; deterministischer Fallback bei Provider‑Fehlern.
    - Flags: `PUBLIC_PROMPT_ENHANCER_V1`, `PROMPT_REWRITE_V1`, `PROMPT_METRICS_V1`, Param‑Overrides per ENV.
  - **Voice Transcribe** `src/lib/services/voice-transcribe-service.ts`
    - Abhängigkeiten: `KV_VOICE_TRANSCRIBE` (Tagesquoten), `OpenAI.audio.transcriptions` (Whisper), `R2_VOICE` optional (Archiv bei `VOICE_R2_ARCHIVE=1`).
    - Validierung: Container‑MIME gegen `VOICE_ALLOWED_CONTENT_TYPES`, Chunk‑Größe `VOICE_MAX_CHUNK_BYTES`.
    - Dev‑Echo: bei `VOICE_DEV_ECHO=1` oder fehlendem `OPENAI_API_KEY` in Dev wird Platzhalter‑Text geliefert.
    - Fehler: Provider‑Fehler via `buildProviderError()` gemappt.
  - **Voice Stream Aggregator** `src/lib/services/voice-stream-aggregator.ts`
    - KV‑gestützter Aggregator für Partials/Final + Usage, TTL konfigurierbar; no‑KV Fallback (in‑memory per Requestlauf) vorhanden.
  - **Provider Error Mapping** `src/lib/services/provider-error.ts`
    - 401/403→`forbidden`, 4xx→`validation_error`, 5xx→`server_error`. Services werfen typisierte Fehler, die `withApiMiddleware()` in API‑Fehlerobjekte überführt.
  - **Auth/E‑Mail**
    - `auth-service.ts` + `auth-service-impl.ts`: bcrypt‑Login, Sessions via `@/lib/auth-v2`, D1; Sicherheits‑Logging (`loggerFactory`).
    - `email-service-impl.ts` (Resend): benötigt API‑Key/From/BaseUrl; maskiert Logs, gibt `EmailResult` zurück.

- **Cross‑Domain‑Beziehungen**
  - Einheitliche Fehlerform über `buildProviderError()` + `src/lib/api-middleware.ts` (`createApiError`, typed branch). Rate‑Limits in APIs per `@/lib/rate-limiter` Voreinstellungen.
  - R2/KV/D1 aus `wrangler.toml` gebunden; Services erwarten konsistente Bindings in allen Envs (dev/testing/staging/prod).

- **Bekannte Risiken/Code‑Smells**
  - **R2‑Proxy vorhanden**: `src/pages/r2-ai/[...path].ts` implementiert (Uploads öffentlich, Results owner‑gated); Tests für Header/Caching/Owner‑Gate sinnvoll.
  - **Duplizierte Quotenlogik** in AI‑Sync/Jobs/Prompt/Voice (ähnliche KV‑JSON Strukturen). Abstraktion könnte Fehler reduzieren.
  - **Assistant‑Pfad (AI Image)**: Threads/Runs‑Polling ohne externen Timeout; Long‑poll Risiken in Fehlerfällen (intern zwar Schleife mit kurzen Delays, aber ohne Hartzeitlimit).
  - **ENV‑Erkennung (`isDevelopment`)**: verlässt sich auf `ENVIRONMENT`; falsche Setzung führt zu Dev‑Echo in unerwünschten Umgebungen.

- **Empfohlene Best Practices**
  - **Serverseitige Validierung**: Magic‑Bytes/MIME nie `file.type` vertrauen; Modell‑Fähigkeiten strikt prüfen (Scale/FaceEnhance).
  - **Typisierte Provider‑Fehler** strikt nutzen; keine Roh‑Payloads an Clients; Logs nur mit gekürzten Snippets.
  - **Quoten konsolidieren**: Utility für KV‑Usage (JSON {count, resetAt}, TTL) einführen; einheitliche Keys/Resets.
  - **R2‑Proxy bereitstellen**: Route `src/pages/r2-ai/[...path].ts` (oder äquiv.) implementieren und öffentlich halten.
  - **Timeouts/Backoffs** bei externen Calls (Replicate/OpenAI) ergänzen; Telemetrie (Dauer/Status) bereits vorhanden weiter ausbauen.
