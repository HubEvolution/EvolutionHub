---
description: Web-Eval Executor – Header/Secret/How-to-run
owner: platform
priority: P2
lastSync: 2025-11-11
codeRefs:
  - src/pages/api/testing/evaluate/next.ts
  - src/lib/testing/web-eval/**
testRefs:
  - tests/integration/api/web-eval-next.test.ts
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

- **Troubleshooting**
  - 403 + Log `web_eval_executor_token_invalid` und `hasProvidedToken: false` → Header fehlt/ist falsch geschrieben (verwende exakt `x-executor-token`).
  - 500 `Web evaluation storage is not configured` → fehlt KV‑Binding `KV_WEB_EVAL`.

- **Compliance (Global Rules)**
  - Keine Secrets im Code / TOML → ausschließlich Wrangler Secrets.
  - API‑Middleware (`withApiMiddleware`) und einheitliche JSON‑Shapes (`createApiSuccess`, `createApiError`) sind bereits umgesetzt.
