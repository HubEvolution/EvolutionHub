---
description: 'Architektur des Voice Visualizers & Transkriptionsdienstes'
owner: 'Voice Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'src/lib/services/voice-transcribe-service.ts, src/pages/api/voice/**'
---

<!-- markdownlint-disable MD051 -->

# Voice Visualizer + Transcriptor — Architektur

## Overview

- **Ziel**: Sprachaufnahmen im Browser (Visualizer + Pegel), segmentiertes Uploaden, serverseitige Normalisierung und Transkription via Whisper‑Provider; Rückgabe von Teil‑Transkripten und Usage/Limits für UI‑Feedback.

- **Status**: Chunk-basiert plus Streaming (SSE/Poll) hinter Flags (`VOICE_STREAM_SSE`, `VOICE_STREAM_POLL`). In Produktion sind beide Flags standardmäßig `0`, in DEV/CI werden sie aktiviert. Tages-Quoten (Gast/User), Rate-Limit, MIME-Validierung, CSRF/Origin bleiben aktiv; optional Dev-Echo (`VOICE_DEV_ECHO=1`) ohne Provider-Call; optionale R2-Archivierung (`VOICE_R2_ARCHIVE`).

## Architektur

```mermaid
sequenceDiagram
  participant U as User (Browser)
  participant I as Island (Voice UI)
  participant A as API (/api/voice/*)
  participant S as Service (voice-transcribe)
  participant P as Provider (Whisper)
  participant KV as KV (usage)

  U->>I: Mikrofon erlauben, Aufnahme starten
  I->>I: MediaRecorder 3s‑Chunks erzeugen
  I->>A: POST /api/voice/transcribe (multipart/form-data, X-CSRF-Token)
  A->>S: Validate + RateLimit + Quota
  S->>S: Container normalisieren (webm/ogg/mp4), Grösse prüfen
  S->>P: Transcribe (wenn OPENAI_API_KEY vorhanden)
  alt Dev‑Echo
    S-->>A: Echo‑Payload (kein Provider‑Call)
  else Normal
    P-->>S: Transkript
  end
  S->>KV: Usage++ (24h‑Fenster)
  A-->>I: JSON { transcript, usage, limits }

```text

### Hauptbausteine

- `src/pages/api/voice/transcribe.ts`: POST-Endpoint (Multipart, CSRF, Same-Origin, Rate-Limit, Quoten, Fehler-Mapping, Aggregator-Updates für Streaming/Poll).

- `src/pages/api/voice/usage.ts`: GET-Endpoint (aktuelle Nutzung + Limits, setzt `guest_id` Cookie bei Bedarf).

- `src/pages/api/voice/stream.ts`: SSE-Stream (Flag-gated, Heartbeats, initial `jobId`).

- `src/pages/api/voice/poll.ts`: Snapshot Polling (Flag-gated, liefert `status`, `partials`, `final`, `usage`).

- `src/lib/services/voice-transcribe-service.ts`: Normalisierung, Provider-Call, Error-Mapping, Usage-Aktualisierung, optional R2-Archiv.

- `src/lib/services/voice-stream-aggregator.ts`: KV-State (partielle/finale Transkripte, Usage) + Rollbacks.

- `src/config/voice/`: erlaubte MIME-Typen, Max-Größen, Default-Modelle, Entitlements.

- UI: `src/components/tools/voice-visualizer/*` (Islands, Hooks, Streaming/Poll Integration).

## Security & Middleware

- API‑Routen mit `withApiMiddleware` aus `src/lib/api-middleware.ts` (gemäß Projektregeln):

  - **CSRF/Same‑Origin**: Standard aktiviert; Double‑Submit optional via `X-CSRF-Token` ↔ `csrf_token`.

  - **Security‑Headers**: HSTS, X‑Frame‑Options `DENY`, `nosniff`, strikte `Permissions-Policy`.

- **Permissions‑Policy (Mikrofon)**: Tools‑Route erhält eine Route‑Ausnahme für `microphone=()`, damit die Seite den Zugriff explizit anfragt (siehe `src/middleware.ts`).

  - Regex deckt neutrale und lokalisierte Pfade ab: `^\/(?:(?:de|en)\/)?tools\/voice-visualizer(?:\/app)?\/?$`.

  - DE ist neutral (kein `/de`‑Prefix), EN lebt unter `/en/...`.

- `KV_VOICE_TRANSCRIBE` (KV‑Namespace für Usage/Quoten).

- Wrangler‑Bindings je Environment (siehe `wrangler.toml`).

Zusätzliche Flags/Funktionalität:

- `VOICE_STREAM_SSE` ("1"/"0"): aktiviert/deaktiviert `GET /api/voice/stream` SSE-Streaming.

- `VOICE_STREAM_POLL` ("1"/"0"): aktiviert/deaktiviert `GET /api/voice/poll` Polling-Endpoint.

- `VOICE_R2_ARCHIVE` ("1"/"0"): optionale Roh‑Audio‑Archivierung nach R2 (keine PII im Key).

- `VOICE_DEV_ECHO` ("1"/"0"): Dev‑Echo‑Bypass für Provider‑Call (nützlich in Integration/CI).

Hinweise DEV:

- Aggregator (`VoiceStreamAggregator`) ist KV‑optional gehärtet → in lokaler DEV ohne KV keine Exceptions; Snapshot wird best‑effort gehalten.

Siehe vollständige Schemas/Fehlerfälle in `openapi.yaml` (`/api/voice/transcribe`, `/api/voice/usage`).

## Client‑Module

- `hooks/useMicrophone.ts`: Geräte-Zugriff, Visualizer-Daten, segmentiertes Chunking mit Fallback MIME-Types.

- `hooks/useTranscribeStream.ts`: SSE/Poll State-Management (Reconnect, Heartbeats, Partial/Final Updates).

- `api.ts`: Upload (multipart), CSRF-Header via `ensureCsrfToken()`, Dateinamen-Normalisierung.

- `VoiceVisualizerIsland.astro`: orchestriert Aufnahme, Streaming/Poll, Usage-Anzeige, Status-Chips (Connected/Backoff/JobId).

- Dev-spezifische Buttons (Test/Laborevents) werden via Flags und `VOICE_DEV_ECHO` gesteuert.

## Routing & i18n

- DE neutral: `src/pages/tools/voice-visualizer/app.astro` (Pfad `/tools/voice-visualizer/app`).

- EN lokalisiert: `src/pages/en/tools/voice-visualizer/app.astro` (Pfad `/en/tools/voice-visualizer/app`).

- Locale‑Switch hält DE neutral; EN benutzt `/en/...` (`src/lib/locale-path.ts`).

## Observability & Debugging

- Requests werden in Middleware geloggt (requestId, Dauer). Client-Logs optional via Debug-Panel (`/api/debug/client-log`).

- Typische Fehler: kein Mikrofon, MIME nicht erlaubt, Chunk zu klein/groß, 429 (Rate-Limit), 403 (Origin/CSRF), Provider-Fehler (Mapping siehe oben).

- Events (Server): `transcribe_api_success`, `transcribe_api_error`, `voice_stream_connected|disconnected|disabled`, `voice_poll_success|not_found|disabled`. Alte Namen (`voice_limit`, `whisper_error`) existieren noch in Legacy-Logs.

- Flags in CI (`wrangler.ci.toml`): `VOICE_STREAM_SSE=1`, `VOICE_STREAM_POLL=1`, `VOICE_R2_ARCHIVE=0`, `VOICE_DEV_ECHO=1`.

- Dev-Test-Skript: `npm run dev:open` → Worker im Dev-Mode (setzt Flags dev-gerecht), Debug-Panel aktiv.

## Risiken & Mitigation

- **SSE‑Drops/Idle‑Timeouts**: Lange Verbindungen können durch Proxies/Netzwerk getrennt werden. Mitigation: Server‑Heartbeats alle ~25s (`:keep-alive\n\n`), Client‑Reconnect mit Exponential Backoff (0.5–8s), Fallback auf Polling nach 3 Fehlversuchen (<60s).

- **CPU‑Time‑Budget**: Workers haben CPU‑Limits, aber Streaming/I/O blockiert CPU nicht. Mitigation: SSE‑Handler führt nur I/O aus; rechenintensive Arbeit bleibt im `POST /api/voice/transcribe`.

- **Concurrent Connections**: Verbindungs‑Limits pro Invocation. Mitigation: Nur 1 aktiver Stream pro `jobId`/Nutzer; neue Verbindung schließt alte.

- **KV Eventual Consistency & Write‑Rate**: KV ist eventual consistent und empfiehlt ≤1 write/sek/Key. Mitigation: Single‑Writer (Upload‑Pfad), 3s‑Chunk‑Kadenz, optional segmentierte Keys `voice:job:{id}:p:{n}` und kompakter Snapshot‑Key; Retry bei get‑modify‑put Konflikten.

- **R2 Sicherheit/PII**: R2 privat, presigned URLs mit kurzer TTL; keine PII in Keys; restriktive CORS. Archivierung per Flag deaktivierbar.

- **CSRF/Origin**: Nur POST erfordert CSRF; GET (SSE/Poll) mit Origin‑Check + Security‑Headers.

## Quick Start

- **SSE verbinden**: Browser öffnet `/api/voice/stream` und liest `jobId` aus dem `connected`‑Event.

- **Kurzes Sprach‑Sample aufnehmen**: 1–2 s via `MediaRecorder`, `audio/webm;codecs=opus`.

- **Upload**: `POST /api/voice/transcribe` mit `chunk`, `sessionId`, `jobId`, `isLastChunk=true`, Header `X‑CSRF‑Token` (Double‑Submit) setzen.

- **Poll**: `GET /api/voice/poll?jobId=…` liefert `usage`‑Anstieg und (je nach Provider) `final`‑Text.

- **Flags**: `VOICE_STREAM_SSE=1`, `VOICE_STREAM_POLL=1`, `VOICE_R2_ARCHIVE=0` (Backout: Flags auf 0 setzen).

Schnell‑Verifikation per curl (DEV):

```sh
JOB="job-$(date +%s)"
curl -i -N --max-time 3 "http://127.0.0.1:8787/api/voice/stream?jobId=$JOB"  # erwartet: 200 + event: connected
curl -i "http://127.0.0.1:8787/api/voice/poll?jobId=$JOB"                     # erwartet: 200 + { status: "active"|snapshot }
```

## Nächste Umsetzungsschritte (konkret)

- **Integration-Test** `tests/integration/api/voice/transcribe-and-poll.test.ts`: Prüft Aggregator (`setFinal`, `setUsage`) mit Dev-Echo.

- **E2E Smoke** `test-suite-v2/src/e2e/voice/stream-and-poll.spec.ts`: Verbindet SSE, prüft Polling, validiert Usage-Chips.

- OpenAPI: `/api/voice/stream`, `/api/voice/poll` dokumentiert (SSE, Snapshot).

- Flags: `VOICE_STREAM_SSE/POLL` in PROD bewusst `0`; toggles nur nach Rollout-Entscheid aktivieren.

- Pending: R2-Archiv (Key-Schema, TTL) & finale Entitlement-Werte (aktuell `free=300`, `pro=600`, `premium=1200`, `enterprise=3000`).

- Observability v1: strukturierte Logs, optional Cloudflare Analytics.

## Offene Entscheidungsfragen

- **Entitlements Zahlen**: Voice‑Tageslimits pro Plan bestätigt? Derzeit in `src/config/voice/entitlements.ts`:

  - `free` = `VOICE_FREE_LIMIT_USER`, `pro` = 600, `premium` = 1200, `enterprise` = 3000.

- **R2 Archiv**: Bucket‑Binding (z. B. `R2_VOICE`), Key‑Schema (keine PII; z. B. `voice/{jobId}/{ts}.webm`), Retention‑Dauer, CORS/Presign‑Fenster.

- **Observability‑Sink**: Wo landen Events/Kennzahlen? (Cloudflare Analytics Engine, Logpush, externes APM?) Namensschema, Sampling.

- **SSE Default in PROD**: Standard an/aus? (Backout via Flags ist vorbereitet.)

## Readiness

- **Implementierungsstand**: SSE/Poll + Aggregator live; Client‑Hook integriert; API‑Client sendet `jobId`/`isLastChunk`; Aggregator KV‑optional gehärtet; Neutral‑Route (DE) vorhanden; Permissions‑Policy deckt neutral/EN ab; SSE/Poll lokal verifiziert.

- **Datenpunkte vorhanden**: Ja, für Integration‑Tests, Observability (minimal), UI‑Polish. Für R2‑Archivierung fehlen konkrete Bucket/Retention‑Entscheidungen. Für Entitlements ggf. Bestätigung der Zahlen.

## Referenzen

- Code: `src/pages/api/voice/transcribe.ts`, `src/pages/api/voice/usage.ts`, `src/lib/services/voice-transcribe-service.ts`, `src/config/voice/index.ts`

- Doku: `openapi.yaml` (Abschnitte `/api/voice/transcribe`, `/api/voice/usage`)

- Projektregeln: `src/lib/api-middleware.ts`, `src/middleware.ts`, `src/lib/rate-limiter.ts`
