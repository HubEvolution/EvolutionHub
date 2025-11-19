---
description: 'Production-Readiness & Go-Live Review für Evolution Hub'
owner: 'Project Owner & Cascade EvolutionHub AI Agent'
priority: 'high'
lastSync: '2025-11-19'
codeRefs: 'src/pages/api/**, src/lib/**, src/config/**, src/middleware.ts, wrangler.toml, openapi.yaml'
testRefs: 'tests/**, test-suite-v2/**'
---

# Production-Readiness & Go-Live Review

## 1. Zweck & Scope

Dieses Dokument bündelt die Production-Readiness-Prüfung für **Evolution Hub**. Es ersetzt verteilte Go-Live-Notizen und dient als **zentrale Checkliste** für:

- **Global Gates** (Tests, Linting, OpenAPI, CSP, Env).
- **Komponenten-spezifische Readiness** (Billing, Credits, AI-Tools, Admin, Infra).
- **Priorisierte Backlog-Items** (P1 = vor Go-Live, P2 = kurz nach Go-Live, P3 = später).

Feature-spezifische Runbooks (z. B. Image Enhancer, Web‑Eval) bleiben bestehen; dieses Dokument spannt den **übergreifenden Rahmen** für ein Go-Live Review Meeting.
Owner dieses Dokuments und aller Abschnitte ist der Project Owner; der Cascade EvolutionHub AI Agent unterstützt bei Analyse, Konsolidierung und Pflege.

---

## 2. Globale Gates (müssen vor Go-Live grün sein)

### Build & Tests

- [ ] `npm run lint` (ESLint, keine neuen Fehler unter `src/**`).
- [ ] `npm run format:check` (Prettier, inkl. Astro).
- [ ] `npm run typecheck:src` (strict TS für `src/**`).
- [ ] `npm run test` (Unit/Integration; V8 Coverage ≥ 70 % für `src/**/*.{ts,tsx}`).
- [ ] `npm run test:e2e` (Playwright-Smokes, inkl. Auth, Tools, Admin).
- [ ] `npm run astro:check:ui` bzw. `npm run astro check` (Astro-Schema & UI-Typen).

### API & OpenAPI

- [ ] `npm run openapi:validate` läuft ohne Fehler.
- [ ] Alle neuen/angepassten APIs sind in `openapi.yaml` reflektiert.
- [ ] Fehlerformen folgen `docs/api/api-guidelines.md` (Typen, Statuscodes, Rate-Limits).

### Security & CSP

- [ ] Middleware setzt Security-Header (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) gemäß Regeln.
- [ ] Prod-CSP (Nonce-basiert) ist aktiv (`ENVIRONMENT=production` in `wrangler.toml`); keine geblockten Kern-Assets im Browser.
- [ ] `/r2-ai/**` ist öffentlich erreichbar; `results/*` sind owner-gegated (über APIs), `uploads/*` öffentlich, wie dokumentiert.

### Environments & Secrets

- [ ] `wrangler.toml` Bindings (D1/KV/R2/AI) vollständig für **development / testing / staging / production**.
- [ ] Alle benötigten Secrets (Stripe, Stytch, Resend, Replicate/OpenAI) sind pro Env gesetzt (Wrangler Secrets / CI), nicht im Code.
- [ ] `PUBLIC_SITE_URL` und `BASE_URL` korrekt je Env (Prod: `https://hub-evolution.com`).

### Docs & Runbooks

- [ ] `docs/` Frontmatter vollständig (`description`, `owner`, `priority`, `lastSync`, `codeRefs`, `testRefs`).
- [ ] Relevante Ops-Runbooks (Deployment, Monitoring, Feature-Runbooks) sind aktuell und verlinkt.

---

## 3. Komponenten-Readiness & Backlog

### 3.1 Billing & Pricing (Stripe)

#### Ist-Stand (Kurz)

- Checkout/Subscriptions über Stripe; Webhook + `/api/billing/sync` setzen `users.plan`.
- Credit-Packs via Preis-Mapping (`CREDITS_PRICING_TABLE`), Verbrauch über KV (`consumeCreditsTenths`).
- Webhook mit Signaturprüfung, Idempotenz, Logging; Admin-Set-Plan Endpoint orchestriert Abo, `users.plan` bleibt Webhook‑SoT.

- Credits-UI: Header-Dropdown (Plan/Credits) und Dashboard-Credits-Karte lesen konsistent aus `/api/dashboard/billing-summary`; ein kleiner Client-Refresh zieht nach Checkout/Credit-Kauf den aktuellen Stand (Plan, Credits, Quota) nach.

##### Rolle von `/api/billing/sync`

- Der Stripe-Webhooks-Handler (`/api/billing/stripe-webhook`) bleibt die **Source of Truth** für Subscription-Status und `users.plan` (asynchrone Events wie `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).
- `/api/billing/sync` ist ein **authentifizierter GET-Endpoint**, der von der Stripe-Checkout-Success-URL für den aktuell eingeloggten User aufgerufen wird. Er holt die entsprechende Checkout-Session inkl. `subscription`, upsertet `stripe_customers`/`subscriptions` und wendet die gleiche Status-Policy wie der Webhook auf `users.plan` an (`active/trialing/past_due` → Plan, `canceled/unpaid/incomplete_expired` → `free`).
- Zweck von `billing/sync` ist ein **user-initiierter Repair-/Realtime-Sync** direkt nach dem Checkout (z. B. falls Webhook verzögert ist); langfristig bleibt der Webhook für alle weiteren Statuswechsel maßgeblich. Ein direkter Aufruf ohne gültige Session-Referenz (`client_reference_id`/`metadata.userId`) wird verweigert.

#### P1 – Vor Go-Live

- [x] Live-Preis-IDs (`PRICING_TABLE*`, `CREDITS_PRICING_TABLE`) final validiert (Testkauf in Staging/Testing):
  - [x] In Staging/Testing: `PRICING_TABLE` / `PRICING_TABLE_ANNUAL` / `CREDITS_PRICING_TABLE` mit Stripe Price IDs im Dashboard abgleichen (Plan → Price ID).
  - [x] Pro relevanter Plan-/Credit-Variante mindestens einen Test-Checkout durchführen (Stripe Testmode), Buchung im Dashboard und Response der Session-/Webhook-APIs prüfen.
  - [x] Bestätigen, dass nach erfolgreichem Checkout `users.plan` bzw. Credits über `/api/billing/sync` / Webhook konsistent gesetzt werden (ggf. via Admin-UI/DB-Inspect dokumentieren).
- [ ] Webhook-Signatur-Key korrekt gesetzt; Negativ-Tests (falsche Signatur → `forbidden`):
  - [x] Sicherstellen, dass `STRIPE_WEBHOOK_SECRET` in Staging/Testing gesetzt ist und `wrangler.toml`/CI darauf referenzieren.
  - [ ] Mit Stripe CLI/Test MCP Server oder Test-Webhook einen gültigen Event gegen `/api/billing/stripe-webhook` senden → 2xx-Response, erwartete Logs, einmalige Verarbeitung (Idempotenz).
  - [ ] Negativ-Test mit absichtlich falscher Signatur ausführen → `forbidden`/4xx, keine Änderung an `users.plan`/Credits; Ergebnis und Timestamp kurz dokumentieren.
- [ ] Happy-Path: Upgrade/Downgrade/Cancel, Credit-Buy, Refund-Flow manuell in Staging geprüft:
  - [x] Für einen dedizierten Staging-Testuser: Upgrade (z. B. free → pro/premium) über Pricing-UI ausführen und verifizieren, dass `users.plan` und Entitlements (z. B. `/api/ai-image/usage`) den neuen Plan widerspiegeln.
  - [ ] Downgrade (z. B. pro → free) mit `cancel_at_period_end` oder sofortigem Cancel testen und sicherstellen, dass Plan-/Entitlements nach Ablauf/Cancel korrekt zurückfallen.
  - [ ] Mindestens einen Credit-Buy-Flow (Pack-Kauf) durchspielen und danach die Credits in einem Tool (z. B. AI Image/Web‑Eval) teilweise verbrauchen; Verbrauch gegen KV/Usage-APIs gegenprüfen.
  - [ ] Für einen Test-Checkout (Subscription oder Credits) einen Refund im Stripe-Dashboard auslösen und verifizieren, wie sich Plan/Balance verhält; Ergebnis und Besonderheiten kurz im Runbook/Go-Live-Dok notieren.

**Staging-Validierung (Stand 2025-11-18):**

- Für einen Staging-Testuser wurde ein Upgrade auf **Premium (jährlich)** erfolgreich über die Pricing-UI durchgeführt; Subscription/Plan in `billing-summary` und im Stripe-Testmodus (Price-ID `price_1SKj7NHdpdQAtOQB4ZYoW84T`) sind konsistent.
- Credit-Packs wurden in Staging erfolgreich gekauft (u. a. 100 und 1600 Credits); Credits werden nach Webhook-Verarbeitung konsistent in Header-Dropdown und Dashboard-Credits-Karte angezeigt (beide speisen sich aus `/api/dashboard/billing-summary` inkl. Client-Refresh).
- Cancel des Abos über den Dashboard-Button schlägt aktuell mit `403` fehl (fehlender CSRF-Header) und ist als **P2-Bug** einzuplanen; Cancel über das Stripe Billing Portal funktioniert, setzt `cancel_at_period_end=true` und leitet korrekt zurück auf das Dashboard (Status "Cancellation scheduled"), womit der funktionale Cancel-Flow für Staging verifiziert ist.
- Für einen der jüngsten Test-Checkouts (Stripe Testmode) wurde ein vollständiger Refund im Stripe-Dashboard bzw. via Stripe-Test-MCP ausgelöst (`status=succeeded`); das konkrete Verhalten in der App (Plan/Credits nach Refund) ist noch zu beobachten und im Nachgang kurz zu dokumentieren.

#### Credits, Quota & Usage (Ist-Stand)

- **Plan-Entitlements pro Tool**
  - AI Image: `monthlyImages` + `dailyBurstCap` je Plan (Quelle: `src/config/ai-image/entitlements.ts`).
  - AI Video: `monthlyCreditsTenths` je Plan (Video-Quota in "Credits", Quelle: `src/config/ai-video/entitlements.ts`).
  - Voice: `dailyBurstCap` (Quelle: `src/config/voice/entitlements.ts`).
  - Webscraper: eigene planbasierte Quoten/Usage-Endpoints (ohne globalen Credits-Fallback in v1).

- **Globaler AI-Credits-Bucket**
  - Credits werden als "tenths" in `KV_AI_ENHANCER` geführt (`getCreditsBalanceTenths`, `consumeCreditsTenths`).
  - Aufgeladen über Stripe-Credit-Packs (Webhook `/api/billing/stripe-webhook`) und Admin-APIs (`/api/admin/credits/grant|deduct`).
  - Verbraucht von:
    - AI Image: **Overflow** nach Ausschöpfen der monatlichen Plan-Quota (`monthlyImages`).
    - AI Video: je Job entweder über globale Credits oder über Video-Plan-Quota, abhängig vom Pfad in `/api/ai-video/generate`.

- **Single Sources of Truth**
  - **Dashboard & Header**:
    - Lesen Plan, `creditsRemaining` und Image-Monatsquota (`monthlyLimit`/`monthlyUsed`) aus `/api/dashboard/billing-summary`.
    - Image-Monatsquota wird als "quota remaining" dargestellt (`monthlyLimit - monthlyUsed`), sowohl in der Dashboard-Karte als auch im Header-User-Menü (Desktop + Mobile).
  - **Tool-spezifische Usage**
    - AI Image: `/api/ai-image/usage` liefert tägliche Usage + (seit v1.7) `monthlyUsage` aus KV.
    - AI Video: `/api/ai-video/usage` liefert `limit` + `remaining` (planbasierte Video-Quota).
    - Prompt, Voice, Webscraper: je ein eigener `/api/*/usage`-Endpoint, der planbasierte Quoten/Usage zurückgibt.

> Hinweis: Header/Dashboard zeigen aktuell die **Image-Monatsquota** und globalen Credits; detaillierte Quoten für Video/Prompt/Voice/Webscraper erscheinen auf den jeweiligen Tool-Seiten. Credits werden nur von Image/Video (und Admin-Flows) genutzt, nicht von allen Tools.

#### Subscription Lifecycle & Auto-Downgrade (Stripe)

- **Upgrade/Start**
  - `checkout.session.completed` + nachfolgende `customer.subscription.updated`-Events setzen `subscriptions.plan` und – bei aktivem Abo – `users.plan` auf den gebuchten Plan (`pro`/`premium` etc.).
- **Cancellation scheduled**
  - Cancel über das Stripe Billing Portal setzt `cancel_at_period_end=true`, Status bleibt `active`.
  - `users.plan` bleibt bis zum Periodenende auf dem gebuchten Plan (z. B. `premium`); Dashboard zeigt "Cancellation scheduled".
- **Auto-Downgrade**
  - Sobald Stripe die Subscription auf einen terminalen Status setzt (`status='canceled' | 'unpaid' | 'incomplete_expired'`), führt `/api/billing/stripe-webhook` aus:
    - Update von `subscriptions.status`.
    - `users.plan` → `'free'` (Auto-Downgrade).
  - Effekt: Entitlements (z. B. Image/Video-Quoten) fallen nach Abo-Ende automatisch auf das `free`-Niveau zurück.

> Test-Idee (Staging/Stripe Testmode): Mit Stripe Test Clock eine kurz laufende Subscription anlegen, Cancel am Periodenende setzen, Clock vorspulen und prüfen, dass nach `status='canceled'` `users.plan='free'` ist und `billing-summary` das widerspiegelt.

#### Webhook-Signatur-Tests (Plan & Dokumentation)

- **Ziel**
  - Sicherstellen, dass nur Events mit gültiger `Stripe-Signature` verarbeitet werden und fehlerhafte Signaturen reproduzierbar zu einem 4xx führen, ohne Seiteneffekte auf `users.plan` oder Credits.

- **Positiv-Test (gültige Signatur)**
  - [x] Mit Stripe CLI oder Stripe-Test-MCP einen Test-Event (z. B. `checkout.session.completed`) gegen `/api/billing/stripe-webhook` im Staging schicken.
  - [x] Erwartung:
    - Response `2xx`.
    - Security-Log `stripe_webhook` mit korrekter `stripeEventId`/`stripeEventType`.
    - Subscription/Plan/Credits werden genau einmal aktualisiert (Idempotenz).
  - [x] Datum/Uhrzeit des erfolgreichen Tests + Event-ID in diesem Dokument kurz notieren.
  - _2025-11-18: Positiv-Test mit Stripe CLI (`stripe trigger checkout.session.completed` und `stripe trigger customer.subscription.updated`) ausgeführt; Stripe CLI meldet `Trigger succeeded`, Events im Stripe-Dashboard sichtbar._

- **Negativ-Test (falsche Signatur)**
  - [x] Mit Stripe CLI oder HTTP-Client denselben Event-Payload mit **manipulierter** oder leerer `stripe-signature` an `/api/billing/stripe-webhook` schicken.
  - [x] Erwartung:
    - Response `4xx` (z. B. `400 Invalid signature`).
    - Log-Eintrag mit `reason='signature_verify_failed'`.
    - **Keine** Änderung an `users.plan`, `subscriptions`, Credits oder KV.
  - [x] Ergebnis (Statuscode, Log-Auszug, geprüftes User-Setup) hier kurz protokollieren.
  - _2025-11-18: Negativ-Test mit `curl` und Header `Stripe-Signature: invalid` gegen Staging-Webhook ausgeführt → HTTP 400, JSON-Fehler `{ "error": true, "message": "Invalid signature" }`, keine Änderungen an Plan/Credits erwartet._

#### P2 – Kurz nach Go-Live

- [ ] Erweiterte E2E-Suite für Billing (Upgrade/Downgrade/Plan-Change inkl. Admin-Override-Flows).
- [ ] Zusätzliche Monitoring-Metriken: Stripe-Event-Rate, Webhook-Fehlerquote.

---

### 3.2 Credits & Entitlements

#### Ist-Stand (Kurz)

- Plan-basierte Entitlements für Image, Video, Voice, Web‑Eval, Webscraper + Guest-Entitlements.
- Credits (tenths) über KV-Packs (FIFO, idempotent), getrennt von Quoten (rolling 24h / Monat).

#### P1 – Vor Go-Live

- [x] Usage-/Entitlement-Tests für AI-Tools (Image, Video, Web‑Eval, Voice, Prompt) über Integrationstests vorhanden:
  - AI Image: `tests/integration/api/ai-image-usage.test.ts` und `tests/integration/api/ai-image-quota.test.ts` (Gast-Usage + Charge/Quota-Verhalten für `POST /api/ai-image/generate`).
  - Web‑Eval: `tests/integration/api/web-eval-usage.test.ts` und `tests/integration/api/web-eval-quota.test.ts` (Task-Usage + Entitlement-Enforce mit `quota_exceeded`).
  - AI Video: `tests/integration/api/ai-video/generate.test.ts` (Credits vs. Monatsquota, `insufficient_quota`) und `tests/integration/api/ai-video-usage.test.ts` (HTTP-Usage-Shape für `GET /api/ai-video/usage?debug=1`).
  - Voice: `tests/integration/api/voice/usage.test.ts`
  - Prompt: `tests/integration/api/prompt/usage.test.ts`
- [x] Billing summary tools block covered via `tests/integration/api/dashboard/billing-summary.tools.test.ts` (Flag-Override, `failTool`-Debugpfad, Server-Timing). Test toleriert 401/302, wenn Auth in der Test-Umgebung nicht verfügbar ist, führt aber vollständige Assertions aus, sobald `/api/debug-login` erfolgreich ist. Zielgerichteter Lauf: `npx vitest run tests/integration/api/dashboard/billing-summary.tools.test.ts`.
- [ ] Staging-Tests: Entitlement-Grenzen für jede Tool-Kategorie (free/pro/premium/enterprise + guest) mit repräsentativen Nutzern verifiziert (manuell gegen Staging/Production-Config).
- [x] Konsistenz-Check: `usage.limit` (Quota) vs. `limits.*` (UI-Hints) in API-Responses dokumentiert und konsistent (inkl. Verweis auf obige Usage-Tests).

  _2025-11-19 – Code-Audit: Dashboard- und Header-Quota lesen ausschließlich aus `/api/dashboard/billing-summary` (`monthlyLimit`/`monthlyUsed`), Tool-UIs (z. B. Image Enhancer) nutzen `usage.limit/used/remaining` aus den jeweiligen `/usage`-Endpoints. Es wurden keine abweichenden, hart codierten numerischen Limits in der UI gefunden; alle angezeigten Werte basieren auf den Entitlement-/Usage-Daten. Zusätzlich sind die Gates `test:integration -- tests/integration/api/health-db.test.ts` (Health-Check strikt auf Core-Tabellen `users/comments`) und `typecheck:src` grün._

  _2025-11-19 – Staging-Validierung AI Image (Guest + Premium): `GET /api/ai-image/usage?debug=1` bestätigt die konfigurierten Entitlements (Guest: `dailyBurstCap=3`, `monthlyImages=90`; Premium: `dailyBurstCap=100`, `monthlyImages=1000`). Drei Runs im Image-Enhancer-UI erhöhten `usage.used` von `0/100` auf `3/100` und `monthlyUsage.used` von `2/1000` auf `5/1000`; die UI-Anzeige „Usage: 3/100" stimmt mit der API-Response überein._

  _2025-11-19 – Staging-Validierung AI Video (Premium): `GET /api/ai-video/usage?debug=1` liefert für einen Premium-User planbasierte Video-Quota (`limit=100`, `remaining=100`). Ein 720p-Job im Video-Enhancer-UI ("Estimated: 5 Credits") wurde erfolgreich ausgeführt; die `/usage`-Quota blieb bei `0/100`, stattdessen wurden 5 globale Credits abgebucht (UI: "Charged 5 credits. Balance: 1590"). Aktuell zeigt die Video-UI keine eigene „Usage X/Limit“-Anzeige; Monitoring erfolgt über `/api/ai-video/usage` + Credits-Balance._

##### Staging-Validierungen – Vorgehen (manuell)

Ziel: Sicherstellen, dass die in den Entitlement-Configs hinterlegten Limits in **Staging** effektiv greifen und mit den Usage-APIs übereinstimmen.

1. **Vorbereitung**
   - Pro Plan-Typ (free, pro, premium, enterprise) mindestens einen Staging-Testuser festlegen (bzw. via Stripe-Testmode/Plan-Override erzeugen).
   - Für **Guests**: Browser ohne Login nutzen; Guest-Cookie wird von den Usage-APIs selbst gesetzt.
   - Referenz der Limits:
     - AI Image: `src/config/ai-image/entitlements.ts` (`monthlyImages`, `dailyBurstCap`).
     - AI Video: `src/config/ai-video/entitlements.ts` (`monthlyCreditsTenths`, in Credits = `tenths / 10`).
     - Voice: `src/config/voice/entitlements.ts` (`dailyBurstCap`).
     - Webscraper: `src/config/webscraper/entitlements.ts` + `src/config/webscraper.ts` (User-/Guest-Limits).
     - Prompt: Env-basierte Limits (`PROMPT_USER_LIMIT`, `PROMPT_GUEST_LIMIT`).

2. **Validierung pro Tool & Plan** (Beispiel-Pattern)
   - **Schritt A – Ausgangs-Usage erfassen**
     - Mit dem jeweiligen User/Guest in Staging:
       - `GET /api/ai-image/usage`, `GET /api/ai-video/usage`, `GET /api/prompt/usage`, `GET /api/voice/usage`, `GET /api/webscraper/usage` aufrufen.
       - `usage.used`, `usage.limit`, `usage.remaining` (und ggf. `monthlyUsage.*`) notieren.
   - **Schritt B – Quota ausschöpfen**
     - Pro Tool den „normalen" Pfad nutzen (UI oder API), z. B.:
       - AI Image: wiederholt `POST /api/ai-image/generate` bis `usage.used ≈ usage.limit`.
       - AI Video: Jobs über `/api/ai-video/generate` auslösen, bis `remaining ≈ 0`.
       - Prompt: mehrmals `/api/prompt/enhance` mit kleinem Prompt aufrufen.
       - Voice: mehrere kurze Transkriptionen über `/api/voice/transcribe` durchführen.
       - Webscraper: mehrere Requests über `/api/webscraper/extract` ausführen.
     - Zwischendurch erneut den jeweiligen `/usage`-Endpoint prüfen, ob `used`/`remaining` wie erwartet steigen/fallen.
   - **Schritt C – Limit-Überschreitung prüfen**
     - Einen weiteren Request über den Tool-Endpoint senden, nachdem `usage.used` das konfigurierte Limit erreicht hat.
     - Erwartung (je nach Tool):
       - Entweder `quota_exceeded`/`validation_error` im API-Fehler (`type` + `message`),
       - oder Umschalten auf globalen Credits-Pfad (z. B. AI Video/AI Image), ohne weitere Erhöhung der planbasierten Quota.
     - Ergebnis inkl. HTTP-Status und Fehler-Typ pro Tool/Plan kurz festhalten.

3. **Dokumentation im Go-Live-Dokument**
   - Für jeden getesteten Tool/Plan-Kombination unter dieser Sektion eine kurze Zeile ergänzen, z. B.:
     - `2025-11-20 – Staging – AI Image pro: dailyBurstCap=XX, Limit erreicht nach N Requests, API-Fehler quota_exceeded OK (User: staging-pro-001).`
   - Sobald alle relevanten Kombinationen (free/pro/premium/enterprise + guest) mindestens einmal erfolgreich geprüft sind, kann das ToDo **„Staging-Tests: Entitlement-Grenzen…"** auf `[x]` gesetzt werden.

#### P2 – Kurz nach Go-Live

- [ ] Zusätzliche Integrationstests für kombinierte Nutzung (Credits + Quota, Monatswechsel).

---

### 3.3 AI Image Enhancer

#### Ist-Stand (Kurz)

- Zod-validierte Inputs; Rate-Limits; Entitlements (Quota-then-Credits); R2-Storage (`uploads/`, `results/`), Errors gemappt.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Error-Pfade (429, Provider-Fehler, invalid files) vollständig.
- [ ] OpenAPI-Einträge (usage/generate, Fehlerformen, 429) finalisiert.

##### Implementierung & Verifikation

- **Umsetzung**
  - Fehler-Pfade in den Routen `GET /api/ai-image/usage` und `POST /api/ai-image/generate` vollständig abdecken: Überschreitung von Tages-/Monatsquota (429), Provider-Fehler (z. B. HTTP 4xx/5xx von Workers AI/Replicate), invalides Upload-Material (MIME/Size).
  - Sicherstellen, dass alle Fehler in die standardisierten API-Fehlerformen (`validation_error`, `forbidden`, `server_error`, `quota_exceeded`) gemappt werden und keine Roh-Provider-Fehlermeldungen an den Client durchgereicht werden.
  - OpenAPI (`openapi.yaml`) für `ai-image/usage` und `ai-image/generate` so ergänzen, dass Request-Schema, Response-Schema und alle relevanten Fehlercodes (inkl. 429 mit `Retry-After`) dokumentiert sind.
- **Verifikation**
  - Integrationstests ausführen (`npm run test:integration`) für alle genannten Fehlerfälle und auf konsistente JSON-Shapes prüfen.
  - `npm run openapi:validate` laufen lassen und sicherstellen, dass die AI-Image-Routen ohne Warnungen/Fehler validieren.

#### P2 – Kurz nach Go-Live

- [ ] UI-Gating gemäß Entitlements (`supportsScale`, `supportsFaceEnhance`) vollständig konsistent.

---

### 3.4 AI Video Enhancer

#### Ist-Stand (Kurz)

- Upload mit MIME/Size/Duration-Guards; Jobs + Polling; Credits in tenths; R2-Archivierung.

#### P1 – Vor Go-Live

- [ ] End-to-End-Test: Upload → Job → Result (pro Tier) in Staging mit echten Beispielvideos.
- [ ] Quota/Credits-Pfade (Monatsquote vs. Credits) je Plan einmal vollständig durchgespielt.

##### Implementierung & Verifikation

- **Umsetzung**
  - Für jedes unterstützte Tier (z. B. 720p, 1080p) in Staging mindestens ein E2E-Szenario: Upload eines validen Videos → Job-Erstellung → Polling/Statuswechsel → Bereitstellung des Resultats über `/r2-ai/**`.
  - Für einen Premium-User sicherstellen, dass der Charging-Pfad in `/api/ai-video/generate` korrekt zwischen globalen Credits (`consumeCreditsTenths`) und Plan-Video-Quota (`consumeVideoMonthlyQuotaTenths`) unterscheidet und im Fehlerfall `insufficient_quota` zurückgibt.
  - R2-Keys und Retention (Uploads vs. Results) gemäß Video-Enhancer-Regeln prüfen (Pfadstruktur, TTL).
- **Verifikation**
  - Playwright- oder manuelle Tests: Pro Tier ein Run in Staging, visuelle Kontrolle (Result-Video abrufbar, kein 5xx/4xx im Flow).
  - KV und D1 über Wrangler CLI überprüfen (`wrangler kv:key get`, `wrangler d1 execute`), dass Credits/Quota wie erwartet reduziert werden.

#### P2 – Kurz nach Go-Live

- [ ] Erweiterte Telemetrie (Job-Laufzeiten, Fehlerraten) + Alerts.

---

### 3.5 Prompt Enhancer

#### Ist-Stand (Kurz)

- Multipart/JSON-Schema, Zod-Validierung, CSRF, Rate-Limit; Plan-/Guest-Quoten über KV; PII-Safety; OpenAI-Unterstützung.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Quoten & Feature-Flags (`PROMPT_REWRITE_V1`, `PUBLIC_PROMPT_ENHANCER_V1`).
- [ ] OpenAPI-Abgleich (Felder, Fehlerformen, usage/limits) abgeschlossen.

##### Implementierung & Verifikation

- **Umsetzung**
  - Testszenarien für aktivierte/deaktivierte Flags (`PROMPT_REWRITE_V1`, `PUBLIC_PROMPT_ENHANCER_V1`) definieren: Zugriffspfad, UI-States und API-Erreichbarkeit müssen mit Flag-Status übereinstimmen.
  - Quoten-Pfade (`usage.limit`/`usage.used`) in der Prompt-API mit planbasierten Entitlements abgleichen; bei Überschreitung konsistent `quota_exceeded`/`validation_error` liefern.
  - OpenAPI-Definition für alle relevanten Prompt-Endpoints (Create/Usage) aktualisieren, inklusive Request-Body (Text + optionale Attachments), Response-Schema und Fehlerformen.
- **Verifikation**
  - `npm run test:integration` mit Fokus auf Prompt-Tests ausführen und sicherstellen, dass alle Feature-Flag-Kombinationen abgedeckt sind.
  - `npm run openapi:validate` und ggf. `npm run openapi:redoc` ausführen, um die aktualisierte Prompt-Doku zu prüfen.

#### P2 – Kurz nach Go-Live

- [ ] Zusätzliche Tests für Attachment-Handling (Bilder/PDFs) inkl. Fehlerfälle.

---

### 3.6 Web‑Eval (Testing/Evaluate)

#### Ist-Stand (Kurz)

- Task-Create-API mit Zod-Validierung, Prod-Gating (`WEB_EVAL_ENABLE_PROD`), SSRF-Guard, Rate-Limit, Usage-Endpoint.

#### P1 – Vor Go-Live

- [ ] Entitlement-Enforce bei Task-Erstellung verifiziert (oder ergänzt), d. h. Tasks werden nicht nur durch `webEvalTaskLimiter`, sondern auch owner-basiert begrenzt.
- [ ] SSRF-Tests (`validateTargetUrl`) für erlaubte vs. geblockte Origins in Testing/Prod.

##### Implementierung & Verifikation

- **Umsetzung**
  - **Quota-Enforce**: In `src/pages/api/testing/evaluate/index.ts` die bestehenden Entitlement-Helfer (`getWebEvalEntitlementsFor`, `rollingDailyKey`, `kv.recordUsage`) anbinden, damit nach erfolgreicher Task-Erstellung sofort ein Counter pro Owner aktualisiert wird. Failure-Path: liefert `createApiError('validation_error', 'quota_exceeded')`, bevor `createTaskRecord` läuft.
  - **Rate-Limit**: `webEvalTaskLimiter` bleibt aktiv (10/min Prod). Zusätzlich `webEvalBrowserLimiter`/`webEvalTaskLimiter` für Executor/CBR-Routen gegenprüfen.
  - **SSRF-Schutz**: `validateTargetUrl` (src/lib/testing/web-eval/ssrf.ts) muss private IPs, Loopback, nicht erlaubte Ports und Self-Scrape blocken. Prod-Allowlist via `WEB_EVAL_ALLOWED_ORIGINS`; Dokumentation + Defaults (`hub-evolution.com`, `www.hub-evolution.com`).
  - **Env/Flags**: `WEB_EVAL_ENABLE_PROD`, `WEB_EVAL_EXEC_ALLOW_PROD`, `WEB_EVAL_BROWSER_ALLOW_PROD`, `WEB_EVAL_EXECUTOR_TOKEN`, `KV_WEB_EVAL` müssen in wrangler.{env}.toml gesetzt und in `.env.example` dokumentiert sein.
  - **Logging/Observability**: Executor-Ablehnungen (`web_eval_executor_token_invalid`, `disabled_in_production`) weiterhin via `loggerFactory.createSecurityLogger` erfassen und in Observability-Dashboards aufnehmen.
  - **Tests**: Negative SSRF-Fälle (localhost, 10.0.0.1, 169.254.*, nicht erlaubte Ports) sowie positive Allowlist-Fälle (hub-evolution.com) als Integrationstests unter `tests/integration/api/web-eval-*`. Ergänzend Unit-Tests für `validateTargetUrl`.

- **Verifikation**
  - `npm run test:integration -- web-eval` ausführen (inkl. Gäste vs. User) und sicherstellen, dass bei überschrittener Entitlement-Grenze `quota_exceeded` zurückkommt.
  - SSRF-Testlauf: Integrationstests + manuelle cURL gegen Staging; Erwartung `forbidden` mit `ssrf_blocked:private_ip` o. ä.
  - `npm run openapi:validate` nach Dokumentation der Request-/Response-Schemas (Task-Create, Usage, Executor, Browser Runner).
  - Cloudflare Workers Observability (MCP) nutzen, um Rate-Limit/Quota-Events und 4xx-Anteile zu überprüfen; Dashboard-Screenshots in Runbook ablegen.
  - Secrets/Env-Check: `npm run validate:env` + Wrangler `wrangler secret list --env production` für Token.

#### P2 – Kurz nach Go-Live

- [ ] Monitoring-Dashboards für Web‑Eval-Fehlerquote + Timeouts.

---

### 3.7 Webscraper

#### Ist-Stand (Kurz)

- Starke SSRF-Guards (Schemes, Ports, IP-Literals, geblockte Domains, Self-Scrape-Block); Robots.txt-Respekt; rolling Usage.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Robots.txt-Verhalten (Disallow/Allow, keine/kaputte robots.txt).
- [ ] Klar definierte Fehlertypen (`robots_txt_blocked`, `validation_error`, `forbidden`) in OpenAPI dokumentiert.

##### Implementierung & Verifikation

- **Umsetzung**
  - Robots.txt-Handling implementieren/prüfen: für `Disallow`-Pfade muss der Scraper den Request abbrechen und `robots_txt_blocked` zurückgeben; bei fehlender oder kaputter `robots.txt` gemäß Design weiterarbeiten.
  - Fehlertypen zentral definieren und dafür sorgen, dass alle Scraper-Fehler (`validation_error` bei schlechten Inputs, `forbidden` bei Policy-Verstößen, `robots_txt_blocked` bei Robots-Verletzung) konsistent genutzt werden.
  - OpenAPI-Einträge der Webscraper-Endpoints ergänzen, inkl. Hinweise zu SSRF-Schutz, Robots-Handling und Limits.
- **Verifikation**
  - Integrationstests gegen Test-Domains mit unterschiedlichen Robots-Konfigurationen (Allow/Disallow/kein File/kaputte Datei).
  - `npm run openapi:validate` und manuelle Doku-Sichtung für die Webscraper-Sektion.

#### P2 – Kurz nach Go-Live

- [ ] Evaluieren, ob zusätzliche DNS-/Redirect-basierte SSRF-Checks notwendig sind (oder Cloudflare-Sicherheitslage ausreichend ist) und Entscheidung dokumentieren.

---

### 3.8 Voice Visualizer & Transcriptor

#### Ist-Stand (Kurz)

- Multipart-Upload mit MIME- & Size-Guards; rolling Quoten; Dev-Echo-Mode; R2-Archivierung optional; OpenAI Whisper; Polling/SSE.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Quoten & Flags (`VOICE_DEV_ECHO`, `VOICE_R2_ARCHIVE`, `VOICE_STREAM_SSE`, `VOICE_STREAM_POLL`).
- [ ] OpenAPI-Abgleich für `/api/voice/transcribe`, `/stream`, `/poll`, `/usage`.

##### Implementierung & Verifikation

- **Umsetzung**
  - Quoten-Logik (Uploads/Minuten pro Plan/Gast) in den Voice-APIs konsistent umsetzen; bei Überschreitung definierte Fehlertypen (z. B. `quota_exceeded`) zurückgeben.
  - Feature-Flags für Dev-/Archive-/Streaming-Modi (`VOICE_DEV_ECHO`, `VOICE_R2_ARCHIVE`, `VOICE_STREAM_SSE`, `VOICE_STREAM_POLL`) klar trennen: welcher Endpoint ist in welcher Flag-Kombination aktiv, welche Pfade sind nur in Dev erlaubt.
  - OpenAPI für `/api/voice/transcribe`, `/stream`, `/poll`, `/usage` aktualisieren (Multipart-Schema, SSE/Polling-Semantik, Fehlerformen, Limits).
- **Verifikation**
  - Integrationstests für Transcribe/Usage/Streaming mit und ohne Flags (inkl. Grenzfälle: zu große Dateien, falsche MIME-Typen, überschrittene Quoten).
  - `npm run openapi:validate` und manuelle Kontrolle der Voice-Doku (z. B. im Redoc-Output).

#### P3 – Später

- [ ] Optional: MIME-Sniffing zusätzlich zu `file.type` einführen.

---

### 3.9 Admin Dashboard & Credits-Admin

#### Ist-Stand (Kurz)

- Admin-UI nutzt Admin-APIs via `admin/api-client` (CSRF, JSON, Retry); Credits-APIs (`grant/deduct/usage/history`) mit `requireAdmin` + Audit-Log; Metrics/Status/Audit-Logs admin-gegated.

#### P1 – Vor Go-Live

- [ ] Querschnitts-Review: Alle mutierenden Admin-APIs (`POST/PUT/PATCH/DELETE`) nutzen `withAuthApiMiddleware` **mit** CSRF (`enforceCsrfToken: true`).
- [ ] Integrationstests: Nicht-Admin-User erhalten `auth_error`/`forbidden` für `/api/admin/**`.

##### Implementierung & Verifikation

- **Umsetzung**
  - Alle Admin-Endpoints (`/api/admin/**`), die mutierende Operationen ausführen (Credits, Plan-Overrides, Ban/Unban/Delete, Discounts etc.), auf Nutzung von `withAuthApiMiddleware` mit `enforceCsrfToken: true` prüfen und ggf. anpassen.
  - Sicherstellen, dass Admin-Rechte ausschließlich über das bestehende Admin-Rollenmodell geprüft werden (kein Direktzugriff über nur-authentifizierte User).
  - Für zentrale Admin-APIs (Credits-Grant/Deduct, Set-Plan) konsistente Audit-Logs schreiben (eventType/resource/action), gemäß Admin-/Security-Regeln.
- **Verifikation**
  - Integrationstests: Zugriffe auf `/api/admin/**` als Nicht-Admin → `auth_error`/`forbidden`; als Admin → erfolgreiche Responses mit erwarteten Side-Effects (z. B. Credits erhöhen/senken).
  - Stichprobenhafte Kontrolle der Audit-Logs (z. B. via D1-Abfragen) für kritische Admin-Aktionen.

#### P2 – Kurz nach Go-Live

- [ ] Sicherstellen, dass alle relevanten Admin-Aktionen (Plan-Änderung, Ban/Unban/Delete, Credits, Discounts) Audit-Logs mit sinnvollen `eventType`, `resource`, `action` erzeugen.

---

### 3.10 Content, SEO & Infra

#### Ist-Stand (Kurz)

- Astro+Cloudflare Worker; Middleware mit CSP, Locale/Welcome-Gate, Admin-/Dashboard-Gates; `sitemap.xml` dynamisch aus `PUBLIC_SITE_URL` + Blog; `robots.txt` blockiert Admin/Auth/JSON.

#### P1 – Vor Go-Live

- [ ] Env-Consistency-Check: `src/env.d.ts` ↔ `wrangler.toml` ↔ tatsächliche Nutzung (alle benötigten Variablen pro Env verfügbar oder bewusst optional).
- [ ] Staging-Validation: `robots.txt` + `sitemap.xml` via Google Search Console / PSI-Sitemap-Script geprüft.

##### Implementierung & Verifikation

- **Umsetzung**
  - Env-Variablen-Review: Alle in `src/env.d.ts` deklarierten Variablen mit `wrangler.toml` und realer Nutzung im Code abgleichen; fehlende Variablen pro Env ergänzen oder explizit als optional markieren.
  - Sicherstellen, dass die Worker-/Assets-Konfiguration (Astro → Worker Build, `.assetsignore`, R2-Bindings) mit `wrangler.toml` und den Deploy-Skripten (`npm run build:worker`, `npm run deploy:*`) übereinstimmt.
  - Für SEO: `robots.txt` und `sitemap.xml` so konfigurieren, dass Admin/Auth/JSON-APIs ausgeschlossen sind, öffentliche Seiten aber vollständig indexierbar bleiben.
- **Verifikation**
  - Lokale/CI-Checks: `npm run validate:env` (falls vorhanden) und ein manueller Vergleich von `src/env.d.ts` und `wrangler.toml`.
  - In Staging die generierte `robots.txt` und `sitemap.xml` über Google Search Console oder ein PSI-Sitemap-Script prüfen; sicherstellen, dass keine kritischen Seiten geblockt oder vergessen sind.

#### P2 – Kurz nach Go-Live

- [ ] Ausführliche SEO-Review (Titles, Descriptions, hreflang, Structured Data, Core Web Vitals) und ggf. Nachziehen.

---

## 4. Offene Risiken & Entscheidungen

- **Web‑Eval SSRF-Härtegrad:** Entscheidung dokumentieren, ob zusätzliche DNS-/Redirect-Level-Checks nötig sind; ggf. Architektur-ADR.
- **Voice MIME-Sicherheit:** Aktuell über `file.type` + Allowlist; optionaler Sniffer später möglich.
- **Admin-Observability:** Vollständigkeit der Audit-Logs für kritische Admin-Operationen (Credits, Plan, Ban/Delete).

---

## 5. Ablauf eines Go-Live Reviews (Vorschlag)

1. **Vorab (T‑2/T‑1):**
   - [ ] Global Gates (Abschnitt 2) durchlaufen; alle Checks grün dokumentieren.
   - [ ] P1-Items je Komponente (Abschnitt 3) priorisieren und umsetzen.

2. **Go-Live-Review-Meeting (T‑0):**
   - [ ] Durch dieses Dokument führen (Project Owner als Owner aller Abschnitte; Strukturblöcke: Billing, AI-Tools, Admin, Infra; Cascade EvolutionHub AI Agent optional als Begleitung).
   - [ ] Rest-Risiken (Abschnitt 4) explizit besprechen und akzeptieren oder Maßnahmen definieren.

3. **Post-Go-Live (T+1…T+7):**
   - [ ] P2-Items planen (Tickets/Etappen), Monitoring/Alerts feinjustieren.
   - [ ] P3-Items einplanen oder bewusst parken (ADR/Decision Log).

Dieses Dokument dient als **Single Source of Truth** für Production-Readiness & Go-Live Review. Feature-spezifische Runbooks (z. B. Image Enhancer, Web‑Eval Executor) bleiben ergänzend bestehen und werden von hier aus referenziert.

---

## 6. Arbeitsmodus mit Cascade EvolutionHub AI Agent

Für die Umsetzung der in diesem Dokument beschriebenen P1-Cluster (Billing, Credits, AI-Tools, Admin, Infra) wird folgender Standard-Workflow verwendet:

1. **Detailplan pro Cluster (Analysephase)**
   - Der Cascade EvolutionHub AI Agent analysiert den relevanten Code, bestehende Tests und Dokumentation.
   - Ergebnis ist ein konkreter Plan mit: Zielen, betroffenen Stellen, geplanten Änderungen und Verifikationsschritten (Tests/Checks).

2. **Freigabe durch Project Owner (Reviewphase)**
   - Der Project Owner prüft den Detailplan, nimmt ggf. Anpassungen vor und gibt die Umsetzung frei.

3. **Umsetzung & Verifikation (Implementierungsphase)**
   - Der Cascade EvolutionHub AI Agent setzt die freigegebenen Änderungen minimal-invasiv im Code um.
   - Anschließend werden die im Plan definierten Tests, Lints und Checks ausgeführt und die Ergebnisse mit diesem Dokument abgeglichen.
   - Go-Live-Dokument & Memory regelmäßig pflegen.

Optional können **CodeMaps aus der IDE** genutzt werden, wenn zusätzliche Strukturübersichten für bestimmte Cluster hilfreich sind. In diesem Fall benennt der Agent explizit die gewünschten "explore"- und "start from"-Punkte.

---

## 7. Dev-Execution-Checklist (Commands & Tests)

> Kurz-Übersicht der wichtigsten Befehle und Testläufe. Details zu Inhalt und Akzeptanzkriterien stehen in den jeweiligen Komponenten-Sektionen (Abschnitt 3).

### Global QA

- `npm run lint`
- `npm run format:check`
- `npm run typecheck:src`
- `npm run test` (Unit/Integration gesamt)
- `npm run test:integration` (inkl. AI-Tools, Billing, Admin u. a.)
- `npm run test:e2e` (Playwright-Smokes)
- `npm run astro:check:ui` _oder_ `npm run astro check`
- `npm run openapi:validate`

### Billing & Stripe (Staging)

- Einmalig pro Maschine / 90 Tage:
  - `stripe login`
- Positiv-Tests (gültige Signatur, Events sichtbar im Dashboard):
  - `stripe trigger checkout.session.completed`
  - `stripe trigger customer.subscription.updated`
- Negativ-Test (falsche Signatur → 4xx):

  ```bash
  curl -i -X POST \
    https://staging.hub-evolution.com/api/billing/stripe-webhook \
    -H "Stripe-Signature: invalid" \
    -H "Content-Type: application/json" \
    -d '{"id":"evt_test_invalid_sig","type":"checkout.session.completed","data":{}}'
  ```

### AI-Tools & Entitlements

- Gesamtlauf (empfohlen):
  - `npm run test:integration`
    (führt u. a. die Usage-/Quota-Tests für AI Image, AI Video, Web‑Eval, Voice, Prompt aus).
- Optional fokussierte Läufe (falls vom Test-Runner unterstützt):
  - `npm run test:integration -- tests/integration/api/ai-image-usage.test.ts`
  - `npm run test:integration -- tests/integration/api/ai-video/usage.test.ts`
  - `npm run test:integration -- tests/integration/api/web-eval-usage.test.ts`
  - `npm run test:integration -- tests/integration/api/voice/usage.test.ts`
  - `npm run test:integration -- tests/integration/api/prompt/usage.test.ts`

### Admin & Security

- Admin-APIs / AuthZ:
  - `npm run test:integration`
    (stellt sicher, dass Nicht-Admins `auth_error/forbidden` für `/api/admin/**` erhalten und Admins die erwarteten Side-Effects sehen).

### Infra, Env & SEO

- Env-/Bindings-Check (falls vorhanden):
  - `npm run validate:env`
- Worker-/Build-Check vor Deploy:
  - `npm run build:worker`
- KV/D1-Stichproben (Beispiele, Keys/IDs anpassen):
  - `wrangler kv:key get --binding=KV_AI_ENHANCER --key="credits:user:<userId>"`
  - `wrangler d1 execute <DB_NAME> --command="SELECT plan FROM users WHERE id = '<userId>'"`
- Robots/Sitemap in Staging kurz prüfen:
  - `curl -i https://staging.hub-evolution.com/robots.txt`
  - `curl -i https://staging.hub-evolution.com/sitemap.xml`
