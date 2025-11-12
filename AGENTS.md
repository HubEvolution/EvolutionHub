# AGENTS.md (Root)

## Zweck

- Verbindliche Arbeitsregeln für Agenten in diesem Repo.
- Gilt für den gesamten Repository‑Baum, außer wo untergeordnete AGENTS.md anders festlegen.

## Priorität & Geltung

- Geltung: Jede AGENTS.md gilt für alle Dateien unterhalb ihres Ordners.
- Priorität: Tiefer liegende AGENTS.md überschreiben höhere.
- Zusätzlich zu beachten: Konversation (aktuelle Anweisungen), `mcp_config.json`, `.codex/config.toml`, relevante Projektdokumente (z. B. `docs/api/*`). Direkte Anweisungen des Nutzers haben Vorrang.
- Rules‑Kaskade: `.windsurf/rules/*` sind projektweite Leitplanken. Feature‑Regeln können Baselines explizit erweitern (Frontmatter `scope`, `extends`).

## Allgemeine Prinzipien

- Minimal‑invasiv ändern, keine ungefragten Groß‑Refactors.
- Keine neuen Dependencies ohne explizite Freigabe.
- Bevorzuge bestehende Patterns/Utilities und halte dich an Repository‑Konventionen.

## Technologie-/Repo-Kontext

- TypeScript strikt; Astro/React unter `src/components`, API‑Routen unter `src/pages/api`.
- Validierungsschemata: `src/lib/validation` und `src/lib/validation/schemas`.
- Logging: `src/config/logging.ts`, `src/lib/services/logger-utils.ts`; Doku: `docs/features/production-logging.md`, `docs/runbooks/logging-pipeline.md`.
- i18n: `src/locales/en.json`, `src/locales/de.json`.
- Tests: `tests`, `test-suite-v2`, `tests/src`, Performance: `tests/performance`.

## Code-Stil & Qualität

- TypeScript: keine neuen `any`; präzise Typen, vorhandene Typdefinitionen nutzen (`src/lib/types`, `src/content/types.ts`, `src/lib/db/types.ts`). Durchsetzung per ESLint:
  - `src/**/*.{ts,tsx}`: `@typescript-eslint/no-explicit-any=error`
  - `src/**/*.astro`, `tests/**`: `no-explicit-any=warn`
  - `.d.ts`‑Shims/Provider‑Decls sind ausgenommen
- Validierung: Eingaben über Schemata prüfen (Schema‑first); Typen daraus ableiten.
- Fehlerbehandlung: Konsistente API‑Fehlerformate gemäß `docs/api/api-guidelines.md` und `docs/api/error-handling.md`.
- Logging: PII maskieren; strukturiert loggen; `logger-utils.ts` verwenden. Kein unkontrolliertes Debug‑Logging im Hot‑Path (Feature‑Flag nutzen).

## Security

- AuthN/AuthZ zentral beachten (z. B. `src/middleware.ts`, `src/server/utils/jwt.ts`).
- Rate Limiting respektieren (`src/lib/rate-limiter.ts`) und Admin‑Routen besonders schützen.
- Secrets niemals im Code/Logs; beachte `docs/reference/auth-envs-and-secrets.md`.
- Für Backups/Exporte: `docs/ops/*` und Admin‑API‑Guidelines befolgen.
- Cookies/Consent beachten (Analytics/Tracking nur nach Opt‑In): siehe `.windsurf/rules/cookies-and-consent.md`.

## Tests

- API‑Änderungen: mind. ein passender Integrationstest (`tests/integration/...`, Hilfen unter `tests/shared/http.ts`).
- Utilities/Services: Unit‑Tests (`tests/unit/...` bzw. `test-suite-v2/...`).
- Performance‑relevantes: bei Hot‑Paths `tests/performance/*` berücksichtigen.
- Fixtures/Seeds wiederverwenden (`tests/integration/setup/*`, `src/pages/api/test/*`). Keine flakey Tests.
- Mindestabdeckung: V8 Coverage ≥ 70% für `src/**/*.{ts,tsx}`.

## i18n & Content

- Keine hardcodierten UI‑Texte; immer i18n‑Keys in `en.json`/`de.json`.
- Keys konsistent benennen (bestehende Konvention beibehalten). Übersetzungen synchron halten.

## Doku & OpenAPI

- API‑Änderungen synchronisieren: `openapi.yaml` und `docs/api/*` aktualisieren.
- Runbooks/Ops anpassen, wenn betroffen (`docs/runbooks/*`, `docs/ops/*`).
- Zod↔OpenAPI: Kein Auto‑Overwrite. Bei `.strict()` → `additionalProperties: false`. Pilot/Diff nutzen (`npm run openapi:zod:pilot|diff`).

## Migrations & DB

- Neue Migrationen unter `migrations/` ablegen; Nummerierung/Konvention beibehalten.
- Schema‑Doku aktualisieren (`docs/architecture/database-schema.md`, ggf. ADRs).

## Performance & Kosten

- Caching/KV gemäß bestehenden Patterns (`src/lib/kv/*`) einsetzen.
- Unnötige API‑Roundtrips in Admin/Tools vermeiden.

## Feature Flags

- `src/utils/feature-flags.ts` nutzen; Flags default „off“, sichere Fallbacks.

## Commands & Workflows

- Build
  - `npm run build` → Astro Build (static/worker je nach ENV)
  - `npm run build:worker` | `:dev` | `:staging` | `:ci` → Worker‑Bundle für Cloudflare, Assets‑Sync ins `dist/`
  - `npm run build:watch` → inkrementelles Build
  - Preview: `npm run preview`
- Lint & Format
  - Lint: `npm run lint` (ESLint über `src/**/*.{ts,astro}`)
  - Markdown‑Lint: `npm run lint:md`
  - Format‑Check: `npm run format:check`
- Typecheck & Astro Check
  - TS: `npm run typecheck` (Root) und `npm run typecheck:src`
  - Astro UI Schema/Types: `npm run astro:check:ui`
- Tests
  - Unit: `npm run test:unit` | einmalig `test:unit:run`
  - Integration: `npm run test:integration` | einmalig `test:integration:run`
  - E2E (Playwright v2): `npm run test:e2e` bzw. `:chromium`/`:firefox`/`:webkit`
  - Coverage: `npm run test:coverage`
  - Watch/Dev: `npm run test:watch`
- Docs
  - Voller Durchlauf: `npm run docs:build`
  - Einzelne Schritte: `docs:ref:types` | `docs:ref:openapi` | `docs:ref:env` | `docs:toc` | `docs:lint` | `docs:links` | `docs:inventory`
- Deploy
  - Staging: `npm run deploy:staging` (setzt `--env staging`)
  - Production: `npm run deploy:production`
  - Testing/CI: `npm run deploy:testing`
  - Direkter Deploy: `npm run deploy` (script steuert Ziel via Flags)
- Dev‑Server
  - Astro: `npm run dev:astro`
  - Cloudflare Worker: `npm run dev:worker` | `dev:worker:dev` | `dev:worker:nobuild` | `dev:open`
  - Pages‑Fallback lokal: `npm run dev:pages-fallback`
- Health/Sicherheit
  - Health‑Check: `npm run health-check`
  - Env/Secrets: `npm run validate:env` | `npm run secrets:check`

Hinweise

- CI/Worker nutzt `wrangler.toml` bzw. `wrangler.ci.toml` und Kompatibilitätsflags (`nodejs_compat`).
- Für Worker‑Builds wird `ASTRO_DEPLOY_TARGET=worker` gesetzt; Assets werden in `dist/assets` gespiegelt.
- Vor Deploy: Lint, Typecheck, Tests (mind. Unit+Integration), Astro‑Check und Docs aktualisieren.

## PR-Checkliste (Agent muss erfüllen)

- [ ] Strikte Typen; keine neuen `any`.
- [ ] Input validiert; Fehler gemäß API‑Guidelines modelliert.
- [ ] Logs kontextualisiert; PII maskiert.
- [ ] Tests angepasst/neu (unit/integration/perf bei Bedarf).
- [ ] i18n‑Keys gepflegt; keine UI‑Hardcodes.
- [ ] Doku + `openapi.yaml` aktualisiert (falls API betroffen).
- [ ] Keine ungefragten Dependencies/Refactors.

## Nicht erlaubt

- Lizenz‑Header hinzufügen.
- Secrets/PII im Code/Logs.
- Tests entfernen/abschalten ohne Grund + Freigabe.
- Rate Limiter/Auth umgehen.
