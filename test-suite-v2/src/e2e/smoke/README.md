# Smoke E2E

Minimal, high-signal tests intended for fast CI/staging/prod verification.

## Purpose

- Verify basic availability and critical paths.
- Keep flake low, runtime short.
- Prefer chromium-only runs on CI unless broader coverage is needed.

## Conventions

- Short specs with few assertions.
- Gate remote runs with `TEST_BASE_URL`.
- Reuse helpers from `common-helpers.ts` and tool/auth helpers as needed.
- Prefer deterministic fixtures and selectors (`data-testid`).

## Run examples

- All smokes:
  - `npx playwright test src/e2e/smoke -c playwright.config.ts --project=chromium`
- Pricing smoke only:
  - `npm run test:e2e:pricing`

## Reporting

Reports are written under `test-suite-v2/reports/` (HTML, JSON, JUnit) per Playwright config.
