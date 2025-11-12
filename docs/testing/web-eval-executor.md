---
description: Web-Eval Executor – Header/Secret/How-to-run (incl. CBR runner)
owner: platform
priority: P2
lastSync: 2025-11-12
codeRefs:
  - src/pages/api/testing/evaluate/next.ts
  - src/pages/api/testing/evaluate/next/run.ts
  - src/lib/testing/web-eval/**
testRefs:
  - tests/integration/api/web-eval-next.test.ts
  - tests/integration/api/web-eval-run.test.ts
---

# Web‑Eval Executor – Kurzleitfaden

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

- **Compliance (Global Rules)**
  - Keine Secrets im Code / TOML → ausschließlich Wrangler Secrets.
  - API‑Middleware (`withApiMiddleware`) und einheitliche JSON‑Shapes (`createApiSuccess`, `createApiError`) sind bereits umgesetzt.

## Interner CBR‑Runner (Cloudflare Browser Rendering)

- **Endpoint (intern)**
  - `POST /api/testing/evaluate/next/run`
  - Rate‑Limit: `webEvalBrowserLimiter` (5/min)

- **Prod‑Gating Header**
  - `x-internal-exec: 1` ist in Produktion Pflicht.
  - Ohne Header in Prod → `forbidden` mit `disabled_in_production` und minimalem Report.

- **Feature‑Flags (Env)**
  - `WEB_EVAL_BROWSER_ENABLE`:
    - `"1"` → Feature aktiv.
    - Andere Werte → `browser_disabled` (Task wird als `failed` mit Report markiert).
  - `WEB_EVAL_BROWSER_ALLOW_PROD`:
    - `"1"` → Prod erlaubt (zusätzlich `x-internal-exec: 1` erforderlich).
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
