# Evolution Hub – AGENTS Leitfaden

## Projekt-Überblick

- Evolution Hub ist eine moderne Full-Stack-Webanwendung für Developer-Tools mit KI-gestützten Features (`CLAUDE.md:8-18`).
- Hauptfeatures: AI Image Enhancer (Real-ESRGAN, GFPGAN), Prompt Enhancer, Tool-Sammlung, Stytch Magic-Link-Auth, i18n DE/EN (`CLAUDE.md:12-18`).
- Live-Umgebungen: Production `hub-evolution.com`, Staging `staging.hub-evolution.com`, Testing/CI `ci.hub-evolution.com` (`CLAUDE.md:20-24`).

## Tech Stack

- Frontend: Astro 5 (Islands, SSR/SSG), React 18, TypeScript 5 strict, Tailwind CSS 3 (`CLAUDE.md:28-35`).
- Backend & Infrastructure: Cloudflare Workers, D1, R2, KV (`CLAUDE.md:37-42`).
- Quality Tooling: Vitest, Playwright, ESLint, Prettier, Husky (Hooks derzeit deaktiviert) (`CLAUDE.md:44-49`).

## Arbeitsmodus & Grenzen

- Starte jede Aufgabe mit Analyse → Plan → Edit; liefere Pfad-/Zeilenbelege bevor du schreibst (`CLAUDE.md:53-62`).
- Pflicht-Kontext: `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `astro.config.mjs`, `wrangler.toml`, `vitest.config.ts`, `test-suite-v2/playwright.config.ts`, `README.md`, `docs/`, `.windsurf/rules/*.md` (`CLAUDE.md:63-69`).
- Selbständig erlaubt: Änderungen <300 Zeilen & <5 Dateien, Bugfixes, Test-Updates, Doku-Patches (`CLAUDE.md:71-78`).
- Rückfrage nötig bei API-/Schema-, Security- oder DB-Anpassungen, neuen Dependencies, CI/Build-Änderungen, großen Diffs (`CLAUDE.md:80-88`).
- Navigation: kein `cd`, absolute Pfade nutzen; große Dateien segmentiert lesen; keine Binärdateien öffnen; Fokus auf `src/`, `tests/`, `docs/`, `scripts/`, `migrations/` (`CLAUDE.md:89-112`).

## Build/Run/Test Quick Reference

| Befehl | Zweck | Referenz |
|--------|-------|----------|
| `npm run setup:local` | Lokale Datenbank einrichten | `CLAUDE.md:119-122` |
| `npm run dev` | Standard Worker-Dev (Port 8787) | `CLAUDE.md:119-129` |
| `npm run dev:astro` | Astro-only UI Iteration | `CLAUDE.md:123-126` |
| `npm run build` | Standard Astro Build | `CLAUDE.md:127-129` |
| `npm run build:worker` | Worker-Build inkl. Asset-Kopie (`ASTRO_DEPLOY_TARGET=worker`) | `CLAUDE.md:131-141` |
| `npm test` / `npm run test:once` | Vitest Watch / Single Run | `CLAUDE.md:145-155` |
| `npm run test:coverage` | Coverage ≥70 % Gate | `CLAUDE.md:157-166` |
| `npm run test:e2e*` | Playwright Suiten (v2 Standard, Browser-spezifisch) | `CLAUDE.md:169-199` |

## Quality & Tooling

- `npm run lint`, `npm run format`, `npm run format:check`, `npx astro check`, `npm audit --audit-level=moderate` decken CI-Gates ab (`CLAUDE.md:201-239`).
- ESLint verbietet `~/*`-Imports und erzwingt `@/*`; `no-console` scharf für auditrelevante Dateien (`CLAUDE.md:211-238`).
- Prettier: `semi`, `singleQuote`, `printWidth 100`, `arrowParens "always"` (`CLAUDE.md:240-251`).
- Markdown/OpenAPI/DB-Skripte: `npm run lint:md`, `npm run lint:md:fix`, `npm run openapi:validate`, `npm run db:generate`, `npm run db:migrate`, `npm run db:setup` (`CLAUDE.md:254-268`).

## Cloudflare Workers & Deploy

- Environments vollständig in `wrangler.toml` pflegen; keine Top-Level-Vererbung (`CLAUDE.md:272-303`).
- D1, R2 und KV-Bindings pro Environment dokumentiert (`CLAUDE.md:305-330`).
- Dev-Variablen in `[env.development.vars]`, Secrets via `npm run secrets:dev` setzen; niemals Secrets im Code (`CLAUDE.md:332-361`).
- Assets: Worker dient aus `dist/`, `.assetsignore` enthält `_worker.js` (`CLAUDE.md:363-377`).

## Code-Standards

- TypeScript strict, Pfad-Aliase `@/*` nutzen; `~/` ist verboten (`CLAUDE.md:381-424`).
- Naming: camelCase Funktionen/Variablen, PascalCase Komponenten/Klassen, UPPER_CASE Konstanten; Funktionen kurz & fokussiert halten (`CLAUDE.md:425-449`).
- Imports gruppiert oben, keine ungetypten `any`; Husky Hooks in `.husky/pre-commit` aktuell deaktiviert (`CLAUDE.md:450-471`).

## Testing-Guidelines

- Teststruktur: `tests/` für Vitest (unit/integration), `test-suite-v2/` für E2E (`CLAUDE.md:474-507`).
- Auth-E2E-Suite deckt OAuth, Magic-Link, Session, Middleware (~85 % Coverage) ab; nutze `npm run test:e2e -- src/e2e/auth/...` für Teilbereiche (`CLAUDE.md:509-543`).
- Coverage-Reporter `v8` mit Schwellenwerten 70 % (keine per-file Plicht) (`CLAUDE.md:545-565`).

## CI/CD & Health

- Pre-Deploy-Gates: Lint, Format-Check, Astro Check, `test:coverage`, `npm audit --audit-level=moderate` (`CLAUDE.md:569-590`).
- Deploy-Flow: Tag-Trigger `v*.*.*`, `workflow_dispatch` mit Staging→Production + Approval, anschließend GitHub Release (`CLAUDE.md:593-619`).
- Health-Check: `GET /api/health`, ausführbar via `npm run health-check -- --url <URL>`; Rollback über `wrangler rollback` oder Git Tag Redeploy (`CLAUDE.md:621-665`).

## Security

- Rate Limiter: `authLimiter` 10/min, `standardApiLimiter` 50/min, `sensitiveActionLimiter` 5/h; 429 Response enthält `retryAfter` (`CLAUDE.md:669-688`).
- Middleware setzt CSP, HSTS preload, X-Frame-Options DENY, COOP/COEP etc.; Audit-Logging maskiert PII (`CLAUDE.md:690-711`).
- API Responses über `withApiMiddleware` sollten `createApiSuccess`/`createApiError` nutzen (`CLAUDE.md:712-755`).

## Rollen & Workflows

- Scout-Workflow: Analyse → Plan → Begründung → Edit; Beispielplan siehe `CLAUDE.md:759-784`.
- Reviewer: prüfe Branchschema, Conventional Commits, lokale Quality-Checks (`lint`, `format:check`, `astro check`, `test:coverage`) und stelle sicher, dass CI-Gates grün sind (`CLAUDE.md:786-804`).
- Plan→Patch→Commit Prozess inkl. strikter Typisierung und Conventional Commits bleibt verbindlich (`CLAUDE.md:807-848`).

## Terminal-Nutzung

- Ohne Rückfrage: lese Befehle (`ls`, `git status` etc.), Tests (`npm test`, `npm run test:coverage`), Qualität (`npm run lint`, `npm run format:check`, `npx astro check`) (`CLAUDE.md:852-865`).
- Rückfrage nötig: `npm install`, `npm audit fix`, schreibende Git-Befehle, Deploy-Builds, DB-Befehle (`CLAUDE.md:867-881`).

## Referenz-Dateien

- Kritische Konfigs und Workflows: `package.json`, `tsconfig.json`, `astro.config.mjs`, `wrangler.toml`, `eslint.config.js`, `.prettierrc.json`, `vitest.config.ts`, `test-suite-v2/playwright.config.ts`, `test-suite-v2/fixtures/auth-helpers.ts`, `.github/workflows/unit-tests.yml`, `.github/workflows/deploy.yml`, `src/middleware.ts`, `src/lib/api-middleware.ts`, `src/lib/rate-limiter.ts`, `.windsurf/rules/*.md` (`CLAUDE.md:885-904`).

## Bekannte Probleme

- OAuth/Stytch-Lokallogin: Session-Cookies nur über `Set-Cookie` Header setzen; prüfe `src/pages/api/auth/oauth/[provider]/callback.ts` und `src/pages/api/auth/callback.ts` bei Redirect-Issues (`CLAUDE.md:908-939`).

## Ressourcen

- Primäre Dokumentation: `README.md`, `docs/development/ci-cd.md`, `docs/SECURITY.md`, `docs/architecture/system-overview.md`, `docs/api/`, `docs/architecture/auth-flow.md`, `docs/ops/stytch-custom-domains.md` (`CLAUDE.md:942-952`).
- Contributing & Cascade-Regeln: `CONTRIBUTING.md`, `AGENTS.md`, `.windsurf/rules/project-structure.md`, `.windsurf/rules/api-and-security.md`, `.windsurf/rules/testing-and-ci.md`, `.windsurf/rules/tooling-and-style.md` (`CLAUDE.md:954-964`).
