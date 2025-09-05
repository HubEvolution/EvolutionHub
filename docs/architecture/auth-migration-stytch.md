# Auth-Migration: Stytch Magic Link + Social (Workers)

Status: Phase 1 (Root-Workspace-Aliases) abgeschlossen am 2025-09-04T00:33:20+02:00

## Ziel & Rahmen

- Ersetze bestehende E-Mail/Passwort-Auth (Resend) durch Stytch Magic Link + Social (Google, GitHub, Apple, Microsoft) unter Cloudflare Workers.
- Front-End bleibt, nur minimale UI-Erweiterungen (Magic-Link-Button, Social-Buttons).
- Domains: <https://hub-evolution.com> (prod), <https://staging.hub-evolution.com> (staging), <https://test.hub-evolution.com> (test), <http://localhost:8787> (dev).
- Feature-Flag: `AUTH_PROVIDER=legacy|stytch` für Rollout/Rollback.
- Keine Secrets im Repo; Nutzung `wrangler secret put`.

## Architektur-Überblick

- Middleware/Guards in `src/middleware.ts` prüfen Session vor `'/dashboard'` und `'/api/*'`.
- Neue Auth-Endpunkte (Workers):
  - POST `/auth/magic/request`
  - GET  `/auth/callback`
  - POST `/auth/logout`
  - GET  `/auth/oauth/:provider/start`
  - GET  `/auth/oauth/:provider/callback`
- Legacy-Routen bei `AUTH_PROVIDER=stytch`: 410 Gone
  - Aktuell deprecatet (410): `src/pages/api/auth/register.ts`, `src/pages/api/auth/forgot-password.ts`, `src/pages/api/auth/logout.ts`, `src/pages/api/auth/verify-email.ts`, `src/pages/api/auth/change-password.ts`, `src/pages/api/auth/reset-password.ts` (Stand Codebasis).
  - `src/pages/api/auth/login.ts` ist AKTIV und refaktoriert (Middleware + Service-Layer) und gibt KEIN 410 zurück.
- Session-Cookie (aktuell): `session_id` (HttpOnly, SameSite=Lax, Path=/, Secure nur bei HTTPS). Zielzustand: `__Host-session` mit SameSite=Strict.

## Environments & Domains

- Envs: production, staging, testing, development (lokal via Wrangler).
- Jeder Env besitzt eigene Secrets/Bindings.
- Redirect-URIs in Stytch whitelisten (alle 4 Domains). Option: Ein Stytch-Projekt mit Multi-Redirects vs. getrennte Projekte pro Env (siehe Entscheidung unten).

## Feature-Flag

- `AUTH_PROVIDER` in Workers (KV/Env) steuert aktiven Provider.
- `legacy` = aktuelle Flows aktiv; `stytch` = neue Endpunkte aktiv, Legacy 410.
- Guarding in `src/middleware.ts` und in einzelnen Routen.

## Aktueller Status: Login-Endpoint (Legacy E-Mail/Passwort)

- Implementierung: `src/pages/api/auth/login.ts` nutzt `withRedirectMiddleware` (Rate-Limit, CSRF/Origin, Security-Headers) und Service-Layer (`AuthServiceImpl`).
- Locale-Erkennung: `detectLocale()` fällt konservativ auf `'en'` zurück, wenn keine Locale ableitbar ist (Referer/Path). Redirects sind daher standardmäßig `/en/...`.
- Fehlerverhalten: Validierungs- und Auth-Fehler werden zentral via `handleAuthError()` in sichere Redirects auf die locale-bewusste Login-Seite übersetzt (z. B. `/en/login?error=InvalidInput` oder `InvalidCredentials`).
- Rate-Limiting: 429 wird in einen sicheren Redirect gemappt (`?error=TooManyRequests`).
- Nicht-POST-Methoden: 405 mit `Allow: POST`.

## Endpunkte & Flows

### Magic Link

1) POST `/auth/magic/request`
   - Body: `{ email, r? }`
   - Checks: Rate-Limit (IP+email), optional Turnstile, Redirect-Whitelist (`r`), CORS eigene Domains.
   - Aktion: Stytch Magic Link anfordern; Transaktions-ID loggen (ohne PII).
2) GET `/auth/callback`
   - Query: `token=...`, optional `state`
   - Aktion: Token mit Stytch validieren, Session erzeugen, Cookie setzen, Redirect auf erlaubtes Ziel.

### Logout

- POST `/auth/logout`: Session invalidieren (Server) + Cookie löschen, Redirect auf Startseite/Login.

### Social OAuth

- GET `/auth/oauth/:provider/start` → Redirect zu Provider (Google/GitHub/Apple/Microsoft)
- GET `/auth/oauth/:provider/callback` → Code-Exchange bei Stytch, Session erzeugen, Redirect.
- Account-Linking: Mindeststrategie E-Mail-Abgleich; optional expliziter Linking-Flow.

## Sicherheit

- Rate-Limits für `/auth/magic/request` (kombiniert IP + email).
- Turnstile: optional nur in Prod erzwingen (Konfig-Flag).
- Redirect-Whitelist für `r`, nur gleiche Origin/erlaubte Pfade.
- CORS: nur eigene Origins (prod/staging/test/dev).
- CSP: Prüfen, dass OAuth-Redirects/Popups nicht blockiert werden; Nonce bleibt aktiv.
- Logging: Keine PII (E-Mail nur gehashed oder redacted). Tokens niemals loggen.
- Vermeidung von GET-Credential-Leaks: Auth nur per POST/Redirect, nie Query mit Passwörtern.

## Cookies & Lokal-Entwicklung

- `__Host-session`: Secure + Path=/ + HttpOnly + SameSite=Strict.
- Lokal:
  - Empfehlung: HTTPS für Dev; alternativ nur in Dev Secure-Flag entfernen (konfigurierbar) und klar dokumentieren.
- Subdomains: getrennte Sessions sind gewollt; kein Domain-Attribut setzen (Host-only Cookie).
- Hinweis (Ist-Zustand): Der Legacy-Login setzt aktuell `session_id` (HttpOnly, SameSite=Lax, Path=/, Secure wenn HTTPS) in `login.ts`. Die Umstellung auf `__Host-session` (Strict) ist geplant und sollte mit der Stytch-Migration erfolgen.

## Multi-Domain Entscheidung

- Option A: 1 Stytch-Projekt, alle Redirect-URIs whitelisten (einfacher Betrieb).
- Option B: Getrennte Projekte pro Env (strikte Isolation, aufwendiger Betrieb).
- Entscheidung: TBA nach Risikoabwägung (Apple Sign in Anforderungen, erlaubte Redirect-Limits, Auditbarkeit).

## Workers Envs & Secrets

Benötigte Variablen:

- `AUTH_PROVIDER` (legacy|stytch)
- `AUTH_REDIRECT` (Default-Redirect nach Login, per Env)
- `STYTCH_PROJECT_ID`, `STYTCH_SECRET`

Beispiel-Befehle (keine Werte im Repo):

```sh
# Production
wrangler secret put AUTH_PROVIDER --env production
wrangler secret put AUTH_REDIRECT --env production
wrangler secret put STYTCH_PROJECT_ID --env production
wrangler secret put STYTCH_SECRET --env production

# Staging
wrangler secret put AUTH_PROVIDER --env staging
wrangler secret put AUTH_REDIRECT --env staging
wrangler secret put STYTCH_PROJECT_ID --env staging
wrangler secret put STYTCH_SECRET --env staging

# Testing (ci.hub-evolution.com optional)
wrangler secret put AUTH_PROVIDER --env testing
wrangler secret put AUTH_REDIRECT --env testing
wrangler secret put STYTCH_PROJECT_ID --env testing
wrangler secret put STYTCH_SECRET --env testing

# Development (lokal Wrangler dev nutzt preview secrets)
wrangler secret put AUTH_PROVIDER --env development
wrangler secret put AUTH_REDIRECT --env development
wrangler secret put STYTCH_PROJECT_ID --env development
wrangler secret put STYTCH_SECRET --env development
```

## Frontend-Anpassungen (minimal)

- Login-Form: E-Mail-Feld bleibt; Buttons: „Mit Magic Link fortfahren“, „Weiter mit Google/GitHub/Apple/Microsoft“.
- Passwort-Felder bei `AUTH_PROVIDER=stytch` ausblenden.
- UI-Zustände: „Link gesendet“, „ungültig/abgelaufen“, „erneut senden“.
- Redirect-Parameter `r` clientseitig validieren; Server hat Vorrang.

## Guards & Legacy-Abschaltung

- `src/middleware.ts`: Session-Gate vor `/dashboard` und `/api/*`.
- Legacy-Endpoints bei Flag `stytch`: 410 Gone (login/register/password/*). Reset-Password bleibt technisch vorhanden, aber durch Flag deaktiviert.

## Tests (QA & E2E)

- Magic-Link auf allen 4 Domains, inkl. Fehler (abgelaufen/ungültig, fehlendes Cookie).
- Social-Logins (Google/GitHub/Apple/Microsoft) und Account-Linking (gleiche E-Mail).
- Guards für `/dashboard` und `/api/*` enforced.
- Flag-Wechsel stytch ↔ legacy.
- CI: Tests gegen Staging/Testing-Domain (TEST_BASE_URL) gemäß bestehender Teststrategie.
- Legacy-Login (E-Mail/Passwort): Integrationstests erwarten bei Fehlern sichere 302-Redirects zur Login-Seite (standardmäßig `/en/login?...`). Wichtig: `TEST_BASE_URL` muss auf den korrekten, frisch gebauten Worker zeigen; bei falscher URL können 410-Responses von deprecateten Endpunkten auftreten.

### Troubleshooting: 410 Gone bei Login-Tests

- Prüfen, ob `TEST_BASE_URL` gesetzt ist und auf den korrekten Dev/Staging-Worker zeigt. Bei leerer Variable startet die Suite automatisch Wrangler Dev unter `http://127.0.0.1:8787`.
- Wenn bei `POST /api/auth/login` 410 HTML/JSON erscheint, wird wahrscheinlich ein deprecated Endpoint getroffen (Proxy/Fallback/Caching). Gegencheck: `curl -i -X POST http://127.0.0.1:8787/api/auth/login -H 'Origin: http://127.0.0.1:8787' -H 'Content-Type: application/x-www-form-urlencoded' --data 'email=invalid&password=123456'` sollte `302 Found` mit `Location: /en/login?...` liefern.
- Logging prüfen (`loggerFactory.createSecurityLogger()` Events): aktive Login-Route protokolliert `AUTH_FAILURE`/`API_ERROR` und endet mit `302 Found`.

## Migration & Rollback

- Migration: Secrets setzen, `AUTH_PROVIDER=stytch`, Legacy 410 aktivieren, Monitoring.
- Rollback: `AUTH_PROVIDER=legacy`, Legacy-Routen wieder freigeben.
- README mit klaren Schritten und Troubleshooting ergänzen.

## Risiken & Gegenmaßnahmen

- Apple Sign in: benötigt Services ID, Key, Team ID, Domain Association. Längerer Vorlauf einplanen.
- `__Host-session`: erfordert Secure+Path=/. Lokalstrategie festlegen (HTTPS dev bevorzugt).
- Redirect/CSP: OAuth-Flows gegen CSP testen, Nonce/Headers korrekt setzen.
- CORS: Nur eigene Domains erlauben; keine Wildcards.
- PII/Logs: strikte Redaction; Tokens nie loggen.

## Offene Fragen

- 1 Projekt vs. mehrere Stytch-Projekte pro Env?
- Dev-HTTPS vs. Secure-Flag-Fallback?
- Account-Linking-Strategie (automatisch per E-Mail vs. expliziter Flow)?

## Protokoll

- 2025-09-03 18:42 +02:00 — Initiales Konzeptdokument erstellt, ToDo-Liste und Memory angelegt.
- 2025-09-03 22:21 +02:00 — Deprecated-Auth-Endpoint-Tests (410 Gone) implementiert und Suites angepasst. Neue Datei: `test-suite-v2/src/integration/auth/deprecated-auth-endpoints.test.ts`; Logout-Erwartungen in `test-suite-v2/src/integration/auth/auth-integration.test.ts` und `test-suite-v2/src/unit/utils/server-helpers.test.ts` auf 410 HTML/no-store aktualisiert. Alle Tests grün.
- 2025-09-03 22:41 +02:00 — Unit-Logger-Tests für `deprecated_endpoint_access` implementiert: `test-suite-v2/src/unit/security/deprecated-logging.test.ts`. Aliases zentral im Root konfiguriert (`vitest.config.ts`, `vitest.integration.config.ts`). Alle Unit-Tests grün.

- 2025-09-04 00:33 +02:00 — HEAD-Methoden-Tests für deprecated Endpoints (`/api/auth/logout`, `/api/auth/verify-email`) ergänzt in `test-suite-v2/src/unit/security/deprecated-logging.test.ts` (410 JSON, `Cache-Control: no-store`, Security-Logging `USER_EVENT`/`deprecated_endpoint_access`). Workspace-Phase 1 (zentrale Aliases) abgeschlossen; Suite grün.

- 2025-09-05 21:00 +02:00 — Login-Endpoint verifiziert und dokumentiert: `login.ts` nutzt Middleware+Service, liefert 302-Redirects bei Fehlern; `detectLocale()` fallback `'en'`. Dokument bereinigt (Login nicht mehr als deprecated aufgeführt), Cookie-Istzustand (`session_id`, SameSite=Lax) ergänzt und Zielzustand `__Host-session` festgehalten. Troubleshooting-Hinweise zu 410 (falsches Routing/TEST_BASE_URL) ergänzt.

## Anhang: Referenzen im Code

- Middleware: `src/middleware.ts`
- Aktive Auth-Routen:
  - `src/pages/api/auth/login.ts` (refaktoriert, `withRedirectMiddleware`, Service-Layer)
- Deprecated Auth-Routen (410 Gone):
  - `src/pages/api/auth/register.ts`
  - `src/pages/api/auth/forgot-password.ts`
  - `src/pages/api/auth/logout.ts`
  - `src/pages/api/auth/verify-email.ts`
  - `src/pages/api/auth/change-password.ts`
  - `src/pages/api/auth/reset-password.ts`
- Frontend Login-Seiten: `src/pages/login.astro`, `src/pages/de/login.astro`
- Security-Konfiguration: `src/config/logging.ts`, `src/lib/security-logger.ts` (Konsolidierung geplant)

## Legacy-Deprecation: 410 Gone, CSRF/Origin und Tests

Dieser Abschnitt dokumentiert die Abschaltung der Legacy-Auth-Endpunkte durch 410 Gone, das Sicherheitsverhalten (CSRF/Origin) und Test-/Monitoring-Punkte, bis die endgültige Entfernung erfolgt.

### Gründe für 410 (statt 404)

- 410 signalisiert „dauerhaft entfernt“ und ist semantisch korrekt für Deprecations.
- Integrationen können 410 spezifisch behandeln; 404 birgt Ambiguität (falsche URL vs. entfernt).
- Einheitliches Logging und Security-Header bleiben aktiv.

### Aktuelles Verhalten (verifiziert per Smoke Tests)

- `GET /api/auth/verify-email` → 410 Gone, `Content-Type: text/html; charset=utf-8`
  - Minimalistische HTML-Seite mit locale-aware Fallback-Link.
- `HEAD /api/auth/verify-email` → 410 Gone, JSON (`details.Allow: "GET"`), `Cache-Control: no-store`.
- `POST /api/auth/verify-email`
  - Ohne `Origin` (cross-site): 403 Forbidden (CSRF blockiert Formular-Submission).
  - Mit same-origin `Origin`: 410 Gone, JSON.
  - JSON enthält `details.Allow: "GET"`.
- `GET /api/auth/logout` → 410 Gone, `Content-Type: text/html; charset=utf-8`.
- `HEAD /api/auth/logout` → 410 Gone, JSON (`details.Allow: "GET, POST"`), `Cache-Control: no-store`.
- `POST|PUT|DELETE /api/auth/logout`
  - Mit same-origin `Origin`: 410 Gone, JSON mit `details.Allow: "GET, POST"`.
  - Ohne `Origin`: 403 Forbidden (CSRF).

JSON-Schema (einheitlich):

```json
{
  "success": false,
  "error": {
    "type": "gone",
    "message": "This endpoint has been deprecated. Please migrate to the new authentication flow.",
    "details": { "Allow": "GET" }
  }
}
```

HTML-Seite ist minimal, enthält 410-Headline und Link zur Start-/Login-Seite (locale-aware).

### Security & Logging

- CSRF/Origin-Validierung: Unsichere Methoden (POST/PUT/PATCH/DELETE) erfordern same-origin `Origin` und Double-Submit-Cookie; sonst 403.
- Helper: `src/lib/response-helpers.ts`
  - `createDeprecatedGoneHtml(context)` und `createDeprecatedGoneJson(context, message, details)` wenden Security-Headers an und loggen:
    - `SECURITY_EVENTS.USER_EVENT` mit `reason: 'deprecated_endpoint_access'`, `endpoint`, `method` und LogContext (`ipAddress`, `userAgent`).

### Monitoring & Entfernen

- Beobachtungsfenster definieren (z. B. 2–4 Wochen) und Schwellwert (z. B. 0 Treffer oder < N/Woche).
- Query/Dashboard: Treffer pro Endpoint, Methode, Origin; Alarme bei Ausreißern.
- Nach erfüllten Kriterien: Dateien entfernen, Tests anpassen, `routes.md` aktualisieren.

### Beispiel-Calls (curl)

```sh
# 1) GET verify-email → 410 HTML
curl -i http://127.0.0.1:8787/api/auth/verify-email

# 2) POST verify-email ohne Origin → 403 (CSRF)
curl -i -X POST http://127.0.0.1:8787/api/auth/verify-email -H 'Accept: application/json'

# 3) POST verify-email mit same-origin Origin → 410 JSON (Allow: GET)
curl -i -X POST http://127.0.0.1:8787/api/auth/verify-email \
  -H 'Origin: http://127.0.0.1:8787' -H 'Accept: application/json'

# 4) GET logout → 410 HTML
curl -i http://127.0.0.1:8787/api/auth/logout

# 5) PUT/DELETE logout mit same-origin Origin → 410 JSON (Allow: GET, POST)
curl -i -X PUT http://127.0.0.1:8787/api/auth/logout \
  -H 'Origin: http://127.0.0.1:8787' -H 'Accept: application/json'
curl -i -X DELETE http://127.0.0.1:8787/api/auth/logout \
  -H 'Origin: http://127.0.0.1:8787' -H 'Accept: application/json'
```

### Automatisierte Tests (Vorschlag)

- Integration (`tests/integration/deprecated-auth.test.ts`):
  - verify-email: GET 410 HTML; POST ohne Origin 403; POST mit Origin 410 JSON (`details.Allow: "GET"`).
  - logout: GET 410 HTML; POST/PUT/DELETE mit Origin 410 JSON (`details.Allow: "GET, POST"`).
- Unit/Logger (`tests/src/pages/api/auth/*-deprecated-logger.test.ts`):
  - Mock `loggerFactory.createSecurityLogger()` (vgl. `login-logger.test.ts`).
  - Assert `logSecurityEvent(SECURITY_EVENTS.USER_EVENT, { reason: 'deprecated_endpoint_access', endpoint, method }, …)`.

#### Umsetzung (2025-09-03)

- Integration umgesetzt: `test-suite-v2/src/integration/auth/deprecated-auth-endpoints.test.ts` (Status: grün)
- Bestehende Suite aktualisiert: `test-suite-v2/src/integration/auth/auth-integration.test.ts` (Logout 410 HTML/no-store)
- Unit aktualisiert: `test-suite-v2/src/unit/utils/server-helpers.test.ts` (Logout 410 HTML/no-store)
- Unit-Logger-Tests umgesetzt: `test-suite-v2/src/unit/security/deprecated-logging.test.ts` (deprecated-logging für Helpers; Status: grün)
- Erledigt: HEAD-Methoden-Tests (JSON) für beide deprecated Endpoints im Unit-Helper-Test
- Offen: Test-Suite-Konsolidierung (Option A) inkl. CI-Unifizierung

## Test-Suite Konsolidierung (Option A)

Ziel: Eine einheitliche Vitest-Workspace-Konfiguration am Repo-Root mit Projekten `unit` und `integration`, klare Ordnerstruktur und zentrale Aliases/Reports.

- Ordnerstruktur
  - `tests/unit/**` (bisherige `test-suite-v2/src/unit/**` migrieren)
  - `tests/integration/**` (bisherige `test-suite-v2/src/integration/**` migrieren)
  - `tests/e2e/**` (Playwright bleibt separat mit `playwright.config.ts`)

- Workspace/Config
  - `vitest.workspace.ts` am Root verwenden (Projekte: `unit`, `integration`), projektspezifische `test.include`/`environment` definieren.
  - Zentrale Aliases am Root (bereits umgesetzt): `@/lib/response-helpers`, `@/lib/rate-limiter`, `@/lib/security-logger`, `@/server/utils/logger(-factory)`, `@` → `src`.

- Skripte (package.json)
  - `test`: führt beide Projekte aus (Workspace)
  - `test:unit`: nur Projekt `unit`
  - `test:integration`: nur Projekt `integration`
  - `test:ci`: Workspace-Lauf mit Coverage-Gates und JSON-Report

- CI (GitHub Actions)
  - Job `unit_and_integration`: `astro check` → `vitest --workspace` (Coverage-Gates) → Reports als Artefakte.
  - Job `e2e`: Playwright gegen `TEST_BASE_URL` (Wrangler-Dev/Cloudflare). Fallback: lokalen Dev-Server nur wenn `TEST_BASE_URL` fehlt.
  - Artefakte: `reports/test-results.json`, Coverage HTML, Playwright Traces bei Fehlern.

- Migration (Phasen)
  1) Vorbereiten: Root-Workspace/aliases, transitive Importe (z. B. `src/lib/security-headers.ts`) prüfen.
  2) Verschieben: Tests nach `tests/unit` und `tests/integration`, Imports/Paths korrigieren.
  3) Clean-up: Obsolete Configs/Verzeichnisse entfernen; README/Changelog/Dokumentation aktualisieren.

  - Offene Punkte nach Migration
  - HEAD-Methoden-Tests bereits ergänzt (unit); Workspace-Integration erfolgt automatisch mit Phase‑2-Struktur.
  - Monitoring-Dashboard/Alerts für `deprecated_endpoint_access` verifizieren.

## Phase 2: Vitest Test Suite Migration (in Planung)

Stand: 2025-09-04T03:18:17+02:00

Ziel: Konsolidierung der Vitest-Suites aus `test-suite-v2/src/**` in Root-Ordner `tests/unit/**` und `tests/integration/**`, zentrale Aliases nutzen, CI und Skripte vereinheitlichen, Legacy-Setup entfernen nach Grünphase.

### Schritte (Umsetzung)

1. Vitest Unit-Konfiguration erweitern

- `vitest.config.ts` → `test.include` ergänzt: `tests/unit/**/*.{test,spec}.{ts,tsx}` (bestehendes `tests/src/**/*` bleibt für Übergang bestehen)

1. Legacy Test-Helper konsolidieren

- Neu: `tests/src/legacy/`
  - `test-suite-v2/utils/server-helpers.ts` → `tests/src/legacy/server-helpers.ts`
  - `test-suite-v2/utils/database-helpers.ts` → `tests/src/legacy/database-helpers.ts`
  - `test-suite-v2/utils/logger.ts` → `tests/src/legacy/logger.ts`
- Begründung: Test-only Utilities isoliert halten; keine Vermischung mit `src/` App-Code.

1. Legacy Unit-Tests verschieben

- Nach `tests/unit/**` umziehen:
  - `test-suite-v2/src/unit/config/**`
  - `test-suite-v2/src/unit/security/**`
  - `test-suite-v2/src/unit/utils/**`
- Importe anpassen (relativ):
  - `../../../utils/server-helpers` → `../../src/legacy/server-helpers`
  - `../../../utils/database-helpers` → `../../src/legacy/database-helpers`
  - `../../../utils/logger` → `../../src/legacy/logger`
- Aliases wie `@/lib/*` bleiben bestehen (Root-konfiguriert).

1. Integrationstest für Deprecated-Auth (410) neu anlegen (Real-Worker)

- Datei: `tests/integration/deprecated-auth-410.test.ts`
- Prüft gegen laufenden Worker (vgl. `tests/integration/verify-email.test.ts`):
  - `/api/auth/verify-email`:
    - GET → 410 HTML, `Cache-Control: no-store`
    - POST/PUT/PATCH/DELETE → 410 JSON, `Allow: GET, HEAD`, `Cache-Control: no-store`
  - `/api/auth/logout`:
    - GET/POST → 410 HTML, `Cache-Control: no-store`
    - PUT/PATCH/DELETE → 410 JSON, `Allow: GET, POST, HEAD`, `Cache-Control: no-store`
- Kein Mock-Server mehr in Integration; richtet sich nach globalem Setup (`tests/integration/setup/global-setup.ts`).

1. Skripte vereinheitlichen (package.json)

- Workspace-Läufe statt Legacy-Pfade:
  - `test`: `vitest -c vitest.workspace.ts`
  - `test:once`: `vitest run -c vitest.workspace.ts`
  - `test:unit`: `vitest -c vitest.config.ts`
  - `test:unit:run`: `vitest run -c vitest.config.ts`
  - `test:integration`: `vitest -c vitest.integration.config.ts`
  - `test:integration:run`: `vitest run -c vitest.integration.config.ts`

1. Läufe und Korrekturen

- Unit- und Integration-Suites laufen lassen; Import-/Pfadfehler beheben.
- Coverage weiter nur `src/**/*` messen; Test-Helper ausschließen.

1. CI/GitHub Actions

- `astro check` → `vitest run -c vitest.workspace.ts` (Coverage-Gates) → Artefakte hochladen (`reports/test-results.json`, Coverage HTML)
- E2E (Playwright) unverändert; gegen `TEST_BASE_URL` ausführen, sonst lokaler Dev-Fallback.

1. Cleanup

- Nach grünem Lauf und kurzer Beobachtung: `test-suite-v2/` entfernen, Referenzen bereinigen, Doku/Changelog aktualisieren.

### Konfig-Details

- `vitest.config.ts` (Unit): Include um `tests/unit/**/*.{test,spec}.{ts,tsx}` ergänzt; Aliases unverändert (`@`, `@/lib/*`, …).
- `vitest.integration.config.ts`: bleibt auf `tests/integration/**/*` mit `node`-Environment und Global-Setup.
{{ ... }}

### Risiken & Gegenmaßnahmen (Migration)

- Doppeltests/Überschneidungen: Vor Verschieben prüfen; Legacy-Integration (Mock-Server) wird nicht migriert, sondern durch Real-Worker-Test ersetzt.
- Pfad-/Aliasbrüche: Schrittweise verschieben, CI früh laufen lassen; strikte TS/ESLint-Regeln halten.
- Env-Abhängigkeiten (TEST_BASE_URL, JWT_SECRET, DATABASE_URL): in CI und lokal dokumentieren und prüfen; sensible Daten nur via Secrets.

### Rollback-Strategie

- Bei Problemen mit Migration: Tests weiter aus `test-suite-v2` laufen lassen (Workspace unterstützt parallele Projekte) bis Fix bereit.
- Keine produktiven Codeänderungen durch diese Phase; Risiko begrenzt auf Test-Infrastruktur.

### Akzeptanzkriterien

- Alle Unit- und Integrationstests grün via Workspace (`vitest run -c vitest.workspace.ts`).
- Keine Dupplikate von 410-Tests; Real-Worker-Tests decken Verhalten ab.
- CI-Pipeline grün inkl. `astro check`, Coverage-Reports erzeugt.
- Doku (dieses Dokument, README/CHANGELOG) aktualisiert; Legacy-Setup entfernt.

### Nächste Schritte

- Freigabe der Phase 2 durch Reviewer.
- Umsetzung der Schritte 1–5, danach Testläufe und CI-Anpassungen (6–7), anschließend Cleanup (8).

### Protokoll (Phase 2)

- 2025-09-04 03:18 +02:00 — Phase‑2‑Migrationsplan (Vitest Konsolidierung) dokumentiert, wartet auf Freigabe.

### Cleanup-Plan (nach Beobachtungsfenster)

- Entfernen: `src/pages/api/auth/verify-email.ts`, `src/pages/api/auth/logout.ts` (und weitere Legacy-Routen, falls 410 aktiviert).
- Zugehörige Tests löschen/anpassen, `routes.md` aktualisieren, Changelog-Eintrag.
- Monitoring abschalten oder Query anpassen.
