---
trigger: always_on
scope: cross_cutting
extends:
  - infra.md
  - caching-kv.md
  - observability.md
  - testing-and-ci.md
  - tooling-and-style.md
priority: medium
---

# Performance Rules

## Zweck

Verbindliche Leitplanken für Performance, Stabilität und Kostenkontrolle im EvolutionHub‑Stack (Astro + Cloudflare Worker + R2/KV/D1) – mit klaren Budgets, Caching‑Strategien und testbaren Smokes/Load‑Tests.

Diese Rule ergänzt:

- UI‑Performance (Web Vitals Smokes)
- API‑Performance unter Last (Rate‑Limit & Burst‑Tests)
- Cache‑Strategie (Edge/Browser/Private vs Public)
- Build/Assets (Worker Build, Assets Serving)

## Muss

- Budgets sind real & testbar
  - Performance‑Budgets müssen so definiert sein, dass sie **in E2E/CI messbar** sind (keine “gefühlten” Ziele).
  - Für Web‑Vitals existiert ein Smoke‑Test:
    - `tests/e2e/specs/perf.smoke.spec.ts`
  - Budgets dürfen nur mit Begründung gelockert werden (PR‑Notiz + Changelog in dieser Rule).

- Rate‑Limits sind Teil der Performance
  - Rate‑Limit Durchsetzung ist nicht nur Security, sondern Performance/Cost‑Control.
  - Unter Last muss das System **degradieren**, nicht ausfallen:
    - 429 mit `Retry-After` ist der Standard (siehe API & Security Rules).

- Caching ist explizit (kein “accidental caching”)
  - API‑Responses müssen bewusst entscheiden: `no-store` / `private` / `public` + TTL.
  - Public/Private Trennung ist strikt:
    - Inhalte mit Session/Owner‑Gating sind **nie** public cachebar.
  - R2/R2‑AI Regeln beachten:
    - `/r2-ai/**` ist öffentlich erreichbar; `uploads/*` public (Provider‑Fetch), `results/*` owner‑gegated (siehe Infra + Image Enhancer Rules).

- Worker Build / Assets Serving bleibt konsistent
  - Worker Build‑Pfad ist Source of Truth (keine Ad‑hoc Build‑Schritte):
    - `package.json` scripts: `build:worker*`
    - `astro.config.mjs` berücksichtigt Worker Target & DEV CSP
  - `.assetsignore` darf `_worker.js` ausschließen (Repo‑Pattern), Assets sollen im `dist/assets` verfügbar sein.

- PII/Secrets niemals in Performance‑Logs/Reports
  - Performance‑Reports dürfen keine Cookies/Auth Header/Emails enthalten.
  - Bei Debug/Profiling: redacted Logs gemäß [observability.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/observability.md:0:0-0:0).

## Sollte

- Web Vitals Smoke als Baseline
  - Budgets (mobile smoke) in `perf.smoke.spec.ts` sind die initiale Baseline:
    - LCP (ms), CLS, TBT (ms)
  - Routes im Smoke sollten repräsentativ bleiben (Home, Tools, Pricing, EN/DE).

- Load/Stress Tests lokal/staging
  - Repo hat eine Performance/Load Test Suite:
    - `tests/performance/run-load-tests.ts`
    - `tests/performance/load-test-config.json`
    - `tests/performance/rate-limiting-perf.test.ts`
  - Diese Tests sollten bevorzugt auf **staging** oder lokal mit kontrollierter Umgebung laufen (nicht blind auf Prod).

- Cache Rules dokumentieren und verifizieren
  - Edge Cache Rules sind dokumentiert in:
    - `docs/ops/cloudflare-cache-rules.md`
  - Änderungen an Cloudflare Rulesets sollen die “API bypass” Regeln respektieren (`/api/*` typischerweise no-cache).

- Avoid performance anti-patterns in UI
  - Kein aggressives Polling ohne Notwendigkeit; Polling muss cleanup haben.
  - Keine großen JS bundles in BaseLayout; React Islands nur wo nötig.

## Nicht

- Keine Performance‑Änderungen ohne Messung
  - Keine “optimizations” ohne vorher/nachher (mindestens: perf smoke lokal oder staging).

- Keine unbounded Load‑Tests gegen Production
  - Keine Burst/Stress Tests gegen Production ohne explizite Freigabe und Zeitfenster.

- Keine “Cache everything” Defaults
  - Kein globales Caching für `/api/**` oder Auth‑/Dashboard‑Routen.

## Checkliste

- [ ] Web‑Vitals Smoke (`tests/e2e/specs/perf.smoke.spec.ts`) ist stabil und misst Budgets.
- [ ] API‑Caching ist explizit (kein versehentliches public caching).
- [ ] Rate‑Limits degradieren sauber (429 + `Retry-After`), kein Server‑Crash unter Last.
- [ ] Load‑Tests existieren und sind parametrierbar (`tests/performance/*`).
- [ ] Keine PII/Secrets in Logs/Reports.

## Code‑Anker

- Web Vitals Smoke:
  - `tests/e2e/specs/perf.smoke.spec.ts`
- Performance/Load Suite:
  - `tests/performance/README.md`
  - `tests/performance/run-load-tests.ts`
  - `tests/performance/load-test-config.json`
  - `tests/performance/rate-limiting-perf.test.ts`
- Build/Worker:
  - `astro.config.mjs`
  - `package.json` (`build:worker*`, `dev:worker*`)
- Edge Cache Rules (Ops Doc):
  - `docs/ops/cloudflare-cache-rules.md`

## CI/Gates

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- Optional/gezielt (nicht immer CI‑blocking):
  - `tests/performance/*` (lokal/staging)

## Referenzen

- [.windsurf/rules/caching-kv.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/caching-kv.md:0:0-0:0)
- [.windsurf/rules/infra.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/infra.md:0:0-0:0)
- [.windsurf/rules/observability.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/observability.md:0:0-0:0)
- [.windsurf/rules/testing-and-ci.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/testing-and-ci.md:0:0-0:0)
- [.windsurf/rules/api-and-security.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/api-and-security.md:0:0-0:0) (429 / Retry‑After, Middleware)

## Changelog

- 2025-12-16: Erstfassung Performance (Budgets via perf smoke, Load Tests Suite, Caching/Edge/Worker Build Baselines).
