# Testwissen — Vitest, Playwright, E2E Bootstrap

- **Titel & Geltungsbereich**
  - Testkonfigurationen und Praktiken aus `vitest.config.ts`, `playwright.config.ts`, `test-suite-v2/**`, sowie Integrations‑Bootstrap.

- **Zentrale Abhängigkeiten & Grenzen**
  - **Vitest** `vitest.config.ts`
    - Zwei Projekte: `unit` (jsdom, `src/setupTests.ts`) und `integration` (node, global setup `tests/integration/setup/global-setup.ts`).
    - Coverage V8, globale Schwellen 70%, Include `src/**/*.{ts,tsx}`.
  - **Playwright (root)** `playwright.config.ts`
    - Testdir `tests/e2e/specs`, Reporter HTML+List, Chromium/Firefox/WebKit Projekte.
    - `use.baseURL` aus `TEST_BASE_URL`/`BASE_URL` (Fallback `http://127.0.0.1:8787`); setzt `Origin` Header für CSRF‑Checks.
    - Lokaler `webServer` startet `npm run dev:e2e` wenn Ziel nicht remote.
  - **Playwright (v2)** `test-suite-v2/playwright.config.ts`
    - Testdir `test-suite-v2/src/e2e`, Reporter HTML/JSON/JUnit, Mobile Projekte zusätzlich.
    - `webServer` startet Root‑Server via `npm --prefix .. run dev:e2e`; setzt `E2E_FAKE_STYTCH=1`/`AUTH_PROVIDER=stytch` in Env.
  - **Integration Bootstrap** `tests/integration/setup/global-setup.ts`
    - Führt `db:setup`, `build:worker:dev`, killt Port 8787, startet `wrangler dev` (CI‑wrangler config), probt Health (`/api/csp-report` 405 Allow POST), propagiert `TEST_BASE_URL`.

- **Cross‑Domain‑Beziehungen**
  - Tests achten auf CSRF/Same‑Origin, indem `Origin` Header injiziert wird (root+v2 Playwright). Dev‑Echo‑Flags für Voice (`VOICE_DEV_ECHO=1`) aktivieren deterministische Pfade.
  - E2E/Integration agieren gegen den gleichen Worker‑Entry (`dist/_worker.js/index.js`).

- **Bekannte Risiken/Code‑Smells**
  - **Flaky Ports**: Setup scannt alternative Ports (8787/8788/8790/8791). Stabil, aber Logs/Artefakte sollten tatsächliche URL referenzieren.
  - **Parallelität**: `fullyParallel: true` + globaler dev‑Server — bei gleichzeitigen Suiten vorsichtig mit Start/Stop.
  - **CI/LOCAL Divergenz**: ENV‑abhängige Flags (CSP/DEV) können Testflüsse ändern; sicherstellen, dass `ENVIRONMENT` konsistent gesetzt wird.

- **Empfohlene Best Practices**
  - **Same‑Origin gewährleisten**: Tests immer mit `Origin: baseURL` ausführen (bereits konfiguriert).
  - **Deterministische Pfade nutzen**: Für externe Provider (OpenAI/Replicate) DEV‑Echo/Mocks/feature flags setzen (bereits Voice/AI‑Image teils vorhanden).
  - **Berichte & Artefakte**: HTML‑Reports sind aktiviert (root und v2). Bei Fehleranalyse sicherstellen, dass Ports/URLs in Logs deckungsgleich sind.
