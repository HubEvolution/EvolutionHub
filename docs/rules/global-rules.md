# Evolution Hub — Global Rules (Security/Infra/Tooling Baseline)

## 1. Scope & Präzedenz

- Muss: Diese Global Rules bilden die Baseline (Security/Infra/Tooling/Struktur).
- Muss: Präzedenz: Global > projektbezogene Rules > Code‑Kommentare.
- Muss: Security‑Grenzen sind nicht abschwächbar; Projekt‑Rules dürfen nur schärfen.
- Sollte: Projekt‑Rules dokumentieren nur Deltas/Ergänzungen zur Baseline.

## 2. API & Security Baseline

- Muss: Astro API‑Handler über `withApiMiddleware`/`withAuthApiMiddleware` (Rate‑Limits, Security‑Header, Logging).
- Muss: Einheitliche JSON‑Shapes: `createApiSuccess` / `createApiError({ type, message, details? })`.
- Muss: 405 nur über `createMethodNotAllowed` (setzt `Allow`).
- Muss: Unsafe Methods (POST/PUT/PATCH/DELETE) → Same‑Origin; bei sensiblen Endpunkten Double‑Submit CSRF (`X-CSRF-Token` ↔ `csrf_token`).
- Muss: Security‑Header aktiv (HSTS preload, X‑Frame‑Options DENY, X‑Content‑Type‑Options nosniff, Referrer‑Policy strict‑origin‑when‑cross‑origin, Permissions‑Policy minimal). CSP kommt aus globaler Middleware.
- Muss: `/r2-ai/**` bleibt öffentlich und ungated.
- Sollte: Allowed‑Origins via Env (`ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN`) pflegen.

Code‑Anker: `src/lib/api-middleware.ts`, `src/middleware.ts`, `src/pages/r2-ai/**`
CI/Gates: `npm run test:integration` (API), `npm run lint`, `npm run openapi:validate`

## 3. OpenAPI ↔ Zod (Hybrid)

- Muss: Request‑Validierung mit Zod (`safeParse` + `formatZodError`); Fehler‑Typen: `validation_error|forbidden|server_error`.
- Muss: OpenAPI (`openapi.yaml`) spiegelt Zod‑Schemas; strikte Objekte → `additionalProperties: false`.
- Sollte: Zod→OpenAPI Pilot + Diff nutzen; kein Auto‑Overwrite der YAML.

Code‑Anker: `src/lib/validation/**`, `openapi.yaml`
CI/Gates: `npm run openapi:validate`, optional `openapi:zod:*`

## 4. Project Structure & Aliases

- Muss: Runtime root `src/` (UI: `src/components|pages|layouts`, Shared: `src/lib|config|utils`).
- Muss: R2‑Proxy: `src/pages/r2/**` und `src/pages/r2-ai/**` (öffentlich).
- Muss: Aliase `@/*` (kein `~/*`).

Code‑Anker: `tsconfig.json`, `src/pages/**`

## 5. Tooling & Style

- Muss: TypeScript strict; `noUnusedLocals`/`noUnusedParameters` enforced.
- Muss: ESLint: `no-explicit-any=error` für `src/**`; in `tests/**` bleibt es Warnung.
- Muss: Prettier: 2 spaces, single quotes, width 100, semi, Astro plugin.

Code‑Anker: `eslint.config.js`, `.prettierrc.json`, `tsconfig.json`
CI/Gates: `npm run lint`, `npm run format:check`

## 6. Infra / Build / Bindings

- Muss: Worker‑Build konsistent (Worker entry, Assets‑Serving, `.assetsignore`).
- Muss: Vollständige Bindings + Env‑Variablen pro Env in `wrangler.toml` (D1/KV/R2/AI).
- Sollte: DEV CSP kompatibel mit Middleware CSP; PROD CSP nonce‑basiert.

Code‑Anker: `astro.config.mjs`, `wrangler.toml`, `dist/_worker.js`

## 7. Rate‑Limits & Quoten

- Muss: Presets pro Use‑Case (z. B. api:30/min, aiGenerate:15/min, aiJobs:10/min, voiceTranscribe:15/min), 429 mit `Retry-After`.
- Muss: Feature‑Quoten serverseitig erzwingen; UI spiegelt nur.

Code‑Anker: `src/lib/rate-limiter.ts`, Feature‑Services

## 8. Testing & CI

- Muss: Vitest (V8 coverage ≥70%) für `src/**`; Integrationstests separat.
- Muss: Minimale Playwright‑Smokes mit Preflights; Reports in den vorgesehenen Pfaden.
- Muss: `astro check` mit projektspezifischer tsconfig‑Variante.

Code‑Anker: `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/*.yml`
CI/Gates: `npm run test`, `npm run test:e2e`, `npm run openapi:validate`, `npm run lint`, `npm run format:check`

## 9. Observability & Debug

- Sollte: Client‑Logs Endpoint aktiv, Debug Panel per Flag (`PUBLIC_ENABLE_DEBUG_PANEL`), serverseitige redacted Logs.

Code‑Anker: `src/pages/api/debug/client-log.ts`, `src/components/ui/DebugPanel.tsx`

## 10. Environments & Secrets

- Muss: Keine Secrets im Code; Nutzung über Wrangler/ENV; pro‑Env Flags und Bindings konsistent.

Code‑Anker: `.env.example`, `wrangler*.toml`

## 11. Accessibility & i18n

- Sollte: Keine DOM/ARIA/Selector‑Brüche in E2E‑kritischen UIs ohne Absprache.

Code‑Anker: Feature‑UIs, E2E Selektoren

## 12. Konflikte & Drift

- Muss: Sicherheitskritische Drifts → Code‑Fix VORSCHLAGEN (begründet), Umsetzung erst nach Freigabe.
- Sollte: Regel‑Changelog pflegen; Diff‑Audit halbjährlich.

## 13. Global‑Checkliste

- [ ] API‑Routen: Middleware aktiv? 405 via Helper? JSON‑Shapes konsistent?
- [ ] Unsafe Methods: Same‑Origin/CSRF wie dokumentiert?
- [ ] Security‑Header + CSP‑Strategie konsistent?
- [ ] `/r2-ai/**` öffentlich erreichbar?
- [ ] Zod‑Schemas + OpenAPI synchron?
- [ ] Aliase/Struktur/Paths korrekt?
- [ ] ESLint/Prettier/TS strict in `src/**` (no‑explicit‑any=error)?
- [ ] Rate‑Limits/429 mit `Retry-After`?
- [ ] CI‑Gates (openapi:validate, lint, tests, astro check) aktiv?

## 14. Referenzen

- Projekt‑Rules unter `.windsurf/rules/*` (Auth, Enhancer, Infra, Pricing, Project Structure, Prompt, Scraper, Testing & CI, Tooling & Style, Transcriptor, Zod‑OpenAPI).

## 15. Changelog

- 2025‑10‑31: Erstfassung der globalen Baseline für Security/Infra/Tooling.
