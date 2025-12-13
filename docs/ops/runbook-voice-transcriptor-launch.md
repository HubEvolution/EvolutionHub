---
description: Runbook für Voice Visualizer + Transcriptor Launch (Upload, Limits, SSE/Poll)
owner: platform/ops
priority: high
lastSync: '2025-11-29'
codeRefs: 'src/pages/api/voice/**, src/lib/services/voice-transcribe-service.ts, src/lib/services/voice-stream-aggregator.ts, src/config/voice/**, src/lib/validation/schemas/voice.ts, src/lib/validation/voice-mime-sniffer.ts, src/middleware.ts'
testRefs: 'tests/integration/api/voice-transcribe.test.ts, tests/integration/api/voice/**, tests/integration/routing/voice-visualizer-permissions.test.ts, tests/unit/voice/**, tests/unit/voice-stream-aggregator.test.ts'
---

# Runbook – Voice Visualizer & Transcriptor Launch

## Zweck

Betriebshandbuch für den Launch des Voice Visualizer + Transcriptor Tools (Whisper-MVP mit SSE/Poll), inklusive Upload-Guardrails, Limits, Cohorts, Monitoring und Rollback. Ergänzt:

- `docs/architecture/voice-visualizer-transcriptor.md`
- Voice-Regeln: `.windsurf/rules/transcriptor.md`
- globale `docs/ops/tool-launch-matrix.md`

## Environments & Bindings

- **Env-Variablen / Bindings (pro Env)**
  - `OPENAI_API_KEY` (oder entsprechender AI-Provider; für Whisper-Calls erforderlich, außer in Dev-Echo-Modus)
  - `WHISPER_MODEL` (z. B. `whisper-1`)
  - `KV_VOICE_TRANSCRIBE` (KV-Namespace für Transkriptionsjobs/Quoten)
  - Optional: `R2_VOICE` (R2-Bucket für optionale Archivierung)
  - `ENVIRONMENT ∈ {development, testing, staging, production}`
- **Feature-Flags / Verhalten** (siehe `.windsurf/rules/transcriptor.md` und Architektur-Doku)
  - `VOICE_STREAM_SSE=1` – aktiviert SSE-Stream (`GET /api/voice/stream`)
  - `VOICE_STREAM_POLL=1` – aktiviert Poll-Endpunkt (`GET /api/voice/poll`)
  - `VOICE_R2_ARCHIVE=0|1` – optionales Persistieren von Audios/Transkripten nach R2
  - `VOICE_DEV_ECHO=1` – Dev-Echo-Modus, wenn kein echter Provider/Key verfügbar (nur Dev/Testing)

## Sicherheit & Upload-Guardrails

- **Upload & MIME**
  - Multipart-Upload (`POST /api/voice/transcribe`)
  - MIME-Allowlist: `audio/mpeg`, `audio/wav`, `audio/webm` (siehe `src/config/voice/index.ts` und `voice-mime-sniffer`)
  - Größen-/Chunk-Limit: `VOICE_MAX_CHUNK_BYTES` (z. B. ~1.2 MB pro Chunk)
- **Limits & Quoten**
  - Rate-Limiter: `voiceTranscribeLimiter` (ca. 15/min)
  - Tages-/Rolling-Quoten:
    - Gäste: z. B. 60 Chunks/Tag
    - User: z. B. 300 Chunks/Tag
  - Quoten serverseitig über KV/D1 enforced (siehe Service & Konfiguration).
- **Permissions-Policy**
  - Mikrofon-Permission nur auf Tool-Seiten erlaubt:
    - `/tools/voice-visualizer[/app]` (DE/EN Varianten) via `src/middleware.ts` Route-Scoped Policy.

### Cohorts (global)

- **C0** – intern / Friends & Family (Team, gezielt eingeladene Tester)
- **C1** – zahlende Pläne (Pro / Premium / Enterprise)
- **C2** – alle eingeloggten User (inkl. Free)
- **C3** – Gäste / nicht eingeloggte Besucher

## Phasenmatrix (Voice / Transcriptor)

Auszug aus `docs/ops/tool-launch-matrix.md` für Voice/Transcriptor:

| Tool               | Phase | Cohort           | Env/Flags (Prod, exemplarisch)                                 | Limits / Notizen                                 |
|--------------------|-------|------------------|-----------------------------------------------------------------|--------------------------------------------------|
| Voice / Transcriptor | V1  | C1 (Pro/Premium) | VOICE_STREAM_SSE=1, VOICE_STREAM_POLL=1, VOICE_R2_ARCHIVE=0    | Konservative Tagesquoten, kurze Clips bevorzugt  |
| Voice / Transcriptor | V2  | C2 (alle User)   | wie V1                                                          | Quoten nach realer Nutzung nachziehen            |

- **V1**: Launch für Pro/Premium (C1), mit SSE + Poll, ohne R2-Archivierung (Performance- & Kosten-Schutz).
- **V2**: Ausbau auf alle eingeloggten User (C2), Quoten auf Basis realer Nutzung nachjustiert.

## Launch-Prozedur

### Phase V1 – Launch für Pro/Premium (C1)

**Ziel**: Voice-Tool für eine begrenzte Kohorte zahlender User (Pro/Premium/Enterprise) aktivieren.

#### Prod-Launch-Checkliste V1 (Kurzfassung)

Diese Checkliste gilt für **Production** und fasst die wichtigsten Schritte für V1 zusammen:

- **1. Technische Preflights**
  - `npm run openapi:validate` (falls Voice-Endpunkte im OpenAPI dokumentiert sind)
  - `npm run test:integration -- voice`
  - `npm run test:unit -- voice` (inkl. `voice-mime-sniffer`, `voice-stream-aggregator`)
- **2. UI/API-Smokes (Prod)**
  - `POST /api/voice/transcribe` mit kleinem, erlaubtem Audio → `200`, `success: true`.
  - `GET /api/voice/usage` → sinnvolle Limits/Usage.
  - Im UI: Voice-Tool nur für C1-User sichtbar; Gäste/Free haben keinen funktionalen Zugriff.
- **3. Nach Deploy beobachten**
  - Fehler-/429-Rate, durchschnittliche Audiodauer, Provider-Fehler und Kosten pro Minute.
- **4. Rollback-Pfad im Kopf behalten**
  - Bei Problemen: Plan-Gates wieder enger auf C1, Quoten für Free/Guests schließen oder senken (siehe Abschnitt „Rollback“).

1. **Preflight-Checks (Testing/Staging)**
   - `npm run openapi:validate` (falls Voice-Endpunkte im OpenAPI dokumentiert sind).
   - `npm run test:integration -- voice` (oder enger: `voice-transcribe.test.ts`, `tests/integration/api/voice/**`).
   - `npm run test:unit -- voice` (inkl. `voice-mime-sniffer`, `voice-stream-aggregator`).
   - E2E/Tool-Smokes (falls vorhanden) gegen Staging/Testing:
     - Upload kleiner Audio-Samples → Transkript wird im UI angezeigt.
     - SSE-Stream (`/api/voice/stream`) und Poll (`/api/voice/poll`) verhalten sich wie dokumentiert.

2. **Flags auf Staging setzen**
   - `VOICE_STREAM_SSE=1`
   - `VOICE_STREAM_POLL=1`
   - `VOICE_R2_ARCHIVE=0` (vorerst keine dauerhafte Archivierung)
   - In Dev/Testing: `VOICE_DEV_ECHO=1`, sofern kein echter Provider-Call gewünscht ist.

3. **UI-Exposure (Staging)**
   - Tool-Seiten:
     - `src/pages/en/tools/voice-visualizer/`
     - `src/pages/de/tools/voice-visualizer/`
   - Sicherstellen, dass:
     - Nur eingeloggte User mit entsprechendem Plan (C1) das Tool sehen (Plan-Check im Dashboard/Tools-Bereich).
     - Gäste und Free-User entweder gar kein Voice-Tool im UI sehen oder nur eine CTA/Upgrade-Hinweis bekommen.

4. **Prod-Rollout V1**
   - Bedingungen:
     - Tests (Integration/Unit/E2E) grün.
     - Staging-Funktionstests (Upload, SSE, Poll, Quoten) ok.
   - Schritte:
     - Flags in Production setzen:
       - `VOICE_STREAM_SSE=1`, `VOICE_STREAM_POLL=1`, `VOICE_R2_ARCHIVE=0`.
     - Deploy auf Production.
   - Direkt nach Deploy (Prod-Smokes, mit Pro/Premium-Testuser):
     - Kurzes Audio aufnehmen/hochladen → Transkript wird im UI sichtbar.
     - Quoten/Limits testen (z. B. viele kurze Chunks senden und `429`/Quota-Fehler beobachten).

5. **Beobachtung nach V1**
   - Über die ersten Tage/Wochen:
     - Fehlerquote, 429-Rate, Timeouts und Provider-Fehler (OpenAI/Ai-Provider) beobachten.
     - Kosten pro N Minuten Audio grob abschätzen.

### Phase V2 – Ausbau auf alle eingeloggten User (C2)

**Ziel**: Voice-Tool für alle eingeloggten User (inkl. Free) öffnen, wenn V1 stabil und kostenseitig tragbar ist.

1. **Bedingungen für Start von V2**
   - Stabiler Betrieb in V1 (keine kritischen Incidents).
   - Kosten pro User/Minute im Zielkorridor.
   - Kein Hinweis auf massiven Missbrauch.

2. **UI-Exposure V2**
   - Plan-Gates anpassen:
     - Tool sichtbar für alle eingeloggten User (C2), ggf. mit Plan-abhängigen Limits (Free vs. Pro/Premium).
   - Quoten:
     - Free mit konservativerem Tageslimit.
     - Pro/Premium wie in V1 oder moderat angepasst.

3. **Prod-Rollout V2**
   - Deploy der UI-Änderungen (Plan-Gates).
   - Kurzfristiges Monitoring (erste Tage) für:
     - Veränderung der Gesamtauslastung.
     - 429/Quota-Fehler pro Plan.
     - Eventuelle Timeouts/Provider-Engpässe.

4. **Optional: R2-Archivierung (VOICE_R2_ARCHIVE=1)**
   - Nur aktivieren, wenn Storage-Kosten bewusst eingeplant und SLOs klar sind.
   - Separate Tests: Schreiben/Lesen von archivierten Transkripten/Audios über R2.

## Smoke-Tests & Validierung

### API-Smokes (Prod)

- `POST /api/voice/transcribe`
  - Gültiges Multipart-Audio (erlaubter MIME-Type, im Größenlimit).
  - Erwartung: `200`, `success: true`, (ggf. asynchroner Fortschritt über SSE/Poll).
- `GET /api/voice/usage`
  - Erwartung: korrekte Limit-/Usage-Werte pro User/Guest.
- Grenzfälle:
  - Nicht erlaubter MIME-Type → `validation_error`.
  - Überschreitung Größen-/Chunk-Limit → `validation_error` oder spezifizierter Fehler.
  - Überschreitung Quoten → `429` + `Retry-After`.

### SSE & Poll-Smokes

- `GET /api/voice/stream`
  - Als berechtigter User → erfolgreicher SSE-Connect, Events wie dokumentiert (`voice_stream_*`).
  - Als unberechtigter Pfad/User → `403`/`404` gemäß Architektur.
- `GET /api/voice/poll`
  - Erwartung: Poll liefert aktuelle Status/Teilergebnisse für vorhandene Jobs.

### UI-Smokes

- Tools-Seiten `…/tools/voice-visualizer` (DE/EN):
  - Als C1 in V1: Tool sichtbar, Aufnahme/Upload → Transkript erscheint.
  - Als Free/C2 in V1: kein Tool (oder nur CTA/Upgrade).
  - Als C2 in V2: Tool für alle eingeloggten User sichtbar.
  - Gäste: kein funktionierender Zugriff (CTA/Redirect).

## Monitoring

- **Metriken**
  - Anzahl Transkriptionsjobs pro Tag, nach Plan (Free/Pro/Premium) und Guest/User.
  - Fehlertypen (`validation_error`, `forbidden`, `rate_limit`, `server_error`).
  - Rate von `voice_stream_*`-Events (SSE-Verbindungen).
- **Limits & Quoten**
  - 429-Rate, pro Plan und Guest/User.
  - Durchschnittliche Audiodauer pro Job.
- **Kosten**
  - Provider-Kosten (OpenAI o. ä.) pro Monat, pro User/Minute.
  - Storage-Kosten bei aktiviertem `VOICE_R2_ARCHIVE`.

## Rollback

Rollback bringt das System jeweils auf V1 (nur C1) oder, falls nötig, auf einen strikt begrenzten Maintenance-Zustand.

1. **UI-Rollback (V2 → V1)**
   - Plan-Gates wieder auf C1 beschränken:
     - Tool nur für Pro/Premium/Enterprise sichtbar.
     - Free-User sehen CTA/Upgrade, Gäste sehen nichts Funktionales.

2. **API-Rollback (temporär)**
   - Quoten für Free/Guest drastisch senken oder Requests blockieren (Guest → `403`), falls Kosten/Missbrauch außer Kontrolle geraten.
   - Im Extremfall: optionaler Wartungsmodus für `/api/voice/*` (z. B. `503` mit sauberem JSON-Error via `createApiError`).

3. **Flags**
   - Bei SSE/Poll-Problemen: testweise `VOICE_STREAM_SSE=0` oder `VOICE_STREAM_POLL=0` in Production setzen (nur wenn Architektur das vorsieht und getestet wurde).
   - Archivierungs-Feature bei Kostenproblemen: `VOICE_R2_ARCHIVE=0`.

4. **Nach Rollback prüfen**
   - Reduktion der Problemfälle (Fehler/Kosten).
   - Kein Anstieg neuer 5xx-Fehler durch fehlerhafte Guards.
   - UI spiegelt die eingeschränkte Verfügbarkeit korrekt wider.

## Referenzen

- **Architektur & Regeln**
  - `docs/architecture/voice-visualizer-transcriptor.md`
  - `.windsurf/rules/transcriptor.md`
- **Code**
  - `src/pages/api/voice/transcribe.ts`
  - `src/pages/api/voice/usage.ts`
  - `src/pages/api/voice/stream.ts` (falls vorhanden)
  - `src/pages/api/voice/poll.ts` (falls vorhanden)
  - `src/lib/services/voice-transcribe-service.ts`
  - `src/lib/services/voice-stream-aggregator.ts`
  - `src/config/voice/index.ts`
  - `src/lib/validation/schemas/voice.ts`
  - `src/lib/validation/voice-mime-sniffer.ts`
  - `src/middleware.ts`
- **UI**
  - `src/components/tools/voice-visualizer/VoiceVisualizerIsland.tsx`
  - `src/pages/en/tools/voice-visualizer/`
  - `src/pages/de/tools/voice-visualizer/`
- **Tests**
  - `tests/integration/api/voice-transcribe.test.ts`
  - `tests/integration/api/voice/**`
  - `tests/integration/routing/voice-visualizer-permissions.test.ts`
  - `tests/unit/voice/**`
  - `tests/unit/voice-stream-aggregator.test.ts`
