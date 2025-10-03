# Repository Guidelines

## Project Structure & Module Organization

Evolution Hub is an Astro + Cloudflare Workers app. Runtime source lives under `src/` with UI in `components/` and `pages/`, server handlers in `server/` and shared logic in `lib/`, `stores/`, and `utils/`. Content entries are under `src/content/`, locales in `src/locales/`, and styles in `src/styles/`. Automation and migration scripts live in `scripts/` and `migrations/`. End-to-end assets (fixtures, snapshots, reports) sit alongside tests in `tests/` and `test-suite-v2/`. Built worker files output to `dist/`, while static assets resolve from `public/`.

## Build, Test, and Development Commands

Use `npm run dev:remote` for the default Cloudflare-backed dev server, or `npm run dev:worker:dev` when iterating locally without remote services. `npm run build` emits the Astro worker bundle. Run all unit and integration suites with `npm run test`, or scope to `npm run test:unit` / `npm run test:integration`. Launch Playwright end-to-end checks via `npm run test:e2e` and open the HTML report with `npm run test:e2e:report`. `npm run lint` covers TypeScript/Astro linting, and `npm run format:check` validates Prettier formatting.

## Coding Style & Naming Conventions

The repo targets TypeScript with strict module resolution (`tsconfig.json`) and formats via Prettier (2-space indent, single quotes). Components and stores use PascalCase filenames (`ProfileCard.astro`, `UserStore.ts`); shared utilities stay camelCase (`fetchProfile.ts`). React hooks should be prefixed with `use`. Run `npm run format` before submitting; ESLint rules (see `eslint.config.js`) enforce import ordering, unused checks, and Astro template hygiene.

## Testing Guidelines

Place new unit specs next to the target module under `tests/unit/**` using `*.spec.ts` naming. Integration flows belong in `tests/integration/**`, and UI automation extends Playwright configs in `test-suite-v2/`. Seeded fixtures live in `tests/fixtures/`. Execute `npm run test:coverage` to confirm V8 coverage before large changes; Playwright snapshots should be regenerated with `npm run test:e2e:update-snapshots` when UI baselines shift.

## Commit & Pull Request Guidelines

Follow Conventional Commits (`type(scope): summary`), mirroring existing history (e.g., `refactor(logging): consolidate worker adapters`). Include context in the body for migrations or scripts. PRs should summarize intent, list affected routes or services, link related issues, and attach logs or screenshots for UI updates. Ensure lint/test checks pass locally and note any follow-up work in the PR description.

# GLOBAL_RULES.md — Projektregeln (IST, 2025-10-03)

Diese Regeln spiegeln den aktuellen Stand der Codebasis wider (Astro/TypeScript auf Cloudflare Workers). Quelle: tatsächliche Konfiguration und Implementierung in `astro.config.mjs`, `wrangler.toml`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `src/middleware.ts`, `src/lib/**`, `src/pages/api/**`, `openapi.yaml`, sowie Test-Configs.

## Stack & Architektur

- **Framework/Runtime**: Astro v5 mit Adapter `@astrojs/cloudflare` (Directory-Mode). React- und Tailwind-Integrationen in `astro.config.mjs`.
- **Zielplattform**: Cloudflare Workers + D1 (DB), KV, R2 (Assets). Bindings/Envs je Umgebung in `wrangler.toml` (`development`, `testing`, `staging`, `production`).
- **Modulorganisation**: Runtime-Code unter `src/`.
  - UI: `src/components/`, `src/pages/`, Layouts in `src/layouts/`.
  - Server/Handlers: Astro API-Routen in `src/pages/api/**`.
  - Shared/Infra: `src/lib/`, `src/config/`, `src/utils/`.
  - Inhalte/Locales: `src/content/`, `src/locales/`, Styles in `src/styles/`.
  - Automatisierung/Migrationen: `scripts/`, `migrations/`.
  - E2E/Tests/Artefakte: `tests/**`, `test-suite-v2/**`.
  - R2-Proxy-Routen: `src/pages/r2/**`, `src/pages/r2-ai/**`.

## Entwicklung, Build & Skripte

- **Dev-Server**: `npm run dev:remote` (Workers-Remote), `npm run dev:worker:dev` (lokal ohne Remote), `npm run dev:e2e` für Playwright-Läufe (startet Worker).
- **Build**: `npm run build` (Astro), Worker-Bundles über `build:worker*`-Skripte. Assets-Header via Adapter `staticAssetHeaders` in `astro.config.mjs`.
- **Preview**: `npm run preview`.
- **Lint/Format**: `npm run lint`, `npm run format`, `npm run format:check`.
- **OpenAPI**: `npm run openapi:validate`, `openapi.yaml` ist Quelle der Routen-Doku.
- **Datenbank/Setup**: `npm run db:setup` (lokal), Drizzle-Skripte vorhanden.

## TypeScript, ESLint, Prettier

- **TS-Strict**: `strict: true`, `noUnusedLocals/Parameters: true`, Pfad-Aliase in `tsconfig.json` (`@/*`, `@api/*`, etc.).
- **ESLint**: Regeln in `eslint.config.js` (u. a. `no-empty` mit erlaubten Catches, React Hooks-Regeln, `no-restricted-imports` für `~/*`).
- **Prettier**: `singleQuote: true`, `tabWidth: 2`, `printWidth: 100`, Astro-Plugin in `.prettierrc.json`.
- **Namenskonventionen**: Komponenten/Stores PascalCase-Dateinamen, Utilities camelCase (siehe `AGENTS.md`).

## Tests

- **Vitest**: Multi-Project-Setup in `vitest.config.ts`.
  - Unit (jsdom): inkludiert `src/**/*.{test,spec}.{ts,tsx}` und `tests/unit/**`.
  - Integration (node): `tests/integration/**`, `global-setup` aktiv.
  - Coverage: Provider V8, Schwellen 70% global, `include: src/**/*.{ts,tsx}`.
- **Playwright**: `playwright.config.ts` nutzt `baseURL` (mit optionalem `TEST_BASE_URL`). Setzt same-origin `Origin`-Header für POSTs (CSRF-Checks). Projekte: chromium/firefox/webkit, WebServer lokal nur für Loopback-Ziele.

## Middleware & Sicherheit (global)

- **Globale Middleware**: `src/middleware.ts` setzt Request-Tracing (`requestId`), anonymisiert IPs, redaktiert sensible Header in Logs.
- **CSP**:
  - Dev-like (lokal/preview): relaxte Policy mit `'unsafe-inline'`/`'unsafe-eval'` für HMR; externe Quellen u. a. `cdn.jsdelivr.net`, `googletagmanager.com`, `plausible.io`, `static.cloudflareinsights.com`.
  - Production (`ENVIRONMENT === 'production'`): strikte, nonce-basierte Policy mit `'strict-dynamic'`; Nonce pro Request (`cspNonce`). `report-uri /api/csp-report` aktiv. Header werden serverseitig auf alle Antworten angewandt.
- **Weitere Security-Header**: `Strict-Transport-Security` (inkl. `preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` restriktiv, `Referrer-Policy` gezielt für Reset-Passwort-Seiten.
- **Basic Auth Gate (Prod)**: Wenn `SITE_AUTH_ENABLED` (Default true) und `SITE_PASSWORD` gesetzt, dann Basic-Auth-Gate für HTML-Seiten auf `hub-evolution.com` (nicht für `/api/**`, Assets, `/r2-ai/**`).
- **Locale & Redirects**: Neutrale Pfade vs. `/en/*` abhängig von Cookie `pref_locale`. Splash-Gate nur einmal pro Session (`session_welcome_seen`). Auth-Routen und Imag-Enhancer-Tool sind ausgenommen.
- **Session-Erkennung**: Liest zuerst `__Host-session`, dann Fallback `session_id` (siehe `src/middleware.ts`).

## API-Design & Server-Middleware

- **API-Wrapper**: `src/lib/api-middleware.ts` implementiert standardisierte Antworten, Rate-Limiting, Security-Headers, Logging, CORS/CSRF-Prüfungen sowie Varianten `withApiMiddleware`, `withAuthApiMiddleware`, `withRedirectMiddleware`.
- **JSON-Antwort-Formate**:
  - Erfolg: `{ success: true, data: T }` (via `createApiSuccess()`)
  - Fehler: `{ success: false, error: { type, message, details? } }` (via `createApiError()`)
  - Einheitliche 405: `createMethodNotAllowed(allow)` setzt Header `Allow`.
- **CSRF & Origin**:
  - Default: Same-Origin-Prüfung für unsichere Methoden (POST/PUT/PATCH/DELETE) via `Origin`/`Referer` (`requireSameOriginForUnsafeMethods` true).
  - Optional strikt: Double-Submit (`X-CSRF-Token` muss Cookie `csrf_token` entsprechen) via `enforceCsrfToken`.
  - Client-Helfer: `src/lib/security/csrf.ts` (`ensureCsrfToken()` setzt Lax-Cookie, Secure bei HTTPS; `validateCsrfToken()` prüft 32-hex & Cookie-Match).
- **CORS/Allowed Origins**: Aus Umgebungsvariablen (`ALLOWED_ORIGINS|ALLOW_ORIGINS|APP_ORIGIN|PUBLIC_APP_ORIGIN`) plus Request-Origin (siehe `resolveAllowedOrigins()` in `api-middleware.ts`).
- **Rate-Limiting**: In `src/lib/rate-limiter.ts` vordefiniert:
  - `apiRateLimiter`: 30/min (Default in API-Middleware)
  - `standardApiLimiter`: 50/min (Alternative)
  - `authLimiter`: 10/min
  - `sensitiveActionLimiter`: 5/Std
  - `aiGenerateLimiter`: 15/min
  - `aiJobsLimiter`: 10/min
  - 429 antwortet mit JSON und Header `Retry-After` (Sekunden).

## Routen, OpenAPI & Deprecations

- **OpenAPI**: `openapi.yaml` spiegelt Astro-API-Routen (`x-source`) und Fehler-Mapping wider.
  - AI-Image-Endpunkte verlangen teils `X-CSRF-Token` (Double-Submit) und mappen Providerfehler vereinheitlicht: 401/403 → `forbidden`, 4xx → `validation_error`, 5xx → `server_error`.
  - Mehrere Legacy-Auth-Endpunkte sind als deprecated markiert und liefern `410 Gone` gemäß Spec.
- **R2-Proxies**: `src/pages/r2-ai/[...path].ts` schützt Owner-spezifische Result-Pfade, lässt Upload-Pfade öffentlich (für Provider-Fetches), setzt differenzierte Cache-Control. Diese Routen werden in `src/middleware.ts` nie gegated/umgeleitet.

## Debug/Observability

- **Debug Panel (Client → Server)**: Clientseitiger Logger `src/lib/client-logger.ts` bündelt Logs (Batch, 1s Flush) und sendet an `POST /api/debug/client-log` (`src/pages/api/debug/client-log.ts`). Aktiv nur bei `PUBLIC_ENABLE_DEBUG_PANEL === 'true'`.
- **CSP- & Access-Logs**: CSP-Reports via `POST /api/csp-report`. Request-/Response-Logging mit Redaction (`sanitizeHeaders`) und IP-Anonymisierung (`anonymizeIp`) in `src/middleware.ts`.

## Coming Soon Overlay

- **Konfiguration**: `src/config/coming-soon.ts`
  - Default-Patterns: `COMING_SOON_PATTERNS` (Prefix `*` unterstützt), ENV-Override möglich (Env `COMING_SOON`).
  - Hard-Exclusions: `COMING_SOON_EXCLUDE_PATTERNS` enthält `'/datenschutz*'` (DE/EN) — niemals überdecken.

## Auth & Cookies (IST)

- **Session-Cookies**: Ziel ist `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/). Fallback `session_id` wird toleriert (SameSite=Lax). Gelesen im Middleware-Flow.
- **Verifizierungen**: Unverifizierte Nutzer auf Dashboard-Routen werden auf `*/verify-email` umgeleitet und erhalten `email` im Query (siehe `src/middleware.ts`).

## Qualität, Commits & PRs

- **Qualität**: Lint (ESLint 9) und Format (Prettier 3) sind verpflichtend; CI bricht bei Verstößen (Projektregeln setzen Warnungen/Fehler je Datei-Kontext). Kurze, fokussierte Funktionen (< ~50 LOC) und flache Verschachtelung anstreben.
- **Commits**: Conventional Commits (`type(scope): summary)`. Kontext bei Migrationen/Skripten im Body. Siehe `AGENTS.md`.
- **PRs**: Intent erläutern, betroffene Routen/Services listen, relevante Logs/Screenshots anfügen, sicherstellen, dass Lint/Tests grün sind.

## Richtlinien für Änderungen (Sicherheits- & Betriebsrelevanz)

- **Secrets & Konfiguration**: Keine Secrets ins Repo. Nutzung von Wrangler-Secrets/ENV. Änderungen an `wrangler.toml` (Bindings/ENV) immer bewusst durchführen und pro Umgebung prüfen.
- **Sicherheitsrelevantes**: CSP, Cookies, Auth-Flows und Rate-Limits nur mit Bedacht anpassen. 429-Antworten stets mit `Retry-After`. Bei neuen mutierenden Endpunkten CSRF/Origin-Checks aktivieren (`withApiMiddleware` + Optionen, ggf. `enforceCsrfToken`).
- **API-Konsistenz**: Erfolg/Fehler-Shape strikt beibehalten. 405 immer mit `Allow`. Für HTML-Redirect-Flows `withRedirectMiddleware` verwenden.
- **R2/Assets**: `/r2-ai/**` nie durch Gates/Overlays/Basic-Auth einschränken. Cache-Header verantwortlich setzen.

## Nützliche Referenzen (Code)

- **Astro/Vite/Adapter**: `astro.config.mjs`
- **Worker/Envs/Bindings**: `wrangler.toml`
- **Global Middleware (CSP, Locale, Auth, Gates)**: `src/middleware.ts`
- **API Middleware (CSRF/Origin, Limits, Errors/JSON)**: `src/lib/api-middleware.ts`
- **Rate Limiter**: `src/lib/rate-limiter.ts`
- **CSRF Utils**: `src/lib/security/csrf.ts`
- **Coming Soon**: `src/config/coming-soon.ts`
- **Debug Client Log**: `src/pages/api/debug/client-log.ts`, `src/lib/client-logger.ts`
- **OpenAPI Spec**: `openapi.yaml`
- **Tests**: `vitest.config.ts`, `playwright.config.ts`
