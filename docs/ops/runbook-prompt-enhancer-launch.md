---
description: Runbook für Prompt Enhancer Launch (Phasen, Cohorts, Flags, Limits)
owner: platform/ops
priority: high
lastSync: '2025-11-29'
codeRefs: 'src/pages/api/prompt-enhance.ts, src/pages/api/prompt/usage.ts, src/lib/services/prompt-enhancer-service.ts, src/lib/validation/schemas/prompt.ts, src/lib/rate-limiter.ts'
testRefs: 'tests/integration/api/prompt-enhance.test.ts, tests/integration/api/prompt-usage.test.ts, tests/e2e/specs/prompt-enhancer.spec.ts'
---

# Runbook – Prompt Enhancer Launch

## Zweck

Betriebshandbuch für den Launch des Prompt Enhancers über mehrere Phasen (Cohorts), inklusive Flags, Limits, Monitoring und Rollback. Ergänzt die globale **Tool-Launch-Matrix** (`docs/ops/tool-launch-matrix.md`) um konkrete Schritte für dieses Tool.

## Environments & Flags

- **Envs (per Wrangler je Env)**
  - `ENVIRONMENT ∈ {development, testing, staging, production}`
  - `BASE_URL`, `PUBLIC_SITE_URL`
- **Prompt-spezifisch**
  - Kein dedizierter Env-Flag für „enabled“ vorgesehen; Launch-Steuerung erfolgt primär über:
    - UI-Visibility (welche User sehen das Tool?)
    - Quoten + Rate-Limits (serverseitig)
- **Rate-Limits & Quoten** (siehe `.windsurf/rules/prompt.md`, OpenAPI, Service-Code)
  - Rate-Limiter: z. B. `promptEnhanceLimiter` (ca. 15/min)
  - Quoten (Tageslimits, serverseitig):
    - Gäste: z. B. 5/Tag
    - Eingeloggte User: z. B. 20/Tag
  - `429`-Antworten tragen `Retry-After` und folgen dem globalen Error-Shape.

### Cohorts (global)

- **C0** – intern / Friends & Family (Team, gezielt eingeladene Tester)
- **C1** – zahlende Pläne (Pro / Premium / Enterprise)
- **C2** – alle eingeloggten User (inkl. Free)
- **C3** – Gäste / nicht eingeloggte Besucher

## Phasenmatrix (Prompt Enhancer)

Auszug aus `docs/ops/tool-launch-matrix.md` für den Prompt Enhancer:

| Tool            | Phase | Cohort         | Env/Flags (Prod, exemplarisch) | Limits / Notizen                                      |
|-----------------|-------|----------------|---------------------------------|-------------------------------------------------------|
| Prompt Enhancer | P1    | C1 + C2 (User) | –                               | Quoten & Rate-Limit wie spezifiziert; Gäste noch aus  |
| Prompt Enhancer | P2    | C3 (Guests)    | –                               | Gäste optional; 5/Tag strikt durchsetzen              |

- **P1**: Launch für eingeloggte User (Free + Pro/Premium/Enterprise), Gäste sind ausgeschlossen.
- **P2**: Optionaler Ausbau auf Gäste; nur bei akzeptabler Kosten-/Abuse-Lage.

## Launch-Prozedur

### Phase P1 – Launch für eingeloggte User (C1 + C2)

**Ziel**: Prompt Enhancer für alle eingeloggten User aktivieren, Gäste explizit ausschließen.

#### Prod-Launch-Checkliste P1 (Kurzfassung)

Diese Checkliste gilt für **Production** (nicht nur Staging) und fasst die wichtigsten Schritte aus diesem Runbook zusammen:

- **1. Technische Preflights**
  - `npm run openapi:validate`
  - `npm run test:integration -- prompt` (oder gezielt die relevanten Suites)
  - `npm run test:e2e -- tests/e2e/specs/prompt-enhancer.spec.ts`
- **2. UI/API-Smokes (Prod)**
  - Als eingeloggter User: `POST /api/prompt-enhance` (kurzer, gültiger Prompt) → `200`, sinnvolle transformierte Antwort.
  - `GET /api/prompt/usage` → sinnvolle `limit`/`remaining`-Werte.
  - Als Gast: kein funktionaler POST (nur CTA/Redirect; kein erfolgreicher Enhance).
- **3. Nach Deploy beobachten**
  - Fehlerquote, 429-Rate, Nutzung pro User, Kosten (Runtime/KV/Logs) über einige Tage beobachten.
- **4. Rollback-Pfad im Kopf behalten**
  - Bei Problemen: Gästezugriff im UI/Handler wieder vollständig sperren (nur eingeloggte User), siehe Abschnitt „Rollback“.

1. **Preflight-Checks (Staging)**
   - `npm run openapi:validate`
   - `npm run test:integration -- prompt` (oder enger: betroffene Suites)
   - `npm run test:e2e -- tests/e2e/specs/prompt-enhancer.spec.ts`
   - Manuelle Smoke-Checks auf Staging:
     - POST `/api/prompt-enhance` mit validem JSON (eingeloggter Test-User) → 200 + sinnvolle Response.
     - GET `/api/prompt/usage` → korrekte `limit`/`remaining`-Werte.

2. **UI-Exposure (Staging)**
   - Sicherstellen, dass das Prompt-Enhancer-Tool nur im **eingeloggten Dashboard** sichtbar ist.
   - Gäste sollten:
     - entweder keinen Zugang zur Tool-Seite haben (Redirect auf Login/Pricing),
     - oder eine „Login/Upgrade“-CTA sehen, aber keinen Funktionsaufruf auslösen können.

3. **Prod-Rollout P1**
   - Bedingungen:
     - Staging-Checks grün (OpenAPI, Integration/E2E, manuelle Smokes).
   - Schritte:
     - Deploy auf Production (Standard-Deploy-Workflow).
     - UI: Prompt Enhancer im Dashboard nur für eingeloggte User sichtbar (Free + Pro/Premium/Enterprise).
   - Direkt nach Deploy:
     - 1–2 manuelle Requests als eingeloggter User:
       - Kurzer Prompt → geprüfte erfolgreiche Enhancement-Response.
       - Mehrere Requests hintereinander, bis Rate-/Quota-Limits sichtbar werden.

4. **Roll-Forward / Vorbereitung P2**
   - Über einige Tage:
     - Fehlerquote, 429-Rate, durchschnittliche Nutzung pro User beobachten.
     - Provider-/Infra-Kosten prüfen (CPU/Runtime, KV, Logs).

### Phase P2 – optionaler Gästelaunch (C3)

**Ziel**: Prompt Enhancer für Gäste öffnen – nur, wenn P1 stabil ist und Kosten im Rahmen bleiben.

1. **Bedingungen für Start von P2**
   - Keine auffälligen `server_error`-Raten oder Missbrauchsmuster.
   - Kosten pro 100 Requests akzeptabel.
   - Quoten & Rate-Limits werden erwartungsgemäß getroffen (429 tritt, aber nicht exzessiv, auf).

2. **UI-Exposure P2**
   - Gäste sehen eine abgespeckte Prompt-Enhancer-UI oder denselben Screen wie eingeloggte User, aber mit **sehr klarer** Limit-Kommunikation (z. B. „5 Enhanced Prompts pro Tag“).
   - Serverseitig bleiben dieselben Quoten hart.

3. **Prod-Rollout P2**
   - UI-Änderung deployen (Gäste können das Tool ausführen).
   - Kurzfristiges, enges Monitoring (erste Tage): Fehler, 429, Missbrauch (z. B. sehr lange Prompts, hohe Frequenz aus gleicher IP).

4. **Stop-Kriterien**
   - Erheblicher Anstieg von `forbidden`/`rate_limit`/`server_error` für Gäste.
   - Absehbar zu hohe Kosten pro Tag.
   - In diesen Fällen: Rollback auf P1 (siehe Abschnitt „Rollback“).

## Smoke-Tests & Validierung

### API-Smokes (Prod)

- **Eingeloggter User**
  - `POST /api/prompt-enhance`
    - Body: minimaler gültiger Prompt (`text` nicht leer, < 1000 Zeichen).
    - Erwartung: `200`, `success: true`, sinnvolle transformierte Ausgabe.
  - `GET /api/prompt/usage`
    - Erwartung: korrekte `limit` und `remaining` (nicht negativ, vernünftiger Wert).

- **Gast (nur P2)**
  - Gleiches Vorgehen wie oben, ggf. mit strengeren Limits.
  - Bei Überschreiten des Tageslimits:
    - Erwartung: `429` + `Retry-After`, `error.type = "rate_limit"` oder vergleichbar definierter Typ.

### UI-Smokes

- Prompt Enhancer im Dashboard:
  - Als eingeloggter User sichtbar und funktional.
  - Als Gast **in P1**: nicht ausgelöst (kein POST) – entweder kein Zugang oder nur CTA.
  - Als Gast **in P2**: Tool funktioniert, aber Limit-Hinweis sichtbar.

## Monitoring

- **Metriken / Logs**
  - Anzahl Requests auf `/api/prompt-enhance` pro Tag (gesplittet nach Guest/User, soweit möglich).
  - Fehlerquote nach Typ (`validation_error`, `forbidden`, `rate_limit`, `server_error`).
  - Verteilung der Response-Zeiten (ggf. Error-Cluster identifizieren).
- **Quoten & Rate-Limits**
  - Anteil der Requests, die mit `429` beantwortet werden.
  - Verhältnis Guest vs. User (insb. nach Beginn von P2).
- **Kosten-Sichtung**
  - Indirekte Kosten (CPU/Runtime, KV, Logging) in den üblichen Monitoring-Tools.

## Rollback

Rollback ist **immer auf P1** bzw. „nur eingeloggte User“ ausgerichtet.

1. **UI-Rollback**
   - Prompt Enhancer im Dashboard:
     - Gäste: wieder nur CTA / Info (kein POST) oder gar nicht sichtbar.
     - Eingeloggte User: Tool weiterhin aktiv.
   - Änderungen via Feature-Flag oder Plan-/Session-Check (Frontend) umsetzen.

2. **API-Rollback (optional, bei Härtefällen)**
   - Falls nötig, zusätzlichen Guard im Handler aktivieren (konfigurierbar via Env‑Flag):
     - Gäste → `403 forbidden` oder `rate_limit` mit klarem Fehlertext.
   - Wichtig: JSON-Error-Shape konsistent lassen (`createApiError`).

3. **Nach Rollback prüfen**
   - Fehlerquote: Rückgang von Gast-bezogenen Fehlern.
   - Keine neuen 5xx-Peaks durch Rollback.
   - UI: Gäste können das Tool nicht mehr auslösen.

## Referenzen

- **Global**
  - `docs/ops/tool-launch-matrix.md`
  - `.windsurf/rules/prompt.md`
- **API & Code**
  - `src/pages/api/prompt-enhance.ts`
  - `src/pages/api/prompt/usage.ts`
  - `src/lib/services/prompt-enhancer-service.ts`
  - `src/lib/validation/schemas/prompt.ts`
  - `src/lib/rate-limiter.ts`
- **Docs**
  - `docs/api/prompt-enhance.md`
  - `docs/tools/prompt-enhancer*.md`
- **Tests**
  - `tests/integration/api/prompt-enhance.test.ts`
  - `tests/integration/api/prompt-usage.test.ts`
  - `tests/e2e/specs/prompt-enhancer.spec.ts`
