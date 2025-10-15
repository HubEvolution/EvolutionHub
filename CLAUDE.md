# CLAUDE.md — Evolution Hub Project Guide

## Intro

> Leitfaden für KI‑Agenten (Claude Code)
> Last Updated: 2025-10-10

---

## Projekt-Übersicht

- Evolution Hub ist eine Full‑Stack‑Webanwendung mit KI‑gestützten Developer‑Tools.
- Hauptfeatures:
  - AI Image Enhancer (Real‑ESRGAN, GFPGAN)
  - Prompt Enhancer (LLM‑basierte Prompt‑Optimierung, inkl. Attachments)
  - Passwordless Auth via Stytch (Magic Link + OAuth)
  - i18n DE/EN
- Live URLs:
  - Production: <https://hub-evolution.com>
  - Staging: <https://staging.hub-evolution.com>
  - CI/Testing: <https://ci.hub-evolution.com>

---

## Tech Stack

- Frontend: Astro 5, React 18, TypeScript (strict), Tailwind CSS 3
- Edge: Cloudflare Workers (adapter mode: directory)
- Storage: Cloudflare D1, R2, KV (pro Environment gebunden)
- Build Output: `server`; Worker Entry: `dist/_worker.js/index.js`
- Static Assets: Wrangler `assets` aus `dist` mit `.assetsignore` für `_worker.js`

---

## Tooling & Konventionen

- TypeScript strict, Pfad‑Aliasse in `tsconfig.json` (`@/*`, `@api/*`, `@components/*`, …)
- ESLint: verbietet `~/*` (stattdessen `@/*`), React Hooks Regeln aktiv, selektives `no-console`
- Prettier: 2 Leerzeichen, Single Quotes, `printWidth 100`, `semi: true`, Astro‑Plugin
- Naming: PascalCase (Komponenten/Stores), camelCase (Utilities)

---

## Commands (Scripts)

- Dev
  - `npm run dev` (Worker dev), `dev:worker`, `dev:worker:dev`, `dev:astro`, `dev:open`, `dev:e2e`
  - `dev:pages-fallback` (Pages dev gegen `dist/`)
- Build/Preview
  - `npm run build`, `preview`
  - `build:worker`, `build:worker:dev`, `build:worker:staging`, `build:watch`
- Tests
  - Vitest: `test`, `test:once`, `test:watch`, `test:coverage`, `test:unit*`, `test:integration*`
  - Playwright: `test:e2e` (v2), `test:e2e:v1` (legacy), Browser‑scoped Varianten, `test:e2e:ui`
  - Reports: `test:e2e:report` (öffnet v2 HTML Report)
- Docs/Quality
  - `lint`, `format`, `format:check`, `lint:md`, `lint:md:fix`
  - OpenAPI: `openapi:validate`, `openapi:redoc`
  - Docs: `docs:build` (+ Unterkommandos)
- DB/Dev
  - `setup:local`, `db:setup`, `db:generate`, `db:migrate`
  - `tail:staging`, `tail:prod`, `secrets:dev`

Hinweis Worker‑Build: `build:worker*` kopiert `dist/_worker.js/assets` nach `dist/assets` und schreibt `dist/.assetsignore` mit `_worker.js`.

---

## Testing Gates & Konfiguration

- Vitest
  - Coverage‑Schwellen: 70% (V8). Unit in `jsdom` mit `src/setupTests.ts`, Integration in Node.
- Playwright (root)
  - Tests: `tests/e2e/specs`; auto‑start lokaler Dev wenn `BASE_URL` lokal.
  - Reporter: HTML nach `playwright-report`.
- Playwright (v2)
  - Tests: `test-suite-v2/src/e2e`; auto‑start Dev‑Worker via Root‑Projekt.
  - Reporter: HTML nach `test-suite-v2/reports/playwright-html-report` (+ JSON/JUnit).
- E2E setzen `Origin` Header für Same‑Origin/CSRF Checks.

---

## Security & Middleware

- Global Middleware (`src/middleware.ts`)
  - Request‑Logging mit `requestId`; WWW→Apex Redirect.
  - CSP Nonce‑Generierung; DEV CSP entspannt, PROD nonce‑basiert mit strict‑dynamic.
  - HSTS (preload), COOP same-origin, X‑Frame‑Options DENY, X‑Content‑Type‑Options nosniff, strikte Permissions‑Policy.
  - Locale‑Redirects, Welcome‑Gate, Bot‑Handling; PII‑redactete Header in Logs.
  - Routen unter `/r2-ai/**` sind von Gates ausgenommen (öffentlich zugänglich).
- API Middleware (`src/lib/api-middleware.ts`)
  - Wrapper (`withApiMiddleware`/`withAuthApiMiddleware`), Rate Limiting, Security‑Header.
  - Einheitliche JSON‑Antworten (`createApiSuccess`/`createApiError`), `createMethodNotAllowed` (405 mit Allow).
  - Same‑Origin für unsichere Methoden; optional Double‑Submit CSRF (`enforceCsrfToken: true`).
  - Zusätzliche erlaubte Origins via Env: `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN`.
- Rate Limiting (`src/lib/rate-limiter.ts`)
  - Presets: `standardApiLimiter` 50/min, `authLimiter` 10/min, `sensitiveActionLimiter` 5/h, `apiRateLimiter` 30/min, `aiJobsLimiter` 10/min, `aiGenerateLimiter` 15/min.
  - 429 Antworten liefern `Retry-After` Sekunden.
- CSRF
  - Client‑Helper `src/lib/security/csrf.ts` erstellt `csrf_token` (Lax). Server validiert via Middleware‑Optionen.

---

## Cloudflare & Build

- `wrangler.toml`
  - Worker Entry: `dist/_worker.js/index.js`; `assets` dienen aus `./dist` (`run_worker_first` für `/r2-ai/*`, `/api/*`).
  - Environments: `development` (lokal), `testing` (CI), `staging`, `production`; Bindings je Env explizit (keine implizite Vererbung).
  - D1, R2, KV Bindings für jede Env gesetzt; Secrets via `wrangler secret put` (keine Secrets im Code).
- `astro.config.mjs`
  - Adapter Cloudflare (directory); `staticAssetHeaders` setzt Content‑Types, Cache‑Header und DEV‑CSP auch für prerenderte HTMLs.

---

## Projektstruktur & Routen

- Runtime Code: `src/`
  - UI: `src/components`, `src/layouts`, Seiten in `src/pages` (Astro + API).
  - Shared: `src/lib`, `src/config`, `src/utils`.
  - Global Middleware: `src/middleware.ts`.
- R2 Proxy: `src/pages/r2/**`, `src/pages/r2-ai/**` (öffentlich, Gate‑Ausnahme).
- Content: `src/content/`, Locales: `src/locales/`, Styles: `src/styles/`.
- Tooling: `scripts/`, Migrationen: `migrations/`.

---

## Arbeitsweise (für Agenten)

- Vor jedem Edit: Kurz scouten (rg/ls/cat), dann fokussierten Patch planen und anwenden.
- Kleine/mittlere Änderungen selbstständig; größere/risikoreiche Änderungen mit kurzer Begründung ankündigen.
- Halte Änderungen minimal und im Stil des Codebases; keine unnötigen Refactors.
- Bevorzugte Bereiche: `src/`, `tests/`, `docs/`, `scripts/`, `migrations/`. Meide `dist/`, `node_modules/`.

---

## Nützliche Referenzen

- AGENTS: `AGENTS.md`
- README: `README.md`
- Security: `docs/SECURITY.md`, `docs/security/`
- Architektur: `docs/architecture/`
- E2E Configs: `playwright.config.ts`, `test-suite-v2/playwright.config.ts`
- CI/CD Workflows: `.github/workflows/`
- Windsurf Regeln: `.windsurf/rules/*.md`

---

<!-- ownership: mixed -->

## Sync (auto)

```sync:claude
# (auto-managed)
# Inhalte werden vom Workflow geschrieben:
# - Kurz-Rationales (1–3 Zeilen) zu geänderten Bereichen
# - Do/Don't Bullets je Feature
# - Refs auf Rules + relevante Docs/ADRs
Ende
```
