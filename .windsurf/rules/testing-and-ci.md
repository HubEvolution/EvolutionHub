---
trigger: always_on
priority: 70
---

# Testing & CI Rules

- Run `npm run test` (Vitest) locally before PRs; it loads plugins `@vitejs/plugin-react` and `vite-tsconfig-paths` (`vitest.config.ts`).
- Respect coverage gates: global thresholds 70% for statements/branches/functions/lines with `include: src/**/*.{ts,tsx}` and V8 provider (`vitest.config.ts`).
- Place unit specs alongside sources (`src/**/*.{test,spec}`) or under `tests/unit`, and integration specs under `tests/integration` with `tests/integration/setup/global-setup.ts` for bootstrapping (`vitest.config.ts`).
- Use `npm run test:e2e` for Playwright; config starts `npm run dev:e2e` automatically for local runs, injects same-origin `Origin` header, retries twice on CI, and stores HTML report in `playwright-report` or `test-suite-v2/reports/playwright-html-report` or `test-suite-v2/reports/playwright-html-report` or `test-suite-v2/reports/playwright-html-report` (`playwright.config.ts`, `package.json`).
- Keep Playwright device coverage across chromium/firefox/webkit; mobile variants are toggled via scripts like `test:e2e:mobile` (`package.json`).
- Execute formatting/linting via `npm run format`, `format:check`, and `lint` (caps warnings at 280) prior to merging (`package.json`).
- Playwright suites live in `tests/playwright` and `test-suite-v2`.
- Validate OpenAPI via `npm run openapi:validate` before PRs.
- Keep docs in sync; regenerate with `npm run docs:build` when API or env docs change.
- E2E config honors `TEST_BASE_URL`; local runs default to `http://127.0.0.1:8787`. For auth smokes, `E2E_FAKE_STYTCH=1` enables the fake provider in dev.
