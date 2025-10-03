# Evolution Hub — Verified Repo Rules

## Stack & Deployment
- Astro 5 with Cloudflare directory adapter drives the worker build; static asset headers are declared in `astro.config.mjs` for cache control and CSP coverage during dev.
- Cloudflare Workers rely on D1, multiple R2 buckets, and KV namespaces defined in `wrangler.toml`; environment-specific secrets and bindings (e.g., `DB`, `R2_AI_IMAGES`, `SITE_PASSWORD`) come from Wrangler envs.
- Build output targets server mode with Worker entry `dist/_worker.js/index.js`; Wrangler serves static assets from `dist` with `.assetsignore` to skip `_worker.js`.

## Repository Layout
- Runtime source is under `src/` with UI components/layouts in `src/components` and `src/layouts`, API routes in `src/pages/api`, shared logic in `src/lib`, config in `src/config`, and middleware in `src/middleware.ts` (`AGENTS.md`).
- Tests span Vitest projects in `tests/unit` and `tests/integration`, legacy fixtures under `tests/src`, and Playwright specs in `tests/e2e` plus the newer suite in `test-suite-v2/` (`AGENTS.md`, `vitest.config.ts`).
- Content resources live in `src/content` and `src/locales`; scripts and migrations stay in `scripts/` and `migrations/` (`AGENTS.md`).

## Tooling & Conventions
- TypeScript enforces `strict`, `noUnusedLocals`, and `noUnusedParameters` with path aliases like `@/*` defined in `tsconfig.json`.
- ESLint (config in `eslint.config.js`) applies TypeScript + React hooks rules, warns on `any`, ignores `_`-prefixed unuseds, forbids `~/*` imports, and enforces `no-console` only on the migrated API files listed there.
- Prettier (`.prettierrc.json`) uses 2 spaces, single quotes, 100 character width, and Astro plugin overrides.
- File naming keeps components/stores PascalCase and shared utilities camelCase as reiterated in `AGENTS.md`.

## Commands & Automation
- Worker-oriented dev uses `npm run dev:worker`/`dev:worker:dev`, with `dev:e2e` bootstrapping Wrangler after database setup; Astro-only dev still available via `npm run dev:astro` (`package.json`).
- Build and preview via `npm run build` and `npm run preview`; worker bundling script `build:worker` copies assets into `dist/assets` and writes `.assetsignore` (`package.json`).
- Testing commands include `npm run test` (Vitest multi-project), scoped `test:unit`, `test:integration`, coverage reporting `test:coverage`, and Playwright targets such as `test:e2e` and browser-specific variants (`package.json`, `vitest.config.ts`, `playwright.config.ts`).
- Formatting and linting rely on `npm run format`, `format:check`, `lint`, plus markdown linters and documentation generators captured in `package.json`.

## Testing Gates & Configuration
- Vitest defaults to globals, disables watch, and enforces V8 coverage thresholds at 70% for statements/branches/functions/lines with `include: src/**/*.{ts,tsx}`; unit tests run in `jsdom` with `src/setupTests.ts`, integration tests run in Node with a global setup (`vitest.config.ts`).
- Playwright config auto-starts `npm run dev:e2e` for local targets, injects same-origin `Origin` header on POSTs, retries twice on CI, and stores HTML reports in `playwright-report` (`playwright.config.ts`).

## Security & Middleware Expectations
- Global middleware (`src/middleware.ts`) logs each request with requestId, canonicalizes `www` traffic to apex, enforces optional Basic Auth on production HTML (excluding `/api/**`, assets, `/r2-ai/**`), generates per-request CSP nonces, handles locale redirects, and exposes IP anonymization with header redaction.
- Middleware also recognizes `SITE_AUTH_ENABLED` and `SITE_PASSWORD`, checks session cookies (`__Host-session`, `session_id`), and keeps `/r2-ai/**` outside gates.
- API middleware (`src/lib/api-middleware.ts`) standardizes JSON shapes via `createApiSuccess`/`createApiError`, applies security headers (HSTS with preload, X-Frame-Options DENY, etc.), enforces same-origin checks on unsafe methods by default, offers optional double submit CSRF enforcement, and integrates rate limiters (default 30/minute `apiRateLimiter`).
- Rate limiter presets in `src/lib/rate-limiter.ts` expose named guards (`standardApiLimiter`, `authLimiter`, `sensitiveActionLimiter`, `aiGenerateLimiter`, `aiJobsLimiter`), all emitting `Retry-After` on 429.
- Client/server CSRF helpers live in `src/lib/security/csrf.ts`, issuing 32-hex tokens with Lax cookies and necessitating header/cookie matches during validation.

## Feature Flags & Content Controls
- Coming Soon overlay logic in `src/config/coming-soon.ts` keeps `/datenschutz*` off-limits, honors ENV override `COMING_SOON`, strips locale prefixes, and treats `/docs`, `/kontakt`, `/agb`, `/impressum` as default overlays.
- CSP defaults for prerendered HTML in dev are set through `DEV_CSP` inside `astro.config.mjs`; runtime CSP enforcement is centralized in middleware.

## Observability & Debugging
- Logging utilities (`src/server/utils/logger`, `logger-factory`) feed middleware tracing and API security logs; client batching to `/api/debug/client-log` is gated by feature flag `PUBLIC_ENABLE_DEBUG_PANEL` referenced in `AGENTS.md` and `src/lib/client-logger.ts`.
- Wrangler config enables optional `logpush`, keeps `[observability.logs]` disabled by default, and exposes tailing scripts (`package.json` – `tail:staging`, `tail:prod`).

