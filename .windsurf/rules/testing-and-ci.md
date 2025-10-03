---
trigger: always_on
---

# Testing & CI Rules

- Run `npm run test` (Vitest) locally before PRs; it loads plugins `@vitejs/plugin-react` and `vite-tsconfig-paths` (`vitest.config.ts`).
- Respect coverage gates: global thresholds 70% for statements/branches/functions/lines with `include: src/**/*.{ts,tsx}` and V8 provider (`vitest.config.ts`).
- Place unit specs alongside sources (`src/**/*.{test,spec}`) or under `tests/unit`, and integration specs under `tests/integration` with `tests/integration/setup/global-setup.ts` for bootstrapping (`vitest.config.ts`).
- Use `npm run test:e2e` for Playwright; config starts `npm run dev:e2e` automatically for local runs, injects same-origin `Origin` header, retries twice on CI, and stores HTML report in `playwright-report` (`playwright.config.ts`, `package.json`).
- Keep Playwright device coverage across chromium/firefox/webkit; mobile variants are toggled via scripts like `test:e2e:mobile` (`package.json`).
- Execute formatting/linting via `npm run format`, `format:check`, and `lint` (caps warnings at 280) prior to merging (`package.json`).
