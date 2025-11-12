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

### Test‑JSON‑Parsing (konkret, by design)
- In Tests KEIN direktes `JSON.parse`. Stattdessen:
  - `tests/shared/http.ts` → `safeParseJson<T>()` verwenden.
  - Responses auf [ApiJson](cci:2://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/integration/api/web-eval-complete.test.ts:28:0-28:62) (oder spezifische Typen) typisieren: `safeParseJson<ApiJson>(text)`.
  - Guards/Assertions nur auf typisierten Daten ausführen.
- Ziel: Keine `{}`/`as any`‑Fallbacks, keine `(... || {})` Patterns.

### Env‑guarded Integrationen
- Stripe‑abhängige Flows sind env‑guarded und werden übersprungen, wenn `STRIPE_SECRET` oder Preis‑Mappings fehlen.
- Preis‑Mappings für Tests: `PRICING_TABLE`, `PRICING_TABLE_ANNUAL`.
- Admin‑Endpoints dürfen eine vorseedete Admin‑Session verwenden (nur für Tests).
- Same‑Origin + Double‑Submit CSRF Header in Integrationstests konform zur API‑Baseline.

## Sollte

- Device‑Matrix: chromium/firefox/webkit; mobile Varianten via Script.
- E2E‑Reports:
  - `playwright-report/`
  - `test-suite-v2/reports/playwright-html-report/`
- Optional (non‑blocking): Zod→OpenAPI Pilot/Diff:
  - `npm run openapi:zod:pilot`
  - `npm run openapi:zod:diff`
  - Workflow: `.github/workflows/openapi-zod-diff.yml`
- Optional Consent‑Smoke (Playwright) gemäß Cookies‑Rules.

## Logs & Reports

- Hygiene‑Läufe erzeugen Logs unter `reports/` (z. B. `reports/lint.txt`, `reports/astro-check.txt`, `reports/openapi-validate.txt`, `reports/format-check.txt`).

## Cron‑Worker Monitoring (Testing)

- App‑Worker Health: `GET /api/health/auth` mit `X-Internal-Health`.
- Cron‑Worker Triggers: `__cron/run/auth|docs|status`; KV verifizieren per Wrangler.

## Code‑Anker

- `vitest.config.ts`
- `playwright.config.ts`
- `tests/shared/http.ts` (safeParseJson, ApiJson)
- `.github/workflows/*.yml`

## CI/Gates

- `npm run test`
- `npm run test:e2e`
- `npm run openapi:validate`
- `npm run lint`
- `npm run format:check`

## Changelog

- 2025‑11‑12: Verbindliche Test‑Konventionen: `safeParseJson<T>` + [ApiJson](cci:2://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/integration/api/web-eval-complete.test.ts:28:0-28:62) statt direktem `JSON.parse`; Reports unter `reports/` präzisiert.
- 2025‑11‑03: Optionalen Consent‑Smoke‑Hinweis ergänzt.
- 2025‑11‑02: Env‑guarded Stripe‑Integrationstests + vorseedete Admin‑Session dokumentiert.
- 2025‑10‑31: Reports/Gates konsolidiert; OpenAPI Pilot/Diff referenziert.