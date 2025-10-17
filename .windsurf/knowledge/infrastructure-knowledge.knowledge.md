# Infrastrukturwissen — Workers, Bindings, API Middleware

- **Titel & Geltungsbereich**
  - Cloudflare Worker/Bindings (D1, KV, R2), Wrangler‑Konfig, API‑Middleware‑Schicht (Rate‑Limits, CSRF/Origin, Security‑Header), Test‑Dev Server Bootstrap.

- **Zentrale Abhängigkeiten & Grenzen**
  - **Wrangler** `wrangler.toml`
    - Entry: `main = "dist/_worker.js/index.js"`, `assets.directory = ./dist` mit `run_worker_first` für `/api/*` und `/r2-ai/*`.
    - Bindings (Top‑Level/Envs):
      - D1: `DB` (prod/staging/testing/dev getrennt).
      - KV: `SESSION`, `KV_AI_ENHANCER`, `KV_WEBSCRAPER`, `KV_VOICE_TRANSCRIBE` (je nach Env).
      - R2: `R2_AVATARS`, `R2_LEADMAGNETS`, `R2_AI_IMAGES`, `R2_VOICE`.
      - Flags/ENV: `ENVIRONMENT`, Prompt/Voice Flags und Modelle, Pricing Tabellen/Links.
    - Routes: `env.production.routes` für Domains; `env.testing/staging` ebenfalls konfiguriert.
  - **API‑Middleware** `src/lib/api-middleware.ts`
    - `withApiMiddleware()` integriert Rate‑Limiter (`apiRateLimiter`), CSRF/Origin‑Validierung (unsichere Methoden), Security‑Header (`applySecurityHeaders()`), Logging, und einheitliche Fehlermodelle (`createApiError`/`createApiSuccess`).
    - `withAuthApiMiddleware()` erweitert um Auth‑Pflicht (401 + SecurityLog bei Fehlschlag).
    - `withRedirectMiddleware()` für Redirect‑Flows (z. B. OAuth/Magic‑Link Start/Callback) mit gleichen Schutzmechanismen.
    - CSRF/Origin‑Allowlist bezieht `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN` aus `context.locals.runtime.env`.
  - **Rate Limits** `src/lib/rate-limiter.ts`
    - Presets: `standardApiLimiter` (50/min), `authLimiter` (10/min), `sensitiveActionLimiter` (5/h), `apiRateLimiter` (30/min, DEV=1000), `aiJobsLimiter` (10/min), `aiGenerateLimiter` (15/min), `voiceTranscribeLimiter` (15/min).
  - **Dev/Tests Bootstrap** `tests/integration/setup/global-setup.ts`
    - Baut Worker dev (`build:worker:dev`), killt Port 8787, startet `wrangler dev` mit `wrangler.ci.toml`, setzt `VOICE_DEV_ECHO=1`, probt Health über API.

- **Cross‑Domain‑Beziehungen**
  - Services hängen von konsistenten Bindings ab (KV/R2/D1). API‑Routen konsumieren Middleware und Rate‑Limiter; Middleware ergänzt Security‑Header zusätzlich zu globaler Seiten‑Middleware.

- **Bekannte Risiken/Code‑Smells**
  - **Assets/Proxy Reihenfolge**: `assets.run_worker_first` enthält `/r2-ai/*`, aber eine entsprechende Route wurde nicht gefunden → potenziell toter Eintrag oder fehlende Implementierung.
  - **CSRF‑Konfiguration**: Origin‑Allowlist aus ENV; Fehleinstellungen können legitime POSTs blockieren. Tests setzen `Origin` Header (Playwright/Vitest Setup), was korrekt ist.
  - **In‑Memory Rate Stores**: `rate-limiter.ts` nutzt In‑Memory‑Maps; bei mehreren Worker‑Instanzen (Prod) nicht shared. Für Prod ggf. Durable Object/KV/Redis verwenden.

- **Empfohlene Best Practices**
  - **R2‑Proxy implementieren/prüfen**: Sicherstellen, dass `/r2-ai/*` stateless, öffentlich und mit korrekten Cache/Content‑Type‑Headern dient; Pfadvalidierung, keine Directory Traversal.
  - **Allowlist pflegen**: In Deploy‑Envs `ALLOWED_ORIGINS`/`APP_ORIGIN` setzen; E2E bewahrt `Origin` Header bereits.
  - **Rate Limit persistieren**: Für kritische APIs (Auth/Billing) eine verteilte Rate‑Limit‑Lösung evaluieren.
