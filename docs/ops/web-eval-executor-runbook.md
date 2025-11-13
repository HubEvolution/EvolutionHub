---
description: Web-Eval Executor – Header/Secret/How-to-run (incl. CBR runner)
owner: platform
priority: P2
lastSync: 2025-11-12
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

- **Troubleshooting**
  - 403 + Log `web_eval_executor_token_invalid` und `hasProvidedToken: false` → Header fehlt/ist falsch geschrieben (verwende exakt `x-executor-token`).
  - 500 `Web evaluation storage is not configured` → fehlt KV‑Binding `KV_WEB_EVAL`.
  - 403 beim Statusabruf `/api/testing/evaluate/:id` → Owner‑Schutz aktiv. Cookie des Owners mitsenden (Gast: `guest_id` als Set‑Cookie aus Create‑Response; Nutzer: Session).
  - 429 (Rate‑Limit) auf Create/Claim/Run → `Retry-After` Header respektieren; in DEV sind Limits deutlich erhöht.

- **Compliance (Global Rules)**
  - Keine Secrets im Code / TOML → ausschließlich Wrangler Secrets.
  - API‑Middleware (`withApiMiddleware`) und einheitliche JSON‑Shapes (`createApiSuccess`, `createApiError`) sind bereits umgesetzt.

## Security & Headers (Kurzüberblick)

- **Create (POST /api/testing/evaluate)**
  - Same‑Origin + Double‑Submit CSRF erforderlich (`X-CSRF-Token` == Cookie `csrf_token`).
  - Produktion: SSRF‑Allowlist via `WEB_EVAL_ALLOWED_ORIGINS` strikt; Non‑Prod relaxed (lokale Ports wie 8787 erlaubt).
  - Rate‑Limit: `webEvalTaskLimiter` (Prod 10/min; DEV erhöht).

- **Executor (POST /api/testing/evaluate/next, /{id}/complete)**
  - Pflicht‑Header: `x-executor-token`.
  - Produktion zusätzlich: `x-internal-exec: 1`.
  - Rate‑Limits aktiv; bei 429 wird `Retry-After` gesetzt.

- **CBR‑Runner (POST /api/testing/evaluate/next/run)**
  - Intern; Prod‑Gating via `x-internal-exec: 1`.
  - Rate‑Limit: `webEvalBrowserLimiter` (Prod 5/min; DEV erhöht).

## Task‑Status & Ownership

- `GET /api/testing/evaluate/:id` gibt nur für den Owner (Session‑User oder Gast via `guest_id`‑Cookie) 200 zurück.
- Ohne passenden Cookie/Session → 403 `forbidden`.
- Testing‑Hinweis: Nach `POST /api/testing/evaluate` das gesetzte `guest_id` aus `Set-Cookie` extrahieren und bei Status‑Requests mitsenden.

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

- **Fehlerformen & Reports (Phase B)**
  - `browser_disabled` wenn Flag aus.
  - `browser_not_configured` wenn Flag an, aber Binding fehlt.
  - `browser_runner_not_implemented` solange der eigentliche Runner noch nicht integriert ist.

- **Tests**
  - Siehe `tests/integration/api/web-eval-run.test.ts`:
    - Leere Queue → `task: null`.
    - Claim + Fail ohne Binding/Flag → `browser_disabled`/`browser_not_configured` + Report.
    - Prod‑Gating (`WEB_EVAL_BROWSER_TEST_PROD=1`) → Headerpflicht `x-internal-exec: 1`.
