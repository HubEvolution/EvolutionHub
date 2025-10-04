---
trigger: always_on
priority: 90
---

# Project Structure Rules

- Treat `src/` as the runtime root: UI lives in `src/components`, `src/pages`, and `src/layouts`, while shared logic sits in `src/lib`, `src/config`, and `src/utils` (`AGENTS.md`).
- Server handlers are Astro API routes inside `src/pages/api/**`; R2 proxy routes reside in `src/pages/r2/**` and `src/pages/r2-ai/**` and must stay ungated by middleware (`AGENTS.md`, `src/middleware.ts`).
- Persist content under `src/content/` and locales in `src/locales/`; styles belong in `src/styles/` (per `AGENTS.md`).
- Automation scripts and migrations continue under `scripts/` and `migrations/` (`AGENTS.md`).
- Keep Playwright suites in `tests/playwright` and `test-suite-v2`; Vitest specs sit beside sources (`src/**/*.{test,spec}`) and under `tests/unit`, `tests/integration` (`vitest.config.ts`).
- Built assets go to `dist/` (worker output) and static files to `public/`; Wrangler serves `dist` with `.assetsignore` excluding `_worker.js` (`package.json` `build:worker`, `wrangler.toml`).
- Worker build details: `ASTRO_DEPLOY_TARGET=worker` copies static assets to `dist/assets` and writes `.assetsignore` to exclude `_worker.js`; Wrangler serves from `dist` (see `package.json` `build:worker` and `wrangler.toml [assets]`).