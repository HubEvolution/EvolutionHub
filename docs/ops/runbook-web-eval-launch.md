---
description: Runbook für Web-Eval Launch (API, Executor, SSRF, Phasen, Cohorts)
owner: platform/ops
priority: high
lastSync: '2025-11-29'
codeRefs: 'src/pages/api/testing/evaluate/**, src/lib/testing/web-eval/**, src/config/web-eval/**, src/lib/validation/schemas/web-eval.ts, src/pages/en/tools/web-eval/**, src/pages/de/tools/web-eval/**'
testRefs: 'tests/integration/api/web-eval-*.test.ts, tests/integration/api/admin-web-eval-tasks.test.ts, tests/unit/testing/web-eval/**'
---

# Runbook – Web-Eval Launch

## Zweck

Betriebshandbuch für den Launch des Web-Eval-Tools (Serverseitige Evaluierung von Webseiten mit Executor-Backend), inklusive Flags, SSRF-Schutz, Cohorts, Monitoring und Rollback.

Dieses Runbook ergänzt:

- `docs/ops/web-eval-executor-runbook.md` (Executor-spezifische Details)
- `docs/ops/tool-launch-matrix.md` (globale Phasenmatrix)

## Environments & Flags

- **Env-Variablen / Flags (pro Env)**
  - `WEB_EVAL_ENABLE_PROD=0|1` – schaltet Web-Eval API/Tool in Production grundsätzlich frei.
  - `WEB_EVAL_EXEC_ALLOW_PROD=0|1` – erlaubt Executor-Ausführung in Production.
  - `WEB_EVAL_ALLOWED_ORIGINS` – SSRF-Allowlist (z. B. `https://hub-evolution.com,https://www.hub-evolution.com`).
  - `WEB_EVAL_AUTO_ASSERTIONS_ENABLE=0|1` – aktiviert Auto-Assertions-Layer (deterministische Heuristik) für Create-Requests ohne assertions-Feld.
  - `WEB_EVAL_EXECUTOR_TOKEN` – Secret für `/api/testing/evaluate/[id]/complete` (Executor-Callback).
- **Sonstige relevante Settings**
  - `ENVIRONMENT ∈ {development, testing, staging, production}`
  - `BASE_URL`, `PUBLIC_SITE_URL`

## Sicherheit & SSRF-Schutz

- SSRF-Schutz basiert auf Allowlist/Checks in den Web-Eval-Routen/Services:
  - Nur URLs mit erlaubtem Schema (`http`, `https`).
  - Validierung der Ziel-Hostnamen gegen `WEB_EVAL_ALLOWED_ORIGINS` (v. a. für Browser-Runner / bestimmte Envs).
  - Negative Tests (lokale/Loopback/Private IPs) durch Integrationstests abgesichert.
- Executor-Endpunkt `/api/testing/evaluate/[id]/complete`:
  - Nur mit gültigem `X-Executor-Token` (muss `WEB_EVAL_EXECUTOR_TOKEN` matchen).
  - Kein CSRF, da rein interner/externer Executor-Aufruf.

### Cohorts (global)

- **C0** – intern / Friends & Family (Team, gezielt eingeladene Tester)
- **C1** – zahlende Pläne (Pro / Premium / Enterprise)
- **C2** – alle eingeloggten User (inkl. Free)
- **C3** – Gäste / nicht eingeloggte Besucher

## Phasenmatrix (Web-Eval)

Auszug aus `docs/ops/tool-launch-matrix.md` für Web-Eval:

| Tool    | Phase | Cohort          | Env/Flags (Prod, exemplarisch)                               | Limits / Notizen                                     |
|---------|-------|-----------------|---------------------------------------------------------------|------------------------------------------------------|
| Web-Eval | W1   | C1 (Power User) | WEB_EVAL_ENABLE_PROD=1, WEB_EVAL_EXEC_ALLOW_PROD=1          | UI nur für Admin/Power-User; Auto-Assertions ggf. off|
| Web-Eval | W2   | C2 (User)       | wie W1, optional WEB_EVAL_AUTO_ASSERTIONS_ENABLE=1          | Mehr Logging; SSRF-/429-Tests im CI                  |

- **W1**: Launch für Admin/Power-User (C1-artige Kohorte), UI/Tool nur in einem „Labs“-/Admin-Kontext sichtbar.
- **W2**: Ausbau auf alle eingeloggten User (C2), Auto-Assertions optional nach zusätzlicher Evaluierung.

## Launch-Prozedur

### Phase W1 – Launch für Admin/Power-User

**Ziel**: Web-Eval für einen kleinen Kreis technisch versierter Nutzer freischalten.

#### Prod-Launch-Checkliste W1 (Kurzfassung)

Diese Checkliste gilt für **Production** und fasst die wichtigsten Schritte für W1 zusammen:

- **1. Technische Preflights**
  - `npm run openapi:validate`
  - `npm run test:integration -- web-eval` (inkl. Admin-Web-Eval-Tasks)
  - `npm run test:unit -- web-eval`
- **2. UI/API-Smokes (Prod)**
  - Als Admin/Power-User: `POST /api/testing/evaluate` mit erlaubter URL → Task erstellt.
  - `GET /api/testing/evaluate/usage` → sinnvolle Limits/Usage.
  - `POST /api/testing/evaluate/[id]/complete` mit gültigem `X-Executor-Token` → Statuswechsel korrekt.
  - Im UI: Web-Eval-Tool nur im Admin/Labs-Kontext sichtbar, nicht für reguläre User/Gäste.
- **3. Nach Deploy beobachten**
  - Fehlerrate, SSRF-/Origin-Blocks, Executor-Latenz.
- **4. Rollback-Pfad im Kopf behalten**
  - Bei Problemen: UI wieder nur für Admin/Power-User belassen oder Feature via Flags (`WEB_EVAL_ENABLE_PROD`, `WEB_EVAL_EXEC_ALLOW_PROD`) drosseln (siehe Abschnitt „Rollback“).

1. **Preflight-Checks (Testing/Staging)**
   - `npm run openapi:validate` (Web-Eval-Endpunkte müssen im OpenAPI konsistent sein).
   - `npm run test:integration -- web-eval` (bzw. alle `web-eval-*.test.ts`).
   - `npm run test:unit -- web-eval` (Unit-Tests in `tests/unit/testing/web-eval/**`).
   - Executor-spezifische Checks gemäß `web-eval-executor-runbook.md`:
     - Korrekte Verarbeitung von `complete`-Callbacks.
     - Idempotenz/States (pending/processing/completed/failed) für Tasks.

2. **Flags auf Staging setzen**
   - `WEB_EVAL_ENABLE_PROD=1` (entsprechend Env „staging“).
   - `WEB_EVAL_EXEC_ALLOW_PROD=1`.
   - `WEB_EVAL_AUTO_ASSERTIONS_ENABLE=0` (Auto-Assertions zunächst deaktivieren oder nur in Testing aktiv lassen).
   - `WEB_EVAL_ALLOWED_ORIGINS` auf passende Domains beschränken.
   - `WEB_EVAL_EXECUTOR_TOKEN` setzen und Executor so konfigurieren, dass er dieses Token nutzt.

3. **UI-Exposure (Staging)**
   - Tool-Seiten:
     - `src/pages/en/tools/web-eval/`
     - `src/pages/de/tools/web-eval/`
   - Sicherstellen, dass:
     - Web-Eval im UI nur für Admin/Power-User sichtbar ist (Role/Flag-Check).
     - Normale User/Gäste das Tool nicht sehen oder nur einen Hinweis auf interne Nutzung.

4. **Prod-Rollout W1**
   - Bedingungen:
     - Integration-/Unit-Tests für Web-Eval + Admin-Tasks grün.
     - Staging-Funktionstests (Run/Next/Abort/Complete/Usage/Quota) ok.
   - Schritte:
     - In Production-Env:
       - `WEB_EVAL_ENABLE_PROD=1` setzen.
       - `WEB_EVAL_EXEC_ALLOW_PROD=1` setzen.
       - `WEB_EVAL_ALLOWED_ORIGINS` auf gewünschte Ziel-Domains (z. B. nur eigene Site) beschränken.
       - `WEB_EVAL_AUTO_ASSERTIONS_ENABLE=0` lassen (optional nur in Testing=1).
     - Deploy auf Production.
   - Direkt nach Deploy (Prod-Smokes):
     - Admin/Power-User führt einen Web-Eval-Run auf definierter Test-URL aus (eigene Domain).
     - Überprüfen von:
       - Task-Status-Flow (create → run → complete → usage update).
       - Fehlerszenarien (ungültige URL, disallowed Origin, Quota überschritten).

5. **Beobachtung nach W1**
   - Logs/Dashboards verwenden, um:
     - Fehlerrate (4xx/5xx) auf Web-Eval-Endpoints zu beobachten.
     - SSRF-/Origin-Block-Events zu prüfen.
     - Executor-Latenz & Timeouts zu sehen.

### Phase W2 – Ausbau auf alle eingeloggten User (C2)

**Ziel**: Web-Eval-Tool für alle eingeloggten User verfügbar machen (mindestens Free/Pro/Premium), wenn W1 stabil ist.

1. **Bedingungen für Start von W2**
   - Stabiler Betrieb ohne kritische Incidents.
   - Klarer Kostenrahmen (Executor-/Runtime-Kosten pro Eval im Rahmen).
   - Kein Hinweis auf Missbrauch bei Admin/Power-Usern.

2. **UI-Exposure W2**
   - Role-/Flag-Gates anpassen:
     - Web-Eval im „Tools“-Bereich für alle eingeloggten User sichtbar.
     - Optional: bestimmte, riskantere Modi weiterhin nur für Admin/Power-User.

3. **Auto-Assertions (optional)**
   - `WEB_EVAL_AUTO_ASSERTIONS_ENABLE=1` in Production setzen **nur nach**:
     - positiver Evaluierung in Testing/Staging.
     - Überprüfung, dass Heuristik und Limits (max. Anzahl Assertions etc.) wie geplant funktionieren.

4. **Prod-Rollout W2**
   - UI- und Flag-Änderungen deployen.
   - Kurzfristig enges Monitoring (erste Tage):
     - Mehr Requests auf Create/Run/Usage.
     - Fehler-/Quota-Muster.

## Smoke-Tests & Validierung

### API-Smokes (Prod)

- `POST /api/testing/evaluate` (Create/Run)
  - Gültige URL (erlaubte Origin) → Task-ID + erfolgreicher Start.
- `GET /api/testing/evaluate/usage`
  - Erwartung: sinnvolle `limit`/`remaining`-Werte für aktuellen User.
- `POST /api/testing/evaluate/[id]/complete`
  - Mit gültigem `X-Executor-Token` → Statuswechsel `completed`/`failed` korrekt, Usage aktualisiert.

- Grenzfälle:
  - Disallowed Origin / interne URL → `forbidden`/`validation_error` je nach Design.
  - Überschreitung Quoten → `429` + `Retry-After`.

### UI-Smokes

- Tools-Seiten `/tools/web-eval` (DE/EN):
  - In W1: sichtbar nur für Admin/Power-User.
  - In W2: sichtbar für alle eingeloggten User; ggf. weitergehende Funktionen (z. B. bestimmte Runner) weiterhin nur für Admins.

## Monitoring

- **Metriken**
  - Anzahl Web-Eval-Runs pro Tag, pro User-Gruppe.
  - Fehlertypen und Codes (`validation_error`, `forbidden`, `rate_limit`, `server_error`).
  - SSRF-/Origin-Block-Events (fehlerhafte oder verbotene Ziele).
- **Limits & Quoten**
  - 429-Rate pro Usergruppe (Power-User vs. reguläre User).
- **Executor-Health**
  - Latenz/Fehler bei `/complete`-Callbacks.
  - Verhältnis laufende vs. abgeschlossene Tasks.

## Rollback

Rollback bringt Web-Eval jeweils auf W1 (nur Admin/Power-User) oder auf „off“.

1. **UI-Rollback W2 → W1**
   - UI: Tool im Frontend wieder nur für Admin/Power-User sichtbar machen.
   - Normale User sehen ggf. nur Hinweis/CTA oder gar keinen Web-Eval-Eintrag mehr.

2. **Flag-Rollback (teilweise oder komplett)**
   - Auto-Assertions deaktivieren: `WEB_EVAL_AUTO_ASSERTIONS_ENABLE=0`.
   - Executor in Prod stilllegen: `WEB_EVAL_EXEC_ALLOW_PROD=0` (Achtung: laufende Tasks/Jobs beachten).
   - Kompletter Feature-Toggle (extrem): `WEB_EVAL_ENABLE_PROD=0` → API/Tool global in Prod deaktivieren.

3. **Nach Rollback prüfen**
   - Reduktion von Fehlermustern (insb. durch reguläre User).
   - Kein Anstieg der 5xx-Quote durch fehlerhafte Feature-Toggles.
   - UI zeigt den eingeschränkten Zustand korrekt an.

## Referenzen

- **Runbooks & Docs**
  - `docs/ops/web-eval-executor-runbook.md`
  - `docs/ops/tool-launch-matrix.md`
- **Code & Config**
  - `src/pages/api/testing/evaluate/**`
  - `src/lib/testing/web-eval/**`
  - `src/config/web-eval/**`
  - `src/lib/validation/schemas/web-eval.ts`
  - `src/pages/en/tools/web-eval/`
  - `src/pages/de/tools/web-eval/`
- **Tests**
  - `tests/integration/api/web-eval-*.test.ts`
  - `tests/integration/api/admin-web-eval-tasks.test.ts`
  - `tests/unit/testing/web-eval/**`
