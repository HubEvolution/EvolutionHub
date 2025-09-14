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
  - POST `/api/auth/magic/request`
  - GET  `/api/auth/callback`
  - POST `/api/auth/logout`
  - GET  `/api/auth/oauth/:provider/start`
  - GET  `/api/auth/oauth/:provider/callback`
- Legacy-Routen bei `AUTH_PROVIDER=stytch`: 410 Gone
  - Aktuell deprecatet (410): `src/pages/api/auth/register.ts`, `src/pages/api/auth/forgot-password.ts`, `src/pages/api/auth/logout.ts`, `src/pages/api/auth/verify-email.ts`, `src/pages/api/auth/change-password.ts`, `src/pages/api/auth/reset-password.ts` (Stand Codebasis).
  - `src/pages/api/auth/login.ts` ist nicht mehr aktiv.
- Session-Cookie (aktuell): `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/).

## Environments & Domains

- Envs: production, staging, testing, development (lokal via Wrangler).
- Jeder Env besitzt eigene Secrets/Bindings.
- Redirect-URIs in Stytch whitelisten (alle 4 Domains). Option: Ein Stytch-Projekt mit Multi-Redirects vs. getrennte Projekte pro Env (siehe Entscheidung unten).

### Redirect-URIs pro Environment (Stytch Whitelist)

- Development: `http://127.0.0.1:8787/api/auth/callback`
- Testing: `https://test.hub-evolution.com/api/auth/callback`
- Staging: `https://staging.hub-evolution.com/api/auth/callback`
- Production: `https://hub-evolution.com/api/auth/callback`

## Feature-Flag

- `AUTH_PROVIDER` in Workers (KV/Env) steuert aktiven Provider.
- `legacy` = aktuelle Flows aktiv; `stytch` = neue Endpunkte aktiv, Legacy 410.
- Guarding in `src/middleware.ts` und in einzelnen Routen.

## Legacy Passwort-Login – entfernt

Der frühere E‑Mail/Passwort‑Login wurde vollständig entfernt und durch Stytch Magic Link ersetzt. Sämtliche Legacy‑Endpunkte liefern 410 Gone und sind in den Routen entsprechend dokumentiert.

- Nicht-POST-Methoden: 405 mit `Allow: POST`.

## Endpunkte & Flows

### Magic Link

1) POST `/api/auth/magic/request`
   - Body: `{ email, r?, name?, username? }`
   - Checks: Rate-Limit (IP+email), optional Turnstile, Redirect-Whitelist (`r`), CORS eigene Domains.
   - Aktion: Stytch Magic Link anfordern; Transaktions-ID loggen (ohne PII).
   - Optionales Profil (nur bei Registrierung genutzt): `name` (2–50), `username` (3–30, `/^[a-zA-Z0-9_]+$/`). Bei gültigen Werten wird ein kurzlebiges HttpOnly-Cookie `post_auth_profile` gesetzt (10 Min, SameSite=Lax), das im Callback ausgewertet wird.
2) GET `/api/auth/callback`
   - Query: `token=...`, optional `state`
   - Aktion: Token mit Stytch validieren, Session erzeugen, Cookie setzen, Redirect auf erlaubtes Ziel (direkt).
   - Optionales Profil-Cookie: `post_auth_profile` (falls vorhanden) wird beim Erstanlegen des Users ausgewertet; `name`/`username` werden gesetzt (Username‑Kollision → Suffix). Cookie wird danach gelöscht. `post_auth_redirect` hat Vorrang vor Query‑`r`.
   - Hinweis: Der frühere Zwischenschritt `/auth/notify` (BroadcastChannel) wurde entfernt; Cross‑Tab‑Weiterleitung wird nicht mehr benötigt.

### Logout

- POST `/api/auth/logout`: Session invalidieren (Server) + Cookie löschen, Redirect auf Startseite/Login.

### Social OAuth

- GET `/api/auth/oauth/:provider/start` → Redirect zu Provider (Google/GitHub/Apple/Microsoft)
- GET `/api/auth/oauth/:provider/callback` → Code-Exchange bei Stytch, Session erzeugen, Redirect.
- Account-Linking: Mindeststrategie E-Mail-Abgleich; optional expliziter Linking-Flow.

## Sicherheit

- Rate-Limits für `/api/auth/magic/request` (kombiniert IP + email).
- Turnstile: optional nur in Prod erzwingen (Konfig-Flag).
- CSRF/Origin-Checks: Unsichere Methoden (POST/PUT/PATCH/DELETE) werden über die bestehende `withRedirectMiddleware` und Middleware-Prüfungen durchgesetzt (same-origin `Origin`, Double-Submit-CSRF, Security-Headers). Nachhaltig, da bereits projektweit etabliert.
- Redirect-Whitelist für `r` und Fehler-UX: PENDING DECISION (Diskussion erforderlich; Default-Verhalten wird nach Freigabe festgehalten).
- CORS: nur eigene Origins (prod/staging/test/dev).
- CSP: Prüfen, dass OAuth-Redirects/Popups nicht blockiert werden; Nonce bleibt aktiv.
- Logging: Keine PII (E-Mail nur gehashed oder redacted). Tokens niemals loggen.
- Vermeidung von GET-Credential-Leaks: Auth nur per POST/Redirect, nie Query mit Passwörtern.

## Cookies & Lokal-Entwicklung

- `__Host-session`: Secure + Path=/ + HttpOnly + SameSite=Strict (aktiver Zustand).
- Lokal:
  - Empfehlung: HTTPS für Dev; alternativ nur in Dev Secure-Flag entfernen (konfigurierbar) und klar dokumentieren.
- Subdomains: getrennte Sessions sind gewollt; kein Domain-Attribut setzen (Host-only Cookie).

## Multi-Domain Entscheidung

- Option A: 1 Stytch-Projekt, alle Redirect-URIs whitelisten (einfacher Betrieb).
- Option B: Getrennte Projekte pro Env (strikte Isolation, aufwendiger Betrieb).
- Entscheidung (Empfehlung): Start mit Option A für zügigen Rollout und geringeren operativen Aufwand. Wechsel zu Option B, falls Compliance-/Audit-Anforderungen (z. B. streng getrennte Logs/Keys) oder Provider-spezifische Limits dies erfordern (insbesondere Apple Sign in Anforderungen, Redirect-Limits, Auditierbarkeit).

Begründung:

- Option A Vorteile: geringere Komplexität, schnelleres Setup, weniger DevOps-Overhead; in Stytch lassen sich mehrere Redirect-URIs je Env whitelisten.
- Option A Risiken: geteilte Projekt-Metriken/Logs, potentiell komplexere Alert-Routing; organisatorische Trennung nur logisch (per Umgebungsvariablen) und nicht physisch.
- Option B Vorteile: harte Isolation pro Env (Secrets, Logs, Audits), klares Blast-Radius-Management.
- Option B Risiken: höherer Betriebsaufwand (mehr Projekte pflegen), duplizierte Konfiguration (Provider, Redirects, Webhooks), höhere Fehleranfälligkeit bei Rollouts.

## Workers Envs & Secrets

Benötigte Variablen:

- `AUTH_PROVIDER` (legacy|stytch)
- `AUTH_REDIRECT` (Default-Redirect nach Login, per Env)
- `STYTCH_PROJECT_ID`, `STYTCH_SECRET`
- `E2E_FAKE_STYTCH` (optional: nur Dev/CI; setzt Fake‑Modus für Stytch in E2E‑Tests, Werte: `"1"|"true"` aktiv)
- `STYTCH_TEST_EMAIL` (optional: bekannte, aktive Test‑E‑Mail für Live‑Provider‑Smoke; nur setzen, wenn echte Stytch‑Calls gewünscht sind)

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

### Stytch Dashboard: Secrets & Redirect-URIs – kurze Schritte

- Öffne das Stytch Dashboard und wähle die TEST-Umgebung.
- Navigiere zu Project Overview → API Keys, kopiere `project_id` und `secret`.
- Navigiere zu Redirect URLs und trage pro Flow deine Standard-Redirects ein:
  - Login Redirect: `https://<env-domain>/api/auth/callback`
  - Sign-up Redirect: `https://<env-domain>/api/auth/callback`
  - Hinweise und Details: [Redirect URLs](https://stytch.com/docs/guides/dashboard/redirect-urls)
- Alternativ/ergänzend kannst du Redirects pro Request setzen (siehe API-Doku):
  - Send by email: [API reference](https://stytch.com/docs/api/send-by-email)
  - Authenticate magic link: [API reference](https://stytch.com/docs/api/authenticate-magic-link)
- Für lokale Tests verwende TEST-Umgebung (Host: `https://test.stytch.com`).
- Lege die Werte in Wrangler als Secrets an (`STYTCH_PROJECT_ID`, `STYTCH_SECRET`) – siehe Befehle oben.

### Production Quick Checklist (Live)

- Secrets (Wrangler, Environment: `production`):
  - `STYTCH_PROJECT_ID` (beginnt mit `project-live-…`)
  - `STYTCH_SECRET`
  - `AUTH_PROVIDER=stytch`
  - optional `AUTH_REDIRECT=/dashboard`
- Stytch Dashboard (Live‑Projekt):
  - Redirect URLs (Login + Signup):
    - `https://hub-evolution.com/api/auth/callback`
    - optional zusätzlich: `https://www.hub-evolution.com/api/auth/callback`
- Routes/Deploy:
  - Nur `env.production.routes` in `wrangler.toml` verwenden; deploy mit `wrangler deploy --env production`.
- Curl‑Tests in Prod: Für `POST` immer `Origin: https://hub-evolution.com` setzen (same‑origin CSRF‑Check).
- D1 Schema (Prod): Spalte `users.plan TEXT NOT NULL DEFAULT 'free'` muss existieren.
  - Falls fehlend: Migration anwenden `migrations/0013_add_user_plan_column.sql`.

#### Hinweis zu „Management Key“ / Automatisierung

- Die Redirect-URL-Whitelist und verwandte Projekt-Settings werden bei Stytch üblicherweise im Dashboard gepflegt.
- Es gibt derzeit keine offiziell dokumentierte Admin-API, um die Redirect-URL-Liste projektweit zu verwalten; der Node-Client ist für Server-Laufzeiten (Node) gedacht und in Cloudflare Workers nicht nutzbar.
- Ein „Management Key“ allein genügt nicht, um diese Einstellungen automatisiert über unsere Edge-Laufzeit zu setzen.
- Vorgehen: Setze die Redirect-URIs im Dashboard (TEST → später LIVE) und hinterlege die API-Credentials als Wrangler-Secrets. Optional kann die Stytch CLI genutzt werden (nicht Teil unseres Rollouts), siehe [Stytch CLI Blogpost](https://stytch.com/blog/stytch-cli-connected-apps/).

## Edge/Workers-Implementierung mit Fetch

- Cloudflare Workers laufen nicht in einer Node.js-Laufzeit. Der offizielle `stytch` Node-Client nutzt `undici` (Node-Fetch) und ist daher für Workers nicht geeignet.
- Empfehlung: direkten REST-Aufruf via `fetch` im Worker verwenden. Baue eine kleine, typisierte Wrapper-Schicht für genau die benötigten Endpunkte.
- Vorteile: volle Kompatibilität mit Workers, kleiner Surface Area, keine Node-Polyfills nötig.

Implementierungs-Hinweise:

- Authentifizierung: HTTP Basic Auth mit `STYTCH_PROJECT_ID:STYTCH_SECRET` als `Authorization: Basic <base64>`.
- Base-URLs:
  - Test: `https://test.stytch.com/v1/...`
  - Live: `https://api.stytch.com/v1/...`
- Endpunkte (Auswahl):
  - Magic Link anfordern: `POST /v1/magic_links/email/login_or_create`
  - Magic Link authenticate: `POST /v1/magic_links/authenticate`
  - OAuth Start/Callback: Stytch OAuth-Endpoints gemäß Provider-Guides (Code-Exchange über Stytch)

Sicherheit & Logging:

- Keine PII loggen (E-Mails redacted/gehashed), Tokens niemals loggen.
- CORS nur eigene Origins zulassen, Redirect-Whitelist strikt halten.
- Turnstile in Prod optional erzwingen.

Stytch CLI / API:

- Es existiert eine Stytch CLI (Connected Apps Beispiel). Für Konfiguration/Operation ist primär das Stytch Dashboard und die REST API vorgesehen; die CLI ist nicht erforderlich für die Migration.

## Frontend-Anpassungen (minimal)

- Login: E‑Mail‑basiertes Magic‑Link‑Formular (nur E‑Mail). Optionales Profil (Name/Username) wird hier nicht abgefragt.
- Register: Magic‑Link‑Formular mit E‑Mail und optionalen Profilfeldern (Name, Username). Übergabe erfolgt serverseitig via `post_auth_profile`.
- „Forgot password?“: Link wird in Stytch‑Modus ausgeblendet (Legacy‑Formular hidden bei `AUTH_PROVIDER=stytch`).
- Social/OAuth‑Buttons: standardmäßig verborgen; Anzeige erst, wenn Feature‑Flag/Backends aktiviert sind.
- UI‑Zustände: „Link gesendet“, „ungültig/abgelaufen“, „erneut senden“.
- Redirect‑Parameter `r` clientseitig validieren; Server (Cookie `post_auth_redirect`) hat Vorrang. (Policy siehe Sicherheit)
- Magic‑Link Cooldown & i18n: Der Submit‑Button ist nach Absenden 60s wirklich deaktiviert (`disabled`, `aria-disabled`, `pointer-events: none`, visuelles Feedback). Countdown‑Text ist i18n‑fähig über `pages.auth.magic.cooldown` (z. B. „Resend in {s}s“ / „Erneut senden in {s}s“).
- Cross‑Tab‑Listener entfällt: Der Callback leitet direkt zum Ziel weiter; ein BroadcastChannel‑Listener auf den Login‑Seiten ist nicht mehr erforderlich.
- Passwort‑Login entfernt: Die Login‑Seiten zeigen ausschließlich das Magic‑Link‑Formular (nur E‑Mail). Der frühere E‑Mail/Passwort‑Flow ist vollständig entfernt.
- Settings UI: Passwort‑Abschnitt aktuell verborgen (Flow deaktiviert); E‑Mail wird read‑only angezeigt mit lokalisiertem Hinweis und deaktivierter „Change Email“‑CTA (geplante Re‑Verifizierung via Stytch folgt).

## Guards & Legacy-Abschaltung

- `src/middleware.ts`: Session-Gate vor `/dashboard` und `/api/*`.
- Legacy-Endpoints: 410 Gone (inkl. `/api/auth/login`, `register`, `forgot-password`, `reset-password`, `logout`, `verify-email`, `change-password`).
{{ ... }}

## Tests (QA & E2E)

- Magic-Link auf allen 4 Domains, inkl. Fehler (abgelaufen/ungültig, fehlendes Cookie).
- Social-Logins (Google/GitHub/Apple/Microsoft) und Account-Linking (gleiche E-Mail).
- Guards für `/dashboard` und `/api/*` enforced.
- Flag-Wechsel stytch ↔ legacy.
- CI: Tests gegen Staging/Testing-Domain (TEST_BASE_URL) gemäß bestehender Teststrategie.
- Legacy-Login (E-Mail/Passwort) entfernt: Tests wurden aktualisiert/entfernt. Fokus der E2E liegt auf direktem Callback‑Redirect und Session‑Cookie‑Setzung.
- Callback‑Redirect‑E2E: Klicke den Magic‑Link und erwarte einen direkten Redirect vom Callback auf das Ziel (ggf. lokalisiert). Kein `/auth/notify`‑Zwischenschritt mehr.

### E2E Fake‑Modus (Stytch)

- Zweck: E2E‑Tests deterministisch halten und externe Provider‑Flakiness (z. B. `inactive_email`, Rate‑Limits, Redirect‑Whitelist) vermeiden.
- Flag: `E2E_FAKE_STYTCH=1` aktiviert einen Fake‑Modus in `src/lib/stytch.ts`.
  - Betroffene Funktionen: `stytchMagicLinkLoginOrCreate()` und `stytchMagicLinkAuthenticate()` liefern deterministische 200‑Stub‑Antworten (verifizierte E‑Mail), keine externen HTTP‑Calls.
  - Geltungsbereich: Nur Dev/CI. In `testing/staging/production` NICHT setzen.
- Playwright‑E2E:
  - Bevorzugt env‑E‑Mail: `STYTCH_TEST_EMAIL` (falls realer Provider‑Smoke gewünscht ist).
  - Robustheit: Request per `page.request.post` (absolute URL, `Origin`‑Header), Retry auf 429, Cookie‑Assertion via `Set‑Cookie` inkl. `decodeURIComponent`.
  - Provider‑Fehler in Live‑Runs (z. B. `no_match_for_provided_magic_link_url`, `invalid_email`, `inactive_email`) führen zu „early return“ statt Fail, damit E2E nicht an externem Zustand scheitert.
  - Datei: `test-suite-v2/src/e2e/auth/magic-link-flow.spec.ts`.

Empfehlung:

- Dev/CI: `E2E_FAKE_STYTCH=1` verwenden (deterministische E2E).
- Testing (ci.hub-evolution.com): Fake‑Modus AUS lassen; optional `STYTCH_TEST_EMAIL` setzen für stabile Live‑Smoke.

### Troubleshooting: 410 Gone bei Login-Tests

- Prüfen, ob `TEST_BASE_URL` gesetzt ist und auf den korrekten Dev/Staging-Worker zeigt. Bei leerer Variable startet die Suite automatisch Wrangler Dev unter `http://127.0.0.1:8787`.
- Wenn bei `POST /api/auth/login` 410 HTML/JSON erscheint, wird wahrscheinlich ein deprecated Endpoint getroffen (Proxy/Fallback/Caching). Gegencheck: `curl -i -X POST http://127.0.0.1:8787/api/auth/login -H 'Origin: http://127.0.0.1:8787' -H 'Content-Type: application/x-www-form-urlencoded' --data 'email=invalid&password=123456'` sollte `302 Found` mit `Location: /en/login?...` liefern.
- Logging prüfen (`loggerFactory.createSecurityLogger()` Events): aktive Login-Route protokolliert `AUTH_FAILURE`/`API_ERROR` und endet mit `302 Found`.

### Troubleshooting: Stytch & Prod Setup (Live)

- 400 `no_login_redirect_urls_set`/`no_signup_redirect_urls_set`:
  - In Stytch (Live) die Redirect‑URL(s) hinterlegen: `https://hub-evolution.com/api/auth/callback` (Login + Signup; ggf. zusätzlich www‑Variante).
- 403 `Missing Origin/Referer header` bei `POST /api/auth/magic/request`:
  - Curl sendet keinen Origin – Header ergänzen: `-H 'Origin: https://hub-evolution.com'`.
- 500/D1 `no such column: plan` im Middleware‑Log (nach Callback → Redirect auf /login):
  - In Prod D1 fehlt `users.plan`. Migration ausführen: `wrangler d1 execute evolution-hub-main --env production --remote --file=./migrations/0013_add_user_plan_column.sql`.
  - Danach erneut `PRAGMA table_info(users);` prüfen – `plan` muss vorhanden sein.

## Migration & Rollback

- Migration: Secrets setzen, `AUTH_PROVIDER=stytch`, Legacy 410 aktivieren, Monitoring.
- Rollback: `AUTH_PROVIDER=legacy`, Legacy-Routen wieder freigeben.
- README mit klaren Schritten und Troubleshooting ergänzen.

## Checkliste: Stytch Migration (umsetzungsorientiert)

- [ ] Edge-kompatiblen Stytch-Fetch-Wrapper erstellen (nur benötigte Endpunkte, strikt typisiert)
- [ ] POST `/api/auth/magic/request`: Rate-Limit, optional Turnstile, CSRF/Origin via Middleware, Redirect-Whitelist (Policy pending), Stytch-Call, generische 200/202-Response
- [ ] GET `/api/auth/callback`: Token validieren (Stytch), Session erzeugen, `__Host-session` setzen, Redirect auf whitelisted Ziel (Policy pending)
- [ ] GET `/api/auth/oauth/:provider/start`: Redirect zum Provider (Stytch init)
- [ ] GET `/api/auth/oauth/:provider/callback`: Code-Exchange (Stytch), Session erzeugen, Redirect
- [ ] POST `/api/auth/logout`: Session-Invalidierung serverseitig, Cookie löschen, Redirect
- [ ] Session-Layer anpassen: `__Host-session` (Secure, HttpOnly, SameSite=Strict, Path=/); Dev-Strategie dokumentieren
- [ ] Frontend-Login: Magic-Link- und Social-Buttons, Passwortfelder bei `AUTH_PROVIDER=stytch` ausblenden
- [ ] CSP/CORS prüfen und anpassen (OAuth/Popups, Nonce bleibt aktiv)
- [ ] Logging/Monitoring: Events für neue Flows, Alerts für Fehlerfälle
- [ ] Tests: Integration (alle Domains, Magic/OAuth inkl. Fehler), Guards (`/dashboard`, `/api/*`), Flag-Wechsel
- [ ] CI: `astro check` + `vitest --workspace`; Playwright gegen `TEST_BASE_URL`; Secrets in CI setzen
- [ ] Cleanup nach Beobachtungsfenster: Legacy-Dateien entfernen, Doku/Changelog aktualisieren
- [ ] ENV/Secrets in allen Envs setzen: `AUTH_PROVIDER`, `AUTH_REDIRECT`, `STYTCH_PROJECT_ID`, `STYTCH_SECRET` (Wrangler)
- [ ] Redirect-URIs in Stytch pro Env whitelisten (prod/staging/testing/dev)
- [ ] Feature-Flag-Auswertung implementieren (z. B. in `src/middleware.ts` und Auth-Routen)

## Arbeitsboard (laufender Status)

- [x] Edge-kompatibler Stytch-Fetch-Wrapper (Workers/Fetch) — erledigt
  - Datei: `src/lib/stytch.ts`
- [ ] MVP Magic-Link Endpoints — in Arbeit (Server fertig, Tests teilweise inkl. Dev‑Happy‑Path)
  - POST `'/api/auth/magic/request'` → `src/pages/api/auth/magic/request.ts`
  - GET  `'/api/auth/callback'` → `src/pages/api/auth/callback.ts`
- [ ] UI-Update — in Arbeit
  - Login-Seiten um Magic-Link-Formular ergänzt: `src/pages/login.astro`, `src/pages/en/login.astro`, `src/pages/de/login.astro`
- [ ] Feature-Flag & Secrets — in Arbeit
  - `AUTH_PROVIDER` ausgewertet (Login‑UI schaltet Passwortfeldern aus); Dev‑Secrets/Flags gesetzt; Staging/Prod offen
- [ ] Turnstile — offen (Keys, Server-Validierung; Prod verpflichtend)
- [ ] Sicherheits- & UX-Entscheidungen — offen (Redirect-Policy `r`, Fehler-UX, CORS)
- [ ] Tests — in Arbeit (Integration Happy-/Error-Path, Guards, Flag-Wechsel)
- [x] Redirect-URIs Whitelist — erledigt (Dev/Testing/Staging/Prod)
- [ ] Logging/Monitoring — offen (Events/Alerts)
- [ ] CI — offen (`astro check`, `vitest --workspace`, Playwright gegen `TEST_BASE_URL`)

## Nächste 3 prioritäre Schritte

1. Minimaler Magic-Link Flow (MVP)

- Endpunkte: `POST /api/auth/magic/request` und `GET /api/auth/callback` (mit Edge-Fetch zu Stytch) implementieren.
- Sessionerzeugung + Setzen von `__Host-session`; Smoke-Tests für 302/Redirects und Cookie.

1. Tests & UI

- Integrationstests für den MVP-Flow (inkl. Fehlerfälle) und Flag-Wechsel legacy ↔ stytch.
- UI-Erweiterung: Magic-Link-Button und Statusmeldungen; Passwortfelder unter Flag ausblenden.

1. Feature-Flag & Secrets

- `AUTH_PROVIDER`-Auswertung implementieren; Secrets pro Env via Wrangler setzen.
- Entscheidung bestätigt: Option A (ein Projekt); Redirect-URIs in Stytch hinterlegen (siehe Abschnitt oben).

## Konkrete Reihenfolge – Nächste Schritte

1) Dev: Real‑E‑Mail‑Test gegen Stytch (ohne Bypass)

- In `wrangler.toml` (nur Dev): `STYTCH_BYPASS = "0"` setzen und Worker neu starten (`npm run dev:worker:dev`).
- Magic‑Link anfordern: `POST /api/auth/magic/request` mit gültiger Test‑E‑Mail und `r=/dashboard`.
- Link aus E‑Mail klicken → `GET /api/auth/callback?token=…&r=/dashboard`.
- Erwartung: 302 → `/dashboard`, Cookie `__Host-session` gesetzt.
- Danach für schnelles lokales Iterieren optional zurück zu `STYTCH_BYPASS = "1"`.

1) Tests erweitern (Integration)

- Guards: `/dashboard` ohne Session → 302 auf `/(en/)login`; mit Session → 200/302 OK.
- Redirect‑Policy (`r`): nur relative Pfade zulassen (externes Ziel ignorieren → Fallback `AUTH_REDIRECT`).
- Flag‑Wechsel: `AUTH_PROVIDER=legacy` vs. `stytch` (UI: Passwortformular ausgeblendet; Endpunktverhalten unverändert/erwartet).

1) CI aktualisieren

- `astro check` + `vitest` (Workspace) integrieren; Port 8787 im Dev‑Worker fest verdrahten.
- `TEST_BASE_URL` nutzen; wenn nicht gesetzt: lokalen Dev‑Worker in CI starten (Port 8787).
- Secrets in CI für `testing`: `STYTCH_PROJECT_ID`, `STYTCH_SECRET` (TEST‑Werte).

1) Staging vorbereiten

- Redirect‑URI ist bereits whitelisted.
- Wrangler‑Secrets in `staging` setzen (TEST‑Werte), `AUTH_PROVIDER=stytch`, `STYTCH_BYPASS=0`.
- Smoke: Request → E‑Mail → Callback → Dashboard/Cookies prüfen.

1) Production vorbereiten

- LIVE‑Redirect‑URI bestätigt; Wrangler‑Secrets in `production` setzen (LIVE‑Werte).
- Sicherheitsreview: CSP/Headers, `__Host-session` (Secure, Strict, Path=/).
- Turnstile in Prod aktivieren (nur Prod erzwingen).
- Rollout: `AUTH_PROVIDER=stytch` auf Prod setzen, Monitoring aktiv.

1) Monitoring/Logging

- Events: Magic‑Link Request/Callback; Fehlerpfade (Invalid/Expired/CSRF/RateLimit).
- Alerts/Thresholds; Dashboard‑Queries definieren.

1) Cleanup (nach Beobachtungsfenster)

- Deprecated Dateien entfernen, `routes.md` & CHANGELOG aktualisieren.

## Dev‑Hinweise (Bypass & Port)

- `STYTCH_BYPASS`: In Dev kann der Callback mit `token=dev-ok` und `email=` den Stytch‑Call überspringen (nur zu Testzwecken). In Prod/Stage deaktiviert lassen (`0`).
- Dev‑Port: Die Dev‑Skripte sind auf Port `8787` fixiert (`dev:worker`, `dev:worker:dev`, `dev:open`).

## Änderung: Stytch Redirect Payload (Dev/Test)

1. Wir senden an Stytch keine Query‑Parameter mehr in der Callback‑URL.

   - Hintergrund: Stytch validiert die Redirect‑URL inkl. Query‑Params strikt gegen die Whitelist. Das führte lokal zu `query_params_do_not_match`.
   - Umsetzung: In `src/pages/api/auth/magic/request.ts` verwenden wir `login_magic_link_url`/`signup_magic_link_url` ohne `?r=...`.

1. Wunsch‑Redirect `r` wird kurzzeitig als HttpOnly‑Cookie gespeichert.

   - Cookie: `post_auth_redirect` (10 Minuten, SameSite=Lax, HttpOnly).
   - In `src/pages/api/auth/callback.ts` hat das Cookie Vorrang vor `r` in der Query und wird nach Nutzung gelöscht.

## Deployment auf Test‑Domain (Stytch TEST)

1. Stytch Dashboard (TEST)

   - Email Magic Links aktivieren.
   - Redirect‑URL whitelisten und aktivieren (Login + Signup):
     - `https://test.hub-evolution.com/api/auth/callback`

1. Cloudflare Secrets (Testing)

   - `wrangler secret put AUTH_PROVIDER --env testing` → `stytch`
   - `wrangler secret put AUTH_REDIRECT --env testing` → `/dashboard`
   - `wrangler secret put STYTCH_PROJECT_ID --env testing` → `project-test-...`
   - `wrangler secret put STYTCH_SECRET --env testing` → `secret-test-...`

1. Deploy & Verifikation

   - `npm run build:worker`
   - `wrangler deploy --env testing`
   - Optional Logs: `wrangler tail --env testing --format=pretty`
   - Browser: `https://test.hub-evolution.com/en/login` → Magic‑Link anfordern → E‑Mail‑Link klicken → erwartetes 302 auf `/dashboard`.

## Priorisierte nächste Schritte (aktualisiert)

1. i18n‑Fix: Übersetzungsschlüssel `pages.login.form.magic_button` (de) ergänzen; Fallback auf en sicherstellen.

1. CSP‑Entscheidung: Cloudflare Insights Beacon (`https://static.cloudflareinsights.com`) erlauben ODER bewusst blockieren und dokumentieren.

1. Integrationstests erweitern: Magic‑Link Happy‑/Error‑Paths, r‑Cookie‑Policy, Feature‑Flag legacy↔stytch; Tests gegen TEST_BASE_URL.

1. CI aktualisieren: `astro check` integrieren, `vitest --workspace`, Playwright gegen `TEST_BASE_URL=https://ci.hub-evolution.com`.

1. Staging vorbereiten: Secrets setzen, Deploy, Smoke‑Tests (Magic Link).

1. Production vorbereiten: LIVE‑Secrets, Turnstile aktivieren, Security Review, finale CSP.

1. Monitoring/Logging: Alerts/Events konfigurieren, PII‑Redaction prüfen, CSP‑Report beibehalten.

1. Cleanup nach Beobachtungsfenster: Deprecated Endpoints/Flags entfernen, `routes.md` & CHANGELOG aktualisieren.

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

- 2025-09-08 19:00 +02:00 — UX‑Verbesserungen: Magic‑Link Cooldown mit i18n‑Zähler eingeführt; sofortige Cross‑Tab‑Weiterleitung via `BroadcastChannel('auth')` ergänzt (neue Seite `/auth/notify`, Listener auf Login‑Seiten). Settings: Passwort‑Abschnitt ausgeblendet, E‑Mail read‑only mit Hinweis, „Change Email“‑CTA deaktiviert. Dokumentation aktualisiert.

- 2025-09-04 00:33 +02:00 — HEAD-Methoden-Tests für deprecated Endpoints (`/api/auth/logout`, `/api/auth/verify-email`) ergänzt in `test-suite-v2/src/unit/security/deprecated-logging.test.ts` (410 JSON, `Cache-Control: no-store`, Security-Logging `USER_EVENT`/`deprecated_endpoint_access`). Workspace-Phase 1 (zentrale Aliases) abgeschlossen; Suite grün.

- 2025-09-05 21:00 +02:00 — (Historisch) Login-Endpoint verifiziert und dokumentiert. Hinweis: Dieser Flow wurde mittlerweile entfernt; Stytch Magic Link ist allein gültig.

## Anhang: Referenzen im Code

- Middleware: `src/middleware.ts`
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
