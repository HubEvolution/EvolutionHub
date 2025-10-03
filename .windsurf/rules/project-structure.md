---
trigger: always_on
---

# Project Structure Rules

- Treat `src/` as the runtime root: UI lives in `src/components`, `src/pages`, and `src/layouts`, while shared logic sits in `src/lib`, `src/config`, and `src/utils` (`AGENTS.md`).
- Server handlers are Astro API routes inside `src/pages/api/**`; R2 proxy routes reside in `src/pages/r2/**` and must stay ungated by middleware (`AGENTS.md`, `src/middleware.ts`).
- Persist content under `src/content/` and locales in `src/locales/`; styles belong in `src/styles/` (per `AGENTS.md`).
- Automation scripts and migrations continue under `scripts/` and `migrations/` (`AGENTS.md`).
- Keep Playwright suites in both legacy `tests/e2e` and `test-suite-v2`; Vitest specs sit beside sources (`src/**/*.{test,spec}`) and under `tests/unit`, `tests/integration` (`vitest.config.ts`).
- Built assets go to `dist/` (worker output) and static files to `public/`; Wrangler serves `dist` with `.assetsignore` excluding `_worker.js` (`package.json` `build:worker`, `wrangler.toml`).
