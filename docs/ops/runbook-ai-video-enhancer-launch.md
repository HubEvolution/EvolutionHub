---
description: Runbook für AI Video Enhancer Launch (Upload, Replicate, Quoten, Cohorts)
owner: platform/ops
priority: high
lastSync: '2025-11-29'
codeRefs: 'src/pages/api/ai-video/**, src/config/ai-video/**, src/lib/validation/schemas/ai-video.ts, src/lib/rate-limiter.ts'
testRefs: 'tests/integration/api/ai-video/**, tests/integration/api/ai-video-usage.test.ts, tests/src/pages/api/ai-video/**'
---

# Runbook – AI Video Enhancer Launch

## Zweck

Betriebshandbuch für den Launch des AI Video Enhancers (Replicate‑basierter Video‑Upscaler) mit Fokus auf Upload‑Guardrails, Quoten/Entitlements, Cohorts und Rollback.

Ergänzt:

- `.windsurf/rules/video-enhancer.md`
- `docs/ops/tool-launch-matrix.md` (globale Phasenmatrix)

## Environments & Provider

- **Provider**
  - Replicate‑Modell(e) für Video‑Upscaling (z. B. Topaz/ähnliche Pipelines; Details in `src/config/ai-video/**`).
- **Env‑Variablen (pro Env, Auszug)**
  - `REPLICATE_API_TOKEN` – zwingend für Staging/Production, in Testing/Local idealerweise NICHT gesetzt.
  - `R2_AI_IMAGES` – R2-Bucket mit Pfaden `ai-video/uploads/...` und `ai-video/results/...`.
  - `ENVIRONMENT ∈ {development, testing, staging, production}`
  - Optionale Feature‑Flags (falls vorhanden, z. B.):
    - `ENABLE_VIDEO_ENHANCER=0|1` – globales Gate für das Video‑Tool in bestimmten Envs.

## Upload, Sicherheit & Limits

- **Upload & Validierung**
  - Form‑Data Felder (vereinfacht):
    - `file` (Video),
    - `tier` ∈ {`720p`, `1080p`},
    - `durationMs` ≥ 1.
  - MIME‑Allowlist: `video/mp4`, `video/quicktime`, `video/webm`.
  - Größen‑ und Laufzeit‑Limits per Tier:
    - `MAX_UPLOAD_BYTES_TIER[tier]`, `MAX_DURATION_SECONDS_TIER[tier]` (siehe Config/Doku).
  - Uploads in R2 unter `ai-video/uploads/...`, Ergebnisse unter `ai-video/results/<ownerType>/<ownerId>/*`.
- **Quoten & Rate-Limits**
  - Rate‑Limiter: `aiJobsLimiter` (z. B. 10/min), für Upload/Generate/Poll.
  - Quoten/Entitlements (vereinfacht):
    - Besitzer bestimmt durch `ownerType ∈ {user, guest}`; pro Besitzer werden Quoten/Verbrauch in KV/D1 gezählt.
    - Limits abhängig von Plan + Credits (analog Image‑Entitlements, aber teurer pro Job).

### Cohorts (global)

- **C0** – intern / Friends & Family (Team, gezielt eingeladene Tester)
- **C1** – zahlende Pläne (Pro / Premium / Enterprise)
- **C2** – alle eingeloggten User (inkl. Free)
- **C3** – Gäste / nicht eingeloggte Besucher

## Phasenmatrix (AI Video Enhancer)

Auszug aus `docs/ops/tool-launch-matrix.md` für AI Video Enhancer:

| Tool              | Phase | Cohort             | Env/Flags (Prod, exemplarisch) | Limits / Notizen                                     |
|-------------------|-------|--------------------|---------------------------------|------------------------------------------------------|
| AI Video Enhancer | Vd1   | C1 klein (Premium) | ggf. ENABLE_VIDEO_ENHANCER=1   | 1–2 Videos/Tag, 720p; klares Beta‑Label              |
| AI Video Enhancer | Vd2   | C1 erweitert/C2    | wie Vd1                         | Nur nach Kostenreview; Free und Gäste ausgeschlossen |

- **Vd1**: sehr kleiner Start für Premium/Enterprise (oder ausgewählte Pro‑User), niedriges Limit, 720p.
- **Vd2**: ggf. Ausweitung innerhalb C1 und optional C2 (aber ohne Free/Gäste), nur bei klar positiver Kostenbilanz.

## Launch-Prozedur

### Phase Vd1 – Launch für kleine C1‑Kohorte

**Ziel**: AI Video Enhancer als Beta für wenige zahlende User freigeben, mit sehr konservativen Limits.

#### Prod-Launch-Checkliste Vd1 (Kurzfassung)

Diese Checkliste gilt für **Production** und fasst die wichtigsten Schritte für Vd1 zusammen:

- **1. Technische Preflights**
  - `npm run openapi:validate`
  - `npm run test:integration -- ai-video`
- **2. UI/API-Smokes (Prod)**
  - `POST /api/ai-video/upload` mit kurzem Testvideo (unterhalb Tier-Limit) → `200`.
  - `POST /api/ai-video/generate` → Job startet, Status `pending/processing`.
  - `GET /api/ai-video/jobs/:id` als Owner → `200` + Ergebnis-URL; als Nicht-Owner → `forbidden`.
  - Im UI: Tool nur für Beta-C1-User sichtbar, klar als „Beta“ markiert.
- **3. Nach Deploy beobachten**
  - Job-Anzahl, Fehler-/Timeout-Rate, Replicate-Kosten pro Job.
- **4. Rollback-Pfad im Kopf behalten**
  - Bei Problemen: Plan-Gates wieder auf sehr kleine C1-Kohorte beschränken oder Upload/Generate temporär per Guard/Flag deaktivieren (siehe Abschnitt „Rollback“).

1. **Preflight-Checks (Testing/Staging)**
   - `npm run openapi:validate` (AI‑Video‑Endpunkte entsprechend dokumentiert).
   - `npm run test:integration -- ai-video` (inkl. Upload/Generate/Usage/Poll‑Flows).
   - Zusätzliche manuelle Tests auf Staging:
     - Upload eines kurzen Testvideos (z. B. ~5–10s, 720p) → erfolgreicher Job, Resultat unter `/r2-ai/...` abrufbar.
     - Negativfälle: zu langes Video, zu großes File, falscher MIME‑Type → `validation_error`.

2. **Provider‑Setup auf Staging**
   - `REPLICATE_API_TOKEN` in Staging gesetzt.
   - Sicherstellen, dass in Testing/Local kein echter Replicate‑Traffic entsteht (kein Secret, ggf. Hard‑403).

3. **UI-Exposure (Staging)**
   - Tool‑Seiten:
     - `/tools/video-enhancer/app` (DE/EN Varianten).
   - Sicherstellen, dass:
     - Tool nur für ausgewählte C1‑User sichtbar ist (z. B. Premium/Enterprise oder Whitelist von IDs).
     - Deutlich sichtbares „Beta“‑Label im UI.

4. **Prod-Rollout Vd1**
   - Bedingungen:
     - Integrationstests grün; manuelle Staging‑Smokes ok.
   - Schritte:
     - `REPLICATE_API_TOKEN` in Production gesetzt.
     - Optional: `ENABLE_VIDEO_ENHANCER=1` in Production‑Env.
     - Deploy auf Production.
   - Direkt nach Deploy (Prod‑Smokes, C1‑User):
     - 1–2 kurze Videos durch den Flow schicken (Upload → Generate → Download/View Result).
     - Job‑Status und Quoten (Usage/429) verifizieren.

5. **Beobachtung nach Vd1**
   - Enges Monitoring in den ersten Tagen:
     - Provider‑Kosten pro Job und insgesamt.
     - Fehler‑/Timeout‑Rate.
     - User‑Feedback (Qualität, Dauer, Zuverlässigkeit).

### Phase Vd2 – Ausbau innerhalb C1 / optional C2

**Ziel**: Video‑Enhancer breiter für zahlende User verfügbar machen, ohne Free/Gäste.

1. **Bedingungen für Start von Vd2**
   - Klare positive Kosten‑/Value‑Bilanz in Vd1.
   - Kein Hinweis auf Missbrauch oder zu hohe Providerkosten.

2. **UI-Exposure Vd2**
   - Plan‑Gates erweitern:
     - Tool sichtbar für alle gewünschten C1‑Pläne (z. B. Pro/Premium/Enterprise).
   - Free/Gäste bleiben ausgeschlossen (nur CTA/Upgrade oder „Coming Soon“).

3. **Prod-Rollout Vd2**
   - UI‑Anpassungen deployen.
   - Monitoring für:
     - Anstieg der Runs pro Tag.
     - Kostenentwicklung und Rate‑Limits.

## Smoke-Tests & Validierung

### API-Smokes (Prod)

- `POST /api/ai-video/upload`
  - Gültiges Video (unterhalb des Tiers‑Limits) → 200 + Job‑ID/Pfad (abhängig vom Design).
- `POST /api/ai-video/generate`
  - Mit zuvor hochgeladenem Video → Start eines Jobs, Status `pending`/`processing`.
- `GET /api/ai-video/jobs/:id`
  - Für Owner (Session/guest_id) → 200 mit Status `completed`/`failed` + Ergebnis‑URL.
  - Für Nicht‑Owner → `forbidden`.
- `GET /api/ai-video/usage`
  - Erwartung: sinnvolle Limits/Usage pro User.

### UI-Smokes

- `/tools/video-enhancer/app` (DE/EN):
  - In Vd1: sichtbar nur für Beta‑C1‑User; mind. 1 vollständiger End‑to‑End‑Lauf möglich.
  - In Vd2: sichtbar für alle gewünschten C1‑User; Free/Gäste ohne funktionalen Zugriff.

## Monitoring

- **Metriken**
  - Anzahl Video‑Jobs (Upload/Generate) pro Tag, pro Plan.
  - Fehlertypen (`validation_error`, `forbidden`, `rate_limit`, `server_error`).
- **Limits & Quoten**
  - 429‑Rate, besonders nach Erweiterung in Vd2.
  - Job‑Abbruch‑/Fehlerrate.
- **Kosten**
  - Replicate‑Kosten pro Monat/Job.
  - Vergleich mit Stripe‑Umsätzen für die betroffenen Pläne.

## Rollback

Rollback bringt das System zurück auf Vd1 (kleine C1‑Kohorte) oder komplett „off“.

1. **UI-Rollback Vd2 → Vd1**
   - Plan‑Gates wieder auf kleine C1‑Kohorte beschränken.
   - Free/Gäste bleiben ohne Zugriff.

2. **Provider‑Rollback**
   - Temporär keine neuen Video‑Jobs erlauben:
     - Upload/Generate‑Routen mit `forbidden`/`maintenance`-Fehler (via Guard/Flag) beantworten.
   - `REPLICATE_API_TOKEN` in Production nicht entfernen, um spätere Reaktivierung einfach zu halten – stattdessen Funktion über Flags/Guards steuern.

3. **Nach Rollback prüfen**
   - Rückgang der Jobs/Kosten.
   - Keine neuen 5xx‑Spitzen.
   - UI spiegelt den eingeschränkten Zustand korrekt wider.

## Referenzen

- **Regeln & Doku**
  - `.windsurf/rules/video-enhancer.md`
  - `docs/ops/tool-launch-matrix.md`
- **Code**
  - `src/pages/api/ai-video/**`
  - `src/config/ai-video/**`
  - `src/lib/validation/schemas/ai-video.ts`
  - `src/lib/rate-limiter.ts`
- **UI**
  - `src/pages/en/tools/video-enhancer/`
  - `src/pages/de/tools/video-enhancer/`
- **Tests**
  - `tests/integration/api/ai-video/**`
  - `tests/integration/api/ai-video-usage.test.ts`
  - `tests/src/pages/api/ai-video/**`
