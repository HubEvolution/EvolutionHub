---
description: Web-Eval Executor – Header/Secret/How-to-run (incl. CBR runner)
owner: platform
priority: P2
lastSync: 2025-11-23
codeRefs:
  - src/pages/api/testing/evaluate/next.ts
  - src/pages/api/testing/evaluate/next/run.ts
  - src/lib/testing/web-eval/**
  - "src/pages/api/testing/evaluate/\\[id\\].ts"
testRefs:
  - tests/integration/api/web-eval-next.test.ts
  - tests/integration/api/web-eval-run.test.ts
  - tests/integration/api/web-eval-complete.test.ts
---

# Web‑Eval Executor – Runbook

Scope: Operational details for the Web‑Eval executor and CBR runner (headers, secrets, cron, health). Launch phases, cohorts and feature exposure for the Web‑Eval tool are documented in `docs/ops/runbook-web-eval-launch.md` and `docs/ops/tool-launch-matrix.md`.

- **Header (Executor Auth)**
  - Name: `x-executor-token` (case-sensitive)
  - Wert: statischer Token aus dem Worker‑Env `WEB_EVAL_EXECUTOR_TOKEN`

- **Secrets (Wrangler)**
  - Nie im Klartext in TOML/Code pflegen.
  - Lokal/Dev: `wrangler secret put WEB_EVAL_EXECUTOR_TOKEN --env development`
  - CI: `wrangler secret put WEB_EVAL_EXECUTOR_TOKEN --config wrangler.ci.toml` (via GH Secrets)

- **Bindings**
  - KV: `KV_WEB_EVAL` (siehe wrangler.toml / wrangler.ci.toml)

- **Tests lokal ausführen**
  - Mit Secret: `WEB_EVAL_EXECUTOR_TOKEN=<token> npm run test:integration -- tests/integration/api/web-eval-next.test.ts`
  - Ohne Secret: Nur der 401‑Test läuft; 200‑Szenarien werden automatisch geskippt.

- **Executor lokal starten**
  - Standard (lokaler Worker auf 8787):

    ```bash
    WEB_EVAL_EXECUTOR_TOKEN=<token> npm run web-eval:executor
    ```

  - Gegen Staging/andere URL:

    ```bash
    BASE_URL=https://staging.hub-evolution.com \
    WEB_EVAL_EXECUTOR_TOKEN=<token> \
    npm run web-eval:executor
    ```

  - Env-Variablen: `WEB_EVAL_EXECUTOR_TOKEN` (Pflicht), `BASE_URL` oder `TEST_BASE_URL` (optional)

- **Optionaler CI‑Smoke**
  - In `deploy.yml` ist ein optionaler Smoke enthalten, der den Executor ~25s laufen lässt.
  - Aktivierung: `RUN_EXECUTOR_SMOKE=1` als Job‑Env setzen und `WEB_EVAL_EXECUTOR_TOKEN` als Secret hinterlegen.
  - Ziel‑URL: `https://staging.hub-evolution.com` (voreingestellt)

  - **Staging-Notizen (Usage, Storage & Executor)**
  - In **Staging** ist `KV_WEB_EVAL` als Binding konfiguriert (siehe `wrangler.toml`, Abschnitt `env.staging.kv_namespaces`).
  - `GET /api/testing/evaluate/usage` funktioniert in Staging; das Web‑Eval‑Tool zeigt die Usage‑Anzeige (`Usage: X/Y`) sowie den täglichen Reset‑Zeitpunkt als Text *"Web‑Eval daily limit resets at <Datum/Uhrzeit>"*. Die API liefert dabei `usage`/`dailyUsage` (24h‑Fenster) und `monthlyUsage` auf Basis der Web‑Eval‑Entitlements (`dailyBurstCap`, `monthlyRuns`), aus denen die HUD‑Werte in der UI berechnet werden.
  - Der Cron‑Worker `evolution-hub-cron` ist in Staging deployt; der Web‑Eval‑Executor dort ist jedoch vollständig über `WEB_EVAL_EXEC_ENABLE`/`WEB_EVAL_EXEC_HOSTS`/`WEB_EVAL_EXEC_MAX_RUNS_PER_TICK` gegated.
  - Standardzustand in Staging: `WEB_EVAL_EXEC_ENABLE="0"`, `WEB_EVAL_EXEC_HOSTS="[]"` und **kein** Cron‑Trigger `"*/5 * * * *"` für Web‑Eval → Tasks bleiben `pending`, bis der Executor manuell über `/__cron/run/webeval?host=staging.hub-evolution.com` getriggert wird.
  - Für Staging‑Smokes kann `WEB_EVAL_EXEC_ENABLE="1"` und `WEB_EVAL_EXEC_HOSTS="[\"staging.hub-evolution.com\"]"` gesetzt werden; Ausführung dann ausschließlich über manuelle Calls (siehe unten „Variante A – Cron‑Worker Executor“).

- **Troubleshooting**
  - 403 + Log `web_eval_executor_token_invalid` und `hasProvidedToken: false` → Header fehlt/ist falsch geschrieben (verwende exakt `x-executor-token`).
  - 500 `Web evaluation storage is not configured` → fehlt KV‑Binding `KV_WEB_EVAL`.
  - 403 beim Statusabruf `/api/testing/evaluate/:id` → Owner‑Schutz aktiv. Cookie des Owners mitsenden (Gast: `guest_id` als Set‑Cookie aus Create‑Response; Nutzer: Session).
  - 429 (Rate‑Limit) auf Create/Claim/Run → `Retry-After` Header respektieren; in DEV sind Limits deutlich erhöht.

- **Compliance (Global Rules)**
  - Keine Secrets im Code / TOML → ausschließlich Wrangler Secrets.
  - API‑Middleware (`withApiMiddleware`) und einheitliche JSON‑Shapes (`createApiSuccess`, `createApiError`) sind bereits umgesetzt.

## Variante A – Cron‑Worker Executor (Workers Cron)

- **Worker & Endpoint**
  - Worker: `workers/cron-worker` (`evolution-hub-cron`).
  - Interner Endpoint auf dem Cron‑Worker: `POST /__cron/run/webeval?host=<host>`.
  - Der Cron‑Worker ruft für jeden erlaubten Host intern `POST /api/testing/evaluate/next/run` auf dem App‑Worker auf und setzt dabei:
    - `Origin: <BASE_URL>` des Hosts
    - `x-internal-exec: 1`

- **Env & Secrets (Cron‑Worker)**
  - `WEB_EVAL_EXEC_ENABLE` ∈ {"0", "1"} – globales Gate für den Executor.
  - `WEB_EVAL_EXEC_HOSTS` – JSON‑Array erlaubter Hosts, z. B. `"[\"staging.hub-evolution.com\"]"`, `"[\"hub-evolution.com\"]"`.
  - `WEB_EVAL_EXEC_MAX_RUNS_PER_TICK` – max. Anzahl Runs pro Host und Aufruf (1–20, Default 3).
  - `INTERNAL_HEALTH_TOKEN` – Secret, das im Header `x-internal-health` für `/__cron/run/*` mitgesendet werden muss.
  - Optional: `HC_WEB_EVAL` – Health‑Check‑Endpoint für Start/OK/Fail‑Pings (`/start`, `/fail`), analog zu Pricing/Auth.

- **Empfohlene Env‑Matrix**

  | Env                | WEB_EVAL_EXEC_ENABLE | WEB_EVAL_EXEC_HOSTS                          | WEB_EVAL_EXEC_MAX_RUNS_PER_TICK | Cron `*/5 * * * *` | Nutzung                                      |
  |--------------------|----------------------|----------------------------------------------|----------------------------------|--------------------|---------------------------------------------|
  | local/dev          | `"0"`                | `"[]"`                                      | `"3"`                            | nein               | kein Auto‑Run; optional manuelle Tests      |
  | staging (manuell)  | `"1"`                | `"[staging.hub-evolution.com]"`            | `"2"–"3"`                       | nein               | nur manuelle Calls auf `/__cron/run/webeval` |
  | production (dauer) | `"1"`                | `"[hub-evolution.com]"`                    | `"3"–"5"`                       | ja                 | periodischer Executor für Prod‑Host         |

- **Staging‑Smoke‑Plan (Kurz)**

  - *Fall 0 – keine Tasks*: keine `pending`‑Tasks in der UI; 1× `POST /__cron/run/webeval?host=staging.hub-evolution.com` → Response `ok:true`, keine Statusänderung.
  - *Fall 1 – 1 Task*: 1 neue Task in der Web‑UI mit Assertion `selectorExists body`; 1× `/__cron/run/webeval` → Task wechselt von `pending` auf `completed` und zeigt im Report `PASS selectorExists body` + Verdict `pass`.
  - *Fall 2 – ≤ Limit*: 3 neue Tasks, `WEB_EVAL_EXEC_MAX_RUNS_PER_TICK="3"`; 1× `/__cron/run/webeval` → alle 3 Tasks werden verarbeitet (nicht mehr `pending`).
  - *Fall 3 – > Limit*: 5 neue Tasks, `WEB_EVAL_EXEC_MAX_RUNS_PER_TICK="2"`; jeder Aufruf von `/__cron/run/webeval` verarbeitet höchstens 2 Tasks. Nach 2–3 manuellen Aufrufen sind alle 5 Tasks abgeschlossen, aber pro Tick nie mehr als das Limit.

## Security & Headers (Kurzüberblick)

- **Create (POST /api/testing/evaluate)**
  - Same‑Origin + Double‑Submit CSRF erforderlich (`X-CSRF-Token` == Cookie `csrf_token`).
  - Produktion: SSRF‑Allowlist via `WEB_EVAL_ALLOWED_ORIGINS` strikt; Non‑Prod relaxed (lokale Ports wie 8787 erlaubt).
  - Rate‑Limit: `webEvalTaskLimiter` (Prod 10/min; DEV erhöht).

- **Abort (POST /api/testing/evaluate/{id}/abort)**
  - Same‑Origin + Double‑Submit CSRF erforderlich.
  - Nur für den jeweiligen Owner (Session‑User oder `guest_id`‑Cookie) erlaubt; sonst 403 `forbidden`.
  - Idempotent: bei bereits terminalen Tasks (`completed`, `failed`, `aborted`) wird der aktuelle Status unverändert zurückgegeben.
  - Nutzt ebenfalls `webEvalTaskLimiter`.

- **Executor (POST /api/testing/evaluate/next, /{id}/complete)**
  - Pflicht‑Header: `x-executor-token`.
  - Produktion zusätzlich: `x-internal-exec: 1`.
  - Rate‑Limits aktiv; bei 429 wird `Retry-After` gesetzt.

- **CBR‑Runner (POST /api/testing/evaluate/next/run)**
  - Intern; Prod‑Gating via `x-internal-exec: 1`.
  - Rate‑Limit: `webEvalBrowserLimiter` (Prod 5/min; DEV erhöht).

## Task‑Status & Ownership

- Status‑Lebenszyklus (vereinfacht):
  - `pending` → `processing` → `completed` | `failed`.
  - `aborted` ist ein zusätzlicher terminaler Status, der ausschließlich über den Owner‑Abort (`POST /api/testing/evaluate/{id}/abort`) gesetzt wird.
- Owner‑Zugriff:
  - `GET /api/testing/evaluate/:id` gibt nur für den Owner (Session‑User oder Gast via `guest_id`‑Cookie) 200 zurück.
  - Ohne passenden Cookie/Session → 403 `forbidden`.
- Abort‑Effekt auf Executor/Runner:
  - Wenn ein Task während `processing` auf `aborted` gesetzt wird, überschreibt der CBR‑Runner den Status beim Abschluss nicht mehr.
  - Reports werden weiterhin geschrieben, aber der gespeicherte Task‑Status bleibt `aborted`.
- Testing‑Hinweis: Nach `POST /api/testing/evaluate` das gesetzte `guest_id` aus `Set-Cookie` extrahieren und bei Status‑ bzw. Abort‑Requests mitsenden.

## SSRF Verhalten

- **Server‑Seite (Create)**
  - Produktion: strikte Prüfung (`http/https`, Ports 80/443, keine privaten/loopback Hosts, Origin‑Allowlist aus `WEB_EVAL_ALLOWED_ORIGINS`).
  - Non‑Prod: relaxed, um lokale/CI‑Flows (127.0.0.1:8787) zu erlauben.

- **Executor‑Seite**
  - Zusätzlicher Pre‑Check immer aktiv. Disallow → Task wird kurzgeschlossen als `failed` mit Fehler `ssrf_blocked:<reason>`.

## Interner CBR‑Runner (Cloudflare Browser Rendering)

- **Endpoint (intern)**
  - `POST /api/testing/evaluate/next/run`
  - Rate‑Limit: `webEvalBrowserLimiter` (5/min)

- **Prod‑Gating Header**
  - `x-internal-exec: 1` ist in Produktion Pflicht.
  - Ohne Header in Prod → `forbidden` mit `disabled_in_production` und minimalem Report.

- **Feature‑Flags (Env)**
  - `WEB_EVAL_BROWSER_ENABLE`:
    - "1" → Feature aktiv.
    - Andere Werte → `browser_disabled` (Task wird als `failed` mit Report markiert).
  - `WEB_EVAL_BROWSER_ALLOW_PROD`:
    - "1" → Prod erlaubt (zusätzlich `x-internal-exec: 1` erforderlich).
    - Andere Werte → in Prod geblockt (`disabled_in_production`).

- **Bindings**
  - `BROWSER` (Cloudflare Browser Rendering binding)
  - Wenn Flag an, aber `BROWSER` fehlt → `browser_not_configured` (Task `failed` + Report).

- **Fehlerformen & Reports (implementierter Runner)**
  - `browser_disabled` wenn Flag aus.
  - `browser_not_configured` wenn Flag an, aber Binding fehlt.
  - `disabled_in_production` wenn Prod‑Gate greift (kein `x-internal-exec: 1` oder `WEB_EVAL_BROWSER_ALLOW_PROD != "1"`).
  - `browser_backend_unavailable` wenn der Browser‑Dienst selbst nicht erreichbar ist (z. B. Cloudflare‑Fehler `/v1/acquire`).
  - `page_health_check_failed` wenn die Navigation zwar läuft, aber der Health‑Check (HTTP < 400, Titel vorhanden, keine same‑origin `console.error`) scheitert.

- **Tuning‑Hebel (Health‑Check & Zeitlimits)**
  - `timeoutMs` im Request steuert das Navigation‑Timeout (Default 30 s).
  - Same‑origin `console.error` wird aktuell als fatal gewertet; striktere/lockerere Regeln können bei Bedarf im internen Runner angepasst werden.
  - Erfolgskriterien (Status < 400, nicht‑leerere `title`, keine fatalen Console‑Errors) sind konservativ gewählt, um „funktionierende“ Seiten zu erzwingen.

- **How‑To: Staging‑Smoke über Web‑UI + CBR‑Runner**
  - UI aufrufen: `https://staging.hub-evolution.com/tools/web-eval/app`.
  - Formular ausfüllen, z. B.:
    - URL: `https://staging.hub-evolution.com/`
    - Task: `open page and assert content`
    - Browser-Profil: Standardmäßig ist das Desktop-Profil aktiv. Die Option steuert ausschließlich User-Agent & Viewport des Cloudflare-Headless-Browsers (internes Flag `headless`), öffnet aber **kein** lokales Browser-Fenster und erzeugt weiterhin keine Screenshots/Videos.
    - `timeoutMs`: z. B. `15000`.
  - Task absenden → UI zeigt neue Task mit Status `pending`.
  - Internen CBR‑Runner manuell triggern (bis Cron/Worker aktiv ist):

    ```bash
    curl -i -X POST "https://staging.hub-evolution.com/api/testing/evaluate/next/run" \
      -H "Origin: https://staging.hub-evolution.com"
    ```

  - Die älteste `pending`‑Task wird verarbeitet; UI pollt `/api/testing/evaluate/:id` im Hintergrund und aktualisiert den Status auf `completed` oder `failed`.
  - Im Report‑Panel der UI sind Schritte (`goto`), Console‑Logs und Network‑Requests sichtbar; der Runner speichert aktuell **keine Screenshots/Videos**, unabhängig vom `headless`‑Flag.

- **Tests**
  - Siehe `tests/integration/api/web-eval-run.test.ts`:
    - Leere Queue → `task: null`.
    - Claim + Fail ohne Binding/Flag → `browser_disabled`/`browser_not_configured` + Report.
    - Prod‑Gating (`WEB_EVAL_BROWSER_TEST_PROD=1`) → Headerpflicht `x-internal-exec: 1`.

## Kanonische Testfälle (Assertions & Verdicts)

Die folgenden Testfälle dienen als Referenz, um Assertions und Verdikte (`pass`/`fail`/`inconclusive`) sowohl via API als auch über die Web‑UI konsistent zu verifizieren.

### Testfall 1 – Positiv (Verdict: `pass`)

- **URL**
  `https://example.com/`

- **Task‑Beschreibung (DE)**

  ```text
  Öffne die Seite „Example Domain“ und überprüfe, ob die Überschrift und der Beispiel‑Text korrekt angezeigt werden.
  ```

- **Assertions (UI oder API)**

  1. **Assertion 1 (soll PASS liefern)**
     - Kind: `textIncludes`
     - Wert: `Example Domain`
     - Beschreibung: `Seite enthält den Text „Example Domain“ im Inhalt.`

  2. **Assertion 2 (soll PASS liefern)**
     - Kind: `selectorExists`
     - Wert: `h1`
     - Beschreibung: `Die Seite hat eine H1‑Überschrift.`

- **Erwartung**
  - Alle Assertions: `passed: true`
  - Verdict im Report: `pass`
  - In der Web‑UI: grünes Verdict‑Badge und grüne „PASS“‑Badges für beide Assertions.

### Testfall 2 – Negativ (Verdict: `fail`)

Ziel: Bewusst falsche Assertions, damit der Runner regulär durchläuft, aber mindestens eine Assertion scheitert.

- **URL**
  `https://example.com/`

- **Task‑Beschreibung (DE)**

  ```text
  Öffne die Seite „Example Domain“ und überprüfe, ob bestimmte nicht vorhandene Elemente korrekt erkannt werden.
  ```

- **Assertions (UI oder API)**

  1. **Assertion 1 (soll FAIL liefern)**
     - Kind: `textIncludes`
     - Wert: `This string does not exist on the page`
     - Beschreibung: `Seite enthält absichtlich nicht vorhandenen Beispiel‑Text.`

  2. **Assertion 2 (soll FAIL liefern)**
     - Kind: `selectorExists`
     - Wert: `.nonexistent-selector-for-testing`
     - Beschreibung: `CSS‑Selector, der auf der Beispiel‑Seite nicht existiert.`

- **Erwartung**
  - Alle Assertions: `passed: false`
  - Verdict im Report: `fail`
  - In der Web‑UI: rotes Verdict‑Badge und rote „FAIL“‑Badges für beide Assertions.

### Testfall 3 – Inconclusive (Verdict: `inconclusive`)

`inconclusive` entsteht nicht durch eine bestimmte Assertion, sondern wenn der Runner den Task nicht regulär abschließen kann (z. B. Timeout/Navigationsfehler), sodass Assertions gar nicht oder nur teilweise ausgewertet werden.

- **URL**
  Typischerweise ebenfalls `https://example.com/`, um den Input mit den obigen Fällen vergleichbar zu halten.

- **Task‑Beschreibung (DE)**

  ```text
  Öffne die Seite „Example Domain“ und warte auf die vollständige Initialisierung. Dieser Testfall dient dazu, Fehlerbedingungen des Runners zu simulieren.
  ```

- **Assertions (UI oder API)**
  (z. B. identisch zu Testfall 1, damit der Unterschied ausschließlich aus dem Runner‑Verhalten resultiert.)

  1. `textIncludes` → `Example Domain`
  2. `selectorExists` → `h1`

- **Wie „inconclusive“ ausgelöst wird**

  - Der Verdict `inconclusive` wird vom CBR‑Runner gesetzt, wenn der Lauf selbst scheitert, z. B. durch:
    - deaktivierten Browser‑Runner (`WEB_EVAL_BROWSER_ENABLE` ≠ "1"),
    - fehlende Browser‑Binding‑Konfiguration in der Ziel‑Umgebung,
    - harte Zeitüberschreitung (Timeout), bevor Assertions ausgewertet werden konnten,
    - andere interne Fehlerbedingungen im Runner.
  - Die Assertions dienen in diesem Szenario primär als „Begleitdaten“ im Report; maßgeblich für das Verdict ist der Lauf‑Status (nicht der Inhalt der Assertions).

- **Erwartung**
  - Assertions ggf. leer oder nur teilweise gefüllt
  - Verdict im Report: `inconclusive`
  - In der Web‑UI: gelbes Verdict‑Badge; Assertions‑Liste kann je nach Fehlerfall leer sein.
