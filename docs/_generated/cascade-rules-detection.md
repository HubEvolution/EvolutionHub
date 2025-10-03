# Cascade Rules Detection Summary

## Source Signals Reviewed
- `AGENTS.md` — repository guidelines outlining structure, naming, and workflow specifics.
- `package.json` — scripts for development, testing, linting, and build automation plus dependency stack (Astro, Cloudflare adapter, Vitest, Playwright).
- `tsconfig.json` — strict compiler configuration and path aliases.
- `eslint.config.js` and `.prettierrc.json` — lint/format baselines.
- `astro.config.mjs` — adapter mode, static asset headers, CSP defaults, and alias mapping.
- `wrangler.toml` — environment bindings for D1, R2, KV, and production routing.
- `vitest.config.ts` — unit/integration project setup and coverage thresholds.
- `playwright.config.ts` — e2e bootstrap command, retry strategy, and headers.
- `src/middleware.ts` — request logging, Basic Auth gate, locale handling, CSP nonce emission, and `/r2-ai/**` exclusions.
- `src/lib/api-middleware.ts`, `src/lib/rate-limiter.ts`, `src/lib/security/csrf.ts` — API response contracts, security headers, rate limits, and CSRF utilities.
- `src/config/coming-soon.ts` — overlay patterns, exclusions, and ENV overrides.

## Verified Findings
- Astro 5 with Cloudflare directory adapter handles server output while `build:worker` copies assets into `dist/assets` and writes `.assetsignore` (`astro.config.mjs`, `package.json`).
- Development flows center on Wrangler-backed scripts (`dev:worker`, `dev:worker:dev`, `dev:e2e`) and Astro preview/build commands (`package.json`).
- TypeScript operates in strict mode with bundler resolution, React JSX runtime, and alias coverage for `@/*` namespaces (`tsconfig.json`).
- ESLint enforces React hook best practices, restricts `~/*` imports, and stages `no-console` enforcement for specific API files; Prettier sets 2-space, single-quote formatting with Astro plugin support (`eslint.config.js`, `.prettierrc.json`).
- Vitest multi-project config runs unit tests in `jsdom` with `src/setupTests.ts`, integration tests in Node with global setup, and enforces 70% V8 coverage across statements/branches/lines/functions (`vitest.config.ts`).
- Playwright injects an `Origin` header, spawns `npm run dev:e2e` when targeting localhost, and records HTML reports by default (`playwright.config.ts`).
- Middleware safeguards include apex redirect, Basic Auth gating that skips `/api/**`, assets, and `/r2-ai/**`, CSP nonce creation, session cookie handling, and locale redirects (`src/middleware.ts`).
- API middleware standardizes JSON payloads, sets security headers (HSTS preload, X-Frame-Options DENY, Permissions-Policy camera/microphone/geolocation empty), enforces same-origin, and supports CSRF double submit plus named rate limiter presets (30/min default, 10/min auth, 5/hour sensitive, etc.) (`src/lib/api-middleware.ts`, `src/lib/rate-limiter.ts`).
- CSRF helpers mint 32-hex tokens with Lax cookies and validate header/cookie matches (`src/lib/security/csrf.ts`).
- Coming Soon overlay protects `/datenschutz*` and honors env override `COMING_SOON` while applying default patterns to `/docs`, `/kontakt`, `/agb`, `/impressum` (`src/config/coming-soon.ts`).

## Output Artifacts
- Generated `.windsurf/global_rules.md` capturing the consolidated ruleset above.
- Authored `.windsurf/rules/project-structure.md`, `tooling-and-style.md`, `api-and-security.md`, and `testing-and-ci.md` with evidence-backed constraints.
- Logged lint guidance in `cascade-rules-lint.txt` (see repository root).
