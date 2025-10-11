# Evolution Hub — AGENTS.md

## Stack & Deployment

- Astro 5 with Cloudflare directory adapter; static asset headers set in `astro.config.mjs` including DEV CSP.
- Cloudflare Workers use D1, R2, KV via `wrangler.toml`; environment‑specific bindings for `DB`, `R2_AI_IMAGES`, `SESSION`, etc.
- Build output is `server` with Worker entry `dist/_worker.js/index.js`; Wrangler serves static assets from `dist` with `.assetsignore` to skip `_worker.js`.

## Repository Layout

- Runtime code in `src/`:
  - UI in `src/components`, `src/layouts`, pages in `src/pages` (Astro + API).
  - Shared logic in `src/lib`, `src/config`, `src/utils`.
  - Global middleware at `src/middleware.ts`.
- R2 proxy routes: `src/pages/r2/**` and `src/pages/r2-ai/**`; keep `/r2-ai/**` publicly accessible and exempt from gates.
- Content in `src/content/`, locales in `src/locales/`, styles in `src/styles/`.
- Tooling: scripts in `scripts/`, migrations in `migrations/`.

## Tooling & Conventions

- TypeScript strict with path aliases in `tsconfig.json` (`@/*`, `@api/*`, `@components/*`).
- ESLint:
  - Forbids `~/*` imports (use `@/*` instead).
  - React Hooks rules enabled.
  - Selective `no-console` only on explicitly listed files.
- Prettier: 2 spaces, single quotes, `printWidth 100`, `semi: true`, Astro plugin.
- Naming: PascalCase for components/stores, camelCase for utilities.

## Commands & Automation

- Dev:
  - `npm run dev` (Worker dev), `npm run dev:worker`, `npm run dev:worker:dev`, `npm run dev:astro` (UI only).
  - `npm run dev:e2e` boots DB setup and dev worker for E2E.
- Build/Preview:
  - `npm run build`, `npm run preview`.
  - `npm run build:worker`, `build:worker:dev`, `build:worker:staging` copy `_worker.js/assets` to `dist/assets` and write `dist/.assetsignore`.
- Tests:
  - `npm run test`, `test:once`, `test:watch`, `test:coverage`.
  - Scoped: `test:unit`, `test:integration`.
  - E2E: `test:e2e` (v2), `test:e2e:v1` (root), browser‑specific variants present.
- Docs/Quality:
  - `npm run format`, `format:check`, `lint`, `lint:md`, `lint:md:fix`.
  - `npm run openapi:validate`.
  - `npm run docs:routes:normalize` (normalizes links in `routes.md`).

## Testing Gates & Configuration

- Vitest
  - Global coverage thresholds 70% (V8). Unit tests in `jsdom` with `src/setupTests.ts`, integration tests in Node.
- Playwright (root)
  - Tests in `tests/e2e/specs`, auto‑start local dev unless remote target.
  - Reporter: HTML to `playwright-report` (playwright.config.ts:27).
- Playwright (v2)
  - Tests in `test-suite-v2/src/e2e`, auto‑start dev worker via root project.
  - Reporters: HTML to `test-suite-v2/reports/playwright-html-report` (test-suite-v2/playwright.config.ts:28), plus JSON/JUnit.
- All E2E inject `Origin` header to satisfy same‑origin checks.

## Security & Middleware Expectations

- Global Middleware (`src/middleware.ts`)
  - Logs each request with `requestId`; canonicalizes `www`→apex.
  - CSP nonce generation; locale redirects; PII‑redacted headers.
  - Security headers on HTML responses:
    - CSP (DEV relaxed; PROD nonce‑based), HSTS preload, COOP `same-origin`, X‑Frame‑Options `DENY`, X‑Content‑Type‑Options `nosniff`, strict `Permissions-Policy`.
  - Note: Basic‑Auth gate has been removed.
  - `/r2-ai/**` remains outside gates.
- API Middleware (`src/lib/api-middleware.ts`)
  - Use `withApiMiddleware` / `withAuthApiMiddleware` for:
    - Rate limiting (default `apiRateLimiter` 30/min).
    - Security headers on responses.
    - Unified JSON shapes (`createApiSuccess`/`createApiError`).
    - 405 via `createMethodNotAllowed` with `Allow`.
  - Same‑origin enforced for unsafe methods by default; optional Double‑Submit CSRF via `enforceCsrfToken: true` matching `X-CSRF-Token` to `csrf_token` cookie.
  - Allowed origins can be configured via env (comma‑separated) in addition to request origin and `options.allowedOrigins`:
    - `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN` (src/lib/api-middleware.ts:120–151).
- Redirect Endpoints
  - Use `withRedirectMiddleware` to apply rate limiting, CSRF/Origin checks, and security headers without forcing JSON shapes (e.g., OAuth callbacks).

## Rate Limiting

- Presets in `src/lib/rate-limiter.ts`:
  - `standardApiLimiter`: 50/min
  - `authLimiter`: 10/min
  - `sensitiveActionLimiter`: 5/hour
  - `apiRateLimiter` (default for APIs): 30/min
  - `aiJobsLimiter`: 10/min
  - `aiGenerateLimiter`: 15/min
- 429 responses include `Retry-After` seconds.

## CSRF

- Client helpers at `src/lib/security/csrf.ts` can create a `csrf_token` cookie (Lax).
- Server validation in middleware:
  - Same‑origin checks for unsafe methods.
  - Optional Double‑Submit (header matches cookie) when `enforceCsrfToken: true`.

## Feature Flags & Content Controls

- Coming Soon overlay config in `src/config/coming-soon.ts`:
  - Default patterns: `/docs`, `/kontakt`, `/agb`, `/impressum`.
  - Hard exclude: `/datenschutz*`.
  - Precedence: Exclusions > frontmatter `comingSoon` field > global `COMING_SOON` env > patterns.

## Observability & Debugging

- Client logs batched to `/api/debug/client-log` when `PUBLIC_ENABLE_DEBUG_PANEL = 'true'`.
- Security logging funnels through server loggers; request/response summaries include requestId and timing.

## Cloudflare & Build Details

- `wrangler.toml` configures Worker entry, assets, and env‑scoped bindings for D1, KV, R2.
- Adapter `staticAssetHeaders` in `astro.config.mjs` sets content types and long‑term cache for CSS/JS/SVG, and injects DEV CSP for prerendered/static HTML pages too.
- DEV CSP sources match middleware allowances:
  - Includes `https://cdn.jsdelivr.net`, `https://www.googletagmanager.com`, `https://plausible.io`, and `https://static.cloudflareinsights.com`.

## Playwright Report Paths (Both Families)

- Root HTML reports: `playwright-report` (playwright.config.ts:27).
- v2 HTML reports: `test-suite-v2/reports/playwright-html-report` (test-suite-v2/playwright.config.ts:28).

## Notes on Generated/Build Folders

- Some cascaded globs may show “NO MATCH” for build artifacts (e.g., `dist/**`, report folders) when not present locally; this is expected and not a rule drift.
