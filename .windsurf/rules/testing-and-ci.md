---
trigger: always_on
---

# Testing & CI Rules

- Run `npm run test` (Vitest) locally before PRs; it loads plugins `@vitejs/plugin-react` and `vite-tsconfig-paths` (`vitest.config.ts`).
- Respect coverage gates: global thresholds 70% for statements/branches/functions/lines with `include: src/**/*.{ts,tsx}` and V8 provider (`vitest.config.ts`).
- Place unit specs alongside sources (`src/**/*.{test,spec}`) or under `tests/unit`, and integration specs under `tests/integration` with `tests/integration/setup/global-setup.ts` for bootstrapping (`vitest.config.ts`).
- Use `npm run test:e2e` for Playwright; config starts `npm run dev:e2e` automatically for local runs, injects same-origin `Origin` header, retries twice on CI, and stores HTML report in `playwright-report` or `test-suite-v2/reports/playwright-html-report` or `test-suite-v2/reports/playwright-html-report` or `test-suite-v2/reports/playwright-html-report` or `test-suite-v2/reports/playwright-html-report` or `test-suite-v2/reports/playwright-html-report` (`playwright.config.ts`, `package.json`).
- Keep Playwright device coverage across chromium/firefox/webkit; mobile variants are toggled via scripts like `test:e2e:mobile` (`package.json`).
- Execute formatting/linting via `npm run format`, `format:check`, and `lint` (caps warnings at 280) prior to merging (`package.json`).
- **Auth E2E Tests (v1.7.2):** All auth tests are in `test-suite-v2/src/e2e/auth/` with ~85% coverage (48 test cases). Use reusable helpers from `test-suite-v2/fixtures/auth-helpers.ts` for OAuth/Magic Link/Session flows. Run with `npm run test:e2e -- src/e2e/auth/` or see `test-suite-v2/src/e2e/auth/README.md` for full guide.
- **OAuth E2E Tests:** Located in `test-suite-v2/src/e2e/auth/oauth/` - includes GitHub OAuth flow, cookie security (HTTP/HTTPS), error handling, and welcome-profile tests. All tests respect v1.7.2 cookie fixes (explicit Set-Cookie headers, conditional \_\_Host-session).
- Validate OpenAPI via `npm run openapi:validate` before PRs.
- Keep docs in sync; regenerate with `npm run docs:build` when API or env docs change.
- E2E config honors `TEST_BASE_URL`; local runs default to `http://127.0.0.1:8787`. For auth smokes, `E2E_FAKE_STYTCH=1` enables the fake provider in dev.
- Playwright suites live in `tests/playwright` and `test-suite-v2`.

## Cron-Worker Monitoring (Testing)

- App-Worker internal health:
  - `GET /api/health/auth` with `X-Internal-Health: $INTERNAL_HEALTH_TOKEN` (file: [src/pages/api/health/auth.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/health/auth.ts:0:0-0:0))
- Cron-Worker manual triggers (Testing):
  - Auth health (writes `KV_CRON_STATUS: prod-auth:last`):
    - `curl -s "https://evolution-hub-cron-testing.<account>.workers.dev/__cron/run/auth" -H "X-Internal-Health: $INTERNAL_HEALTH_TOKEN"`
  - Docs registry (writes `docs-registry:last` and R2 artifacts):
    - `curl -s "https://evolution-hub-cron-testing.<account>.workers.dev/__cron/run/docs" -H "X-Internal-Health: $INTERNAL_HEALTH_TOKEN"`
  - Status snapshot (reads KV):
    - `curl -s "https://evolution-hub-cron-testing.<account>.workers.dev/__cron/run/status" -H "X-Internal-Health: $INTERNAL_HEALTH_TOKEN" | jq .`
- KV verification (from `workers/cron-worker/`):
  - `npx wrangler kv key list --env testing --binding=KV_CRON_STATUS --config wrangler.toml --remote --prefix prod-auth:`
  - `npx wrangler kv key get  --env testing --binding=KV_CRON_STATUS --config wrangler.toml --remote "prod-auth:last" | cat`
  - `npx wrangler kv key get  --env testing --binding=KV_CRON_STATUS --config wrangler.toml --remote "docs-registry:last" | cat`
- Gate for auth job in Testing:
  - `E2E_PROD_AUTH_SMOKE="1"` set in [workers/cron-worker/wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/workers/cron-worker/wrangler.toml:0:0-0:0) under `[env.testing.vars]`.
- Operations guidance:
  - Keep GH schedules for 2 weeks in parallel; compare parity using the status endpoint and KV/R2 artifacts.


## OpenAPI-Checks in CI

- Pflicht: `npm run openapi:validate` und `npm run openapi:redoc` im CI ausführen.
- Optional (non-blocking): Zod→OpenAPI-Pilot zur Drift-Erkennung
  - `npm run openapi:zod:pilot` (generiert Components aus Zod)
  - `npm run openapi:zod:diff` (Diff gegen [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0), Report unter `reports/zod-openapi-diff.json`)
  - Artefakt im CI hochladen; kein automatisches Überschreiben der [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0).

## Schema-Tests

- Für jedes neue Zod-Schema mind. 1 positiver und 1 negativer Test (z. B. fehlende Pflichtfelder).
- Ablage: `tests/unit/validation/*`.