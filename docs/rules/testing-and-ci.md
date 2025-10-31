# Testing & CI Rules

## Zweck

Verlässliche Qualitäts‑Gates für schnelle Iteration mit klaren Reports.

## Muss

- Unit/Integration (Vitest): `npm run test`; V8 Coverage ≥ 70% für `src/**/*.{ts,tsx}`.
- E2E (Playwright): `npm run test:e2e`; injiziert `Origin` Header; Retries auf CI.
- OpenAPI: `npm run openapi:validate` (Pflicht), `npm run openapi:redoc` (CI).
- Lint/Format: `npm run lint`, `npm run format:check` vor PRs.

## Sollte

- Device‑Matrix: chromium/firefox/webkit; mobile Varianten via Script.
- E2E‑Reports:
  - Root: `playwright-report/`
  - v2: `test-suite-v2/reports/playwright-html-report/`
- Optional (non‑blocking): Zod→OpenAPI Pilot/Diff:
  - `npm run openapi:zod:pilot`
  - `npm run openapi:zod:diff`
  - Workflow: `.github/workflows/openapi-zod-diff.yml`

## Cron‑Worker Monitoring (Testing)

- App‑Worker Health: `GET /api/health/auth` mit `X-Internal-Health`.
- Cron‑Worker Triggers: `__cron/run/auth|docs|status`; KV verifizieren per Wrangler.

## Code‑Anker

- `vitest.config.ts`
- `playwright.config.ts`
- `.github/workflows/*.yml`

## Changelog

- 2025‑10‑31: Reports/Gates konsolidiert; OpenAPI Pilot/Diff referenziert.
