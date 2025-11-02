---
trigger: always_on
---

---
trigger: always_on
---

# Testing & CI Rules

## Zweck

Verlässliche Qualitäts‑Gates für schnelle Iteration mit klaren Reports.

## Muss

- Unit/Integration (Vitest): `npm run test`; V8 Coverage ≥ 70% für `src/**/*.{ts,tsx}`.
- E2E (Playwright): `npm run test:e2e`; injiziert `Origin` Header; Retries auf CI.
- OpenAPI: `npm run openapi:validate` (Pflicht), `npm run openapi:redoc` (CI).
- Lint/Format: `npm run lint`, `npm run format:check` vor PRs.

- Integration (Stripe, env‑guarded)
  - Stripe‑abhängige Flows (Checkout/Sync/Admin‑Set‑Plan) sind env‑guarded und werden übersprungen, wenn `STRIPE_SECRET` oder Preis‑Mappings fehlen.
  - Preis‑Mappings für Tests: `PRICING_TABLE` (monthly), `PRICING_TABLE_ANNUAL` (annual) als JSON‑String oder Objekt.
  - Admin‑Endpoints dürfen eine vorseedete Admin‑Session verwenden (z. B. `TEST_ADMIN_COOKIE=session_id=...`) — nur für Tests.
  - Tests setzen Same‑Origin + Double‑Submit CSRF Header (konform API‑Baseline).

## Sollte

- Device‑Matrix: chromium/firefox/webkit; mobile Varianten via Script.
- E2E‑Reports:
  - Root: `playwright-report/`
  - v2: `test-suite-v2/reports/playwright-html-report/`
- Optional (non‑blocking): Zod→OpenAPI Pilot/Diff:
  - `npm run openapi:zod:pilot`
  - `npm run openapi:zod:diff`
  - Workflow: `.github/workflows/openapi-zod-diff.yml`
- Optional (non‑blocking): Consent‑Smoke (Playwright)
  - Szenario EN/DE Cookie‑Seite:
    - Reject → keine Analytics‑Globals/Skripte (`gtag`, `plausible`, CF‑Beacon) vorhanden.
    - Accept → Analytics‑Skripte/Beacon gemäß aktivierten Providern vorhanden.
  - Siehe `.windsurf/rules/cookies-and-consent.md`.

## Cron‑Worker Monitoring (Testing)

- App‑Worker Health: `GET /api/health/auth` mit `X-Internal-Health`.
- Cron‑Worker Triggers: `__cron/run/auth|docs|status`; KV verifizieren per Wrangler.

## Code‑Anker

- `vitest.config.ts`
- `playwright.config.ts`
- [tests/integration/api/admin-users-set-plan-happy.test.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/integration/api/admin-users-set-plan-happy.test.ts:0:0-0:0) (env‑guarded)
- `.github/workflows/*.yml`

## Changelog

- 2025‑11‑03: Optionalen Consent‑Smoke‑Hinweis ergänzt.
- 2025‑11‑02: Env‑guarded Stripe‑Integrationstests + vorseedete Admin‑Session dokumentiert.
- 2025‑10‑31: Reports/Gates konsolidiert; OpenAPI Pilot/Diff referenziert.