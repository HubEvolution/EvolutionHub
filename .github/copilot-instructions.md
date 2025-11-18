# Copilot Agent Onboarding (Evolution Hub)

## Repo snapshot
- **Purpose**: Evolution Hub is a large (thousands of tracked files) Astro + React application that renders UI islands and API routes which compile into a Cloudflare Worker. It powers AI tooling (image/video enhancers, prompt optimizer, scraper, voice transcriptor) plus dashboards, billing, jobs, and admin portals.
- **Tech**: TypeScript everywhere, Astro 5.14.x, React 18, Tailwind 3, Vitest 3, Playwright 1.54, Wrangler 4, Zod validation, Cloudflare D1/KV/R2, Stytch auth, Stripe billing, Workers AI/Replicate/OpenAI providers. Logging lives in `src/config/logging.ts` & `src/lib/services/logger-utils.ts`.
- **Rules**: Root `AGENTS.md` plus specialized ones in `src/pages/api/AGENTS.md`, `src/components/AGENTS.md`, `scripts/AGENTS.md`, and `tests/AGENTS.md`. `.windsurf/rules/**` adds mandatory baselines (security, tooling, docs, pricing/image/video/prompt/transcriptor/scraper/cookies). Always consult the relevant AGENT before touching files in that subtree.
- **Docs**: `README.md` highlights the tool suite, quick start, and key scripts. All detailed references live under `docs/` (notably `docs/SETUP.md`, `docs/development/local-development.md`, `docs/development/ci-cd.md`, `docs/testing/testing-strategy.md`, `docs/api/*`, `docs/security/*`, and `docs/reference/auth-envs-and-secrets.md`).
- **CI & releases**: GitHub workflows under `.github/workflows` enforce lint/format/tests (`quality-gate.yml`, `unit-coverage.yml`), docs inventory/sync, i18n validation, OpenAPI diffs/releases, and manual deploy smoke suites (`e2e-smoke.yml`, `deploy.yml`). Deployments now happen manually via Wrangler CLI after CI gates pass (`docs/development/ci-cd.md`).

## Environment & bootstrap
- **Runtime versions**: `package.json` pins Node `>=22` and npm `^11` (repo was exercised with Node `v22.21.1` / npm `10.9.4`, which emitted `npm WARN EBADENGINE`; upgrade npm to 11+ when possible).
- **Dependency install** (`npm install --prefer-offline --no-audit`, 11 s): succeeds but Husky’s `prepare` hook cannot lock `.git/config` in read-only environments: `error: could not lock config file .git/config: Operation not permitted`. Export `HUSKY=0` (or `HUSKY_SKIP_INSTALL=1`) if you cannot grant write access.
- **Env files**: copy `.env.example` → `.env` and fill credentials per `docs/reference/auth-envs-and-secrets.md`. Common must-haves: `PUBLIC_WORKER_URL`, Stytch keys, Stripe secrets, Workers AI/Replicate tokens, S3/R2 info, analytics IDs, feature flags.
- **Local Cloudflare state**: `npm run setup:local` (3 s) provisions/refreshes `.wrangler` D1 databases, KV, R2 buckets, and seeds users (`test@example.com/password123`, plus admin/user/premium fixtures). Safe to re-run; it prints credentials and writes to `.wrangler/state` + `.wrangler/d1`.
- **Validation helpers**: `npm run validate:env` ensures required env vars are set, `npm run secrets:check` cross-checks Wrangler secrets, `npm run menu` provides an interactive CLI for dev/test tasks (requires a TTY).

## Build, run, lint, and test commands (all executed 2025‑11‑18 unless noted)
- **`npm run lint`** (10 s): ESLint over `src/**/*.{ts,astro}` exits 0 but reports ~213 `prettier/prettier` warnings (e.g., `src/components/Header.astro`, `src/pages/dashboard.astro`). Fix via `npm run lint -- --fix` plus Prettier.
- **`npm run format:check`** (8 s): fails because 23 files deviate from Prettier. Run `npm run format` or `npx prettier --write` before pushing.
- **`npm run typecheck`** (8 s): fails because the default `tsconfig.json` includes `tests/**` and several specs currently violate strict types (e.g., `tests/performance/run-load-tests.ts` uses `unknown`, `tests/unit/lib/ai-image-service.test.ts` passes `null` to a `Map`). Use `npm run typecheck:src` for the application code path (passes in 7 s) and only tackle full `typecheck` once you’re addressing the test debt.
- **`npm run build`** (13 s): Astro server build succeeds and emits to `dist/` + `_astro/`. Always run after code changes that affect rendering or server output.
- **`npm run build:worker:dev`** (12 s): sets `ASTRO_DEPLOY_TARGET=worker`, builds the Cloudflare worker bundle (`dist/_worker.js/**`) and mirrors assets to `dist/assets`. Needed before invoking Wrangler or tests that depend on the worker output.
- **`npm run dev:astro`**: fails immediately with `[@astrojs/cloudflare] listen EPERM: operation not permitted 0.0.0.0` because the Cloudflare adapter spins up a proxy server that the sandbox cannot bind. Run only in an environment that allows listening on random localhost ports.
- **`npm run dev:worker` / `npm run dev:worker:nobuild`**: Wrangler starts but dies with `listen EPERM: operation not permitted 127.0.0.1:9229` (Wrangler’s inspector port). You must allow debugger ports or disable the inspector to run locally; otherwise rely on remote dev or run commands from a shell with elevated permissions.
- **`npm run test`**: orchestrates Vitest unit+integration. Global setup triggers `npm run setup:local` (succeeds) and `npm run build:worker:dev` (succeeds) but then fails because `@astrojs/cloudflare` again cannot bind (`listen EPERM 0.0.0.0`) during the worker build Virgo stage. Integration tests therefore require a non-sandboxed host where Wrangler/Astro can open ports.
- **`npm run test:unit`**: mostly passes (62 files) but 11 specs under `tests/unit/pages/api/auth/login-logger.test.ts` crash with `TypeError: Invalid URL: undefined` because `createMockContext()` lacks `request.url`. Fixing the mock (add `request: { url: 'http://127.0.0.1/api/auth/login', ... }`) or stubbing `globalThis.Request` is required before the suite can go green.
- **`npm run test:integration`**: expect the same `build:worker` port failure as `npm run test`.
- **`npm run test:e2e` / `test-suite-v2`**: not executed here. Playwright (config at `test-suite-v2/playwright.config.ts`) automatically starts `npm run dev:e2e` unless `PW_NO_SERVER=1` or you target a remote `TEST_BASE_URL`. Install browsers via `npx playwright install` beforehand; use `E2E_RECORD=1` to capture traces.
- **`npm run typecheck:src`**, `npm run build`, and `npm run build:worker:dev` succeeded post-change, so the repo builds cleanly once formatting/tests are fixed or skipped. Always run `npm run lint`, `npm run format:check`, `npm run typecheck:src`, `npm run build`, and relevant tests locally before opening a PR; mention explicitly when a command couldn’t run and why.
- **Health scripts**: `npm run health-check -- --url http://<worker>` hits `/api/health`; `npm run deploy:staging|production|testing` call the Wrangler deploy pipeline and should only run after CI gates.

## Project layout, key files, and navigation tips
- **Root essentials**: `AGENTS.md`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `LICENSE`, `openapi.yaml`, `api-docs.html`, `tsdoc.json`, `api-extractor.json`, `package.json`, `package-lock.json`, `astro.config.mjs`, `vitest.config.ts`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`, `eslint.config.dev.js`, `markdownlint-cli2.jsonc`, `tsconfig*.json`, `wrangler.toml`, `wrangler.ci.toml`, `renovate.json`, `tsconfig.ai.json`, assets (`public/`, `assets/`, `favicon_package/`), build outputs (`dist/`, `out/`, `reports/`, `playwright-report/`, `test-results/`), datasets (`Tabelle.csv`, `products.csv`), and automation artifacts (`cache-rules*.json`, `rulesets*.json`). Treat `node_modules/` as managed; do not edit it.
- **`src/`**: main source tree.
  - `pages/` contains Astro routes, with `pages/api/**` implementing API endpoints (one handler per file, validated via Zod; see `src/pages/api/AGENTS.md`). `pages/de` and `pages/en` hold localized pages. Auth/worker middleware is `src/middleware.ts` (see snippet below).
  - `components/` stores Astro + React islands (hooks, sections, dashboards, modals). `src/components/AGENTS.md` enforces i18n and a11y rules.
  - `lib/` houses shared logic: `api-middleware.ts`, `auth-v2.ts`, `services/**` (credits, enhancer, billing, jobs, etc.), `validation/**` (Zod schemas), `i18n/**`, `security/**`, `kv/**`, `rate-limiter.ts`, `response-helpers.ts`, `testing/**`.
  - `config/` for logging, pricing, feature flags; `utils/feature-flags.ts` centralizes feature toggles. `locales/en.json` & `de.json` hold translation keys. `styles/`, `assets/`, `layouts/`, `stores/`, `server/utils/**` round out UI infrastructure.
  - `scripts/` (inside `src/`) contains browser/client scripts (e.g., typewriter, interceptors).

- **`scripts/` (root)**: operational scripts such as `setup-local-dev.ts`, `dev-menu.ts`, `health-check.ts`, `deploy.ts`, `validate-env.ts`, Contentful/import helpers, doc tooling, replicator/integration helpers. Respect `scripts/AGENTS.md`.
- **`docs/`**: structured knowledge base; directories include `architecture/`, `development/`, `testing/`, `ops/`, `features/`, `api/`, `security/`, `reference/`, `rules/`. `docs/README.md` indexes everything, `docs/SETUP.md` is the live onboarding source, `docs/development/ci-cd.md` documents QA gates, `docs/testing/testing-strategy.md` details coverage expectations, and `docs/features/*.md` describe tool behavior.
- **`tests/`**: Vitest suites split into `unit/`, `integration/`, `shared/`, `mocks/`, `performance/`, `src/` (legacy). Follow `tests/AGENTS.md` for conventions. `tests/integration/setup/` seeds data; `tests/shared/http.ts` wraps HTTP calls.
- **`test-suite-v2/`**: Playwright e2e harness (`src/e2e/**`, `config/`, `reports/`). `playwright.config.ts` (root) supports legacy specs; prefer the v2 suite.
- **`workers/cron-worker`**: Dedicated Cloudflare Cron Worker (with its own `wrangler.toml`, `src/` entrypoint, and dependencies).
- **`migrations/`**: D1 SQL migration files (`0000_initial_schema.sql` …). Update alongside schema changes and document them in `docs/architecture/database-schema.md`.
- **`public/`**: static assets served as-is (favicons, manifest, etc.). Do not place secrets here.
- **`openapi.yaml` + `docs/api/*`**: update whenever you touch API contracts; run `npm run openapi:validate` / `npm run openapi:diff` as needed.

Key middleware example (`src/middleware.ts`):

```ts
export const onRequest = defineMiddleware(async (context, next) => {
  const requestId = generateRequestId();
  const url = new URL(context.request.url);
  // locale handling, CSRF/welcome gate, logging, CSP nonce creation, etc.
  return next();
});
```

API routes typically wrap handlers via `withApiMiddleware` (`src/lib/api-middleware.ts`) and build responses with `createApiSuccess` / `createApiError`. Validation schemas live under `src/lib/validation/schemas/**`; derive types via `z.infer` and keep them in sync with OpenAPI.

## CI expectations & validation steps
- GitHub workflows to watch: `quality-gate.yml` (lint + format + unit + typecheck + openapi), `unit-coverage.yml` (V8 coverage ≥70%), `e2e-smoke.yml` (targeted Playwright checks), `deploy.yml` (gates then manual wrangler deploy), `docs-inventory.yml` / `docs-sync.yml` (docs hygiene), `i18n-validate.yml`, `openapi-zod-diff.yml`, `openapi-release.yml`.
- Local checklist before pushing: run `npm run lint`, `npm run format:check`, `npm run typecheck:src` (or full `typecheck` if you touch tests), `npm run build`, the relevant Vitest suites, and Playwright smokes for affected features. Use `npm run astro:check:ui` when editing complex UI. Keep `.env` validated via `npm run validate:env`.
- Update docs (`README`, `docs/**`), `openapi.yaml`, translations (`src/locales/*.json`), and migrations when touching their domains. Security-sensitive updates must follow `docs/security` guidance (log PII safely, keep CSRF Same-Origin, mask secrets).

## Readme & file listings
- `README.md` covers the tool suite, live URLs, architecture highlights (Astro + Cloudflare, feature flags), quick start (`git clone`, `npm install`, `npm run setup:local`, `npm run dev`), and a command table. Refer to it before altering features.
- Root directory overview (abridged): `AGENTS.md`, `README.md`, `LICENSE`, `CHANGELOG.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/`, `src/`, `scripts/`, `tests/`, `test-suite-v2/`, `workers/`, `public/`, `migrations/`, `dist/`, `out/`, `assets/`, `reports/`, `temp/`, data CSV/JSON files, configuration JSON (cache rules, sitemap/rulesets), and automation outputs (HAR, resp.html). Subdirectories of high interest: `src/pages/` (Astro routes + APIs), `src/lib/services/`, `src/lib/validation/`, `src/components/`, `tests/unit|integration|performance`, `test-suite-v2/src/e2e`, `docs/development`, `docs/architecture`, `scripts/dev`, `scripts/security`, `workers/cron-worker/src`.

## Working efficiently
- Prefer `rg`/`tsc --traceResolution` for navigation, but this document already points you to the canonical files. Only run additional searches if information here is missing or provably outdated.
- Always align with AGENT and `.windsurf/rules` guidance, reuse existing Zod schemas/services, keep i18n keys in sync across `en.json` and `de.json`, sync OpenAPI + docs for API changes, and respect security/logging conventions.
- Mention any command you skip (with reason) in your PR notes. If a command fails because of sandbox limits (port binding, npm engine, etc.), call it out and describe the workaround you would apply on a full dev machine.
