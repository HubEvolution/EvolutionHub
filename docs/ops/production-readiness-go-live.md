---
description: 'Production-Readiness & Go-Live Review für Evolution Hub'
owner: 'Project Owner & Cascade EvolutionHub AI Agent'
priority: 'high'
lastSync: '2025-11-18'
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

#### P1 – Vor Go-Live

- [ ] Live-Preis-IDs (`PRICING_TABLE*`, `CREDITS_PRICING_TABLE`) final validiert (Testkauf in Staging/Testing).
- [ ] Webhook-Signatur-Key korrekt gesetzt; Negativ-Tests (falsche Signatur → `forbidden`).
- [ ] Happy-Path: Upgrade/Downgrade/Cancel, Credit-Buy, Refund-Flow manuell in Staging geprüft.

#### P2 – Kurz nach Go-Live

- [ ] Erweiterte E2E-Suite für Billing (Upgrade/Downgrade/Plan-Change inkl. Admin-Override-Flows).
- [ ] Zusätzliche Monitoring-Metriken: Stripe-Event-Rate, Webhook-Fehlerquote.

---

### 3.2 Credits & Entitlements

#### Ist-Stand (Kurz)

- Plan-basierte Entitlements für Image, Video, Voice, Web‑Eval, Webscraper + Guest-Entitlements.
- Credits (tenths) über KV-Packs (FIFO, idempotent), getrennt von Quoten (rolling 24h / Monat).

#### P1 – Vor Go-Live

- [ ] Staging-Tests: Entitlement-Grenzen für jede Tool-Kategorie (free/pro/premium/enterprise + guest) mit repräsentativen Nutzern verifiziert.
- [ ] Konsistenz-Check: `usage.limit` (Quota) vs. `limits.*` (UI-Hints) in API-Responses dokumentiert und konsistent.

#### P2 – Kurz nach Go-Live

- [ ] Zusätzliche Integrationstests für kombinierte Nutzung (Credits + Quota, Monatswechsel).

---

### 3.3 AI Image Enhancer

#### Ist-Stand (Kurz)

- Zod-validierte Inputs; Rate-Limits; Entitlements (Quota-then-Credits); R2-Storage (`uploads/`, `results/`), Errors gemappt.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Error-Pfade (429, Provider-Fehler, invalid files) vollständig.
- [ ] OpenAPI-Einträge (usage/generate, Fehlerformen, 429) finalisiert.

#### P2 – Kurz nach Go-Live

- [ ] UI-Gating gemäß Entitlements (`supportsScale`, `supportsFaceEnhance`) vollständig konsistent.

---

### 3.4 AI Video Enhancer

#### Ist-Stand (Kurz)

- Upload mit MIME/Size/Duration-Guards; Jobs + Polling; Credits in tenths; R2-Archivierung.

#### P1 – Vor Go-Live

- [ ] End-to-End-Test: Upload → Job → Result (pro Tier) in Staging mit echten Beispielvideos.
- [ ] Quota/Credits-Pfade (Monatsquote vs. Credits) je Plan einmal vollständig durchgespielt.

#### P2 – Kurz nach Go-Live

- [ ] Erweiterte Telemetrie (Job-Laufzeiten, Fehlerraten) + Alerts.

---

### 3.5 Prompt Enhancer

#### Ist-Stand (Kurz)

- Multipart/JSON-Schema, Zod-Validierung, CSRF, Rate-Limit; Plan-/Guest-Quoten über KV; PII-Safety; OpenAI-Unterstützung.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Quoten & Feature-Flags (`PROMPT_REWRITE_V1`, `PUBLIC_PROMPT_ENHANCER_V1`).
- [ ] OpenAPI-Abgleich (Felder, Fehlerformen, usage/limits) abgeschlossen.

#### P2 – Kurz nach Go-Live

- [ ] Zusätzliche Tests für Attachment-Handling (Bilder/PDFs) inkl. Fehlerfälle.

---

### 3.6 Web‑Eval (Testing/Evaluate)

#### Ist-Stand (Kurz)

- Task-Create-API mit Zod-Validierung, Prod-Gating (`WEB_EVAL_ENABLE_PROD`), SSRF-Guard, Rate-Limit, Usage-Endpoint.

#### P1 – Vor Go-Live

- [ ] Entitlement-Enforce bei Task-Erstellung verifiziert (oder ergänzt), d. h. Tasks werden nicht nur durch `webEvalTaskLimiter`, sondern auch owner-basiert begrenzt.
- [ ] SSRF-Tests (`validateTargetUrl`) für erlaubte vs. geblockte Origins in Testing/Prod.

#### P2 – Kurz nach Go-Live

- [ ] Monitoring-Dashboards für Web‑Eval-Fehlerquote + Timeouts.

---

### 3.7 Webscraper

#### Ist-Stand (Kurz)

- Starke SSRF-Guards (Schemes, Ports, IP-Literals, geblockte Domains, Self-Scrape-Block); Robots.txt-Respekt; rolling Usage.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Robots.txt-Verhalten (Disallow/Allow, keine/kaputte robots.txt).
- [ ] Klar definierte Fehlertypen (`robots_txt_blocked`, `validation_error`, `forbidden`) in OpenAPI dokumentiert.

#### P2 – Kurz nach Go-Live

- [ ] Evaluieren, ob zusätzliche DNS-/Redirect-basierte SSRF-Checks notwendig sind (oder Cloudflare-Sicherheitslage ausreichend ist) und Entscheidung dokumentieren.

---

### 3.8 Voice Visualizer & Transcriptor

#### Ist-Stand (Kurz)

- Multipart-Upload mit MIME- & Size-Guards; rolling Quoten; Dev-Echo-Mode; R2-Archivierung optional; OpenAI Whisper; Polling/SSE.

#### P1 – Vor Go-Live

- [ ] Integrationstests für Quoten & Flags (`VOICE_DEV_ECHO`, `VOICE_R2_ARCHIVE`, `VOICE_STREAM_SSE`, `VOICE_STREAM_POLL`).
- [ ] OpenAPI-Abgleich für `/api/voice/transcribe`, `/stream`, `/poll`, `/usage`.

#### P3 – Später

- [ ] Optional: MIME-Sniffing zusätzlich zu `file.type` einführen.

---

### 3.9 Admin Dashboard & Credits-Admin

#### Ist-Stand (Kurz)

- Admin-UI nutzt Admin-APIs via `admin/api-client` (CSRF, JSON, Retry); Credits-APIs (`grant/deduct/usage/history`) mit `requireAdmin` + Audit-Log; Metrics/Status/Audit-Logs admin-gegated.

#### P1 – Vor Go-Live

- [ ] Querschnitts-Review: Alle mutierenden Admin-APIs (`POST/PUT/PATCH/DELETE`) nutzen `withAuthApiMiddleware` **mit** CSRF (`enforceCsrfToken: true`).
- [ ] Integrationstests: Nicht-Admin-User erhalten `auth_error`/`forbidden` für `/api/admin/**`.

#### P2 – Kurz nach Go-Live

- [ ] Sicherstellen, dass alle relevanten Admin-Aktionen (Plan-Änderung, Ban/Unban/Delete, Credits, Discounts) Audit-Logs mit sinnvollen `eventType`, `resource`, `action` erzeugen.

---

### 3.10 Content, SEO & Infra

#### Ist-Stand (Kurz)

- Astro+Cloudflare Worker; Middleware mit CSP, Locale/Welcome-Gate, Admin-/Dashboard-Gates; `sitemap.xml` dynamisch aus `PUBLIC_SITE_URL` + Blog; `robots.txt` blockiert Admin/Auth/JSON.

#### P1 – Vor Go-Live

- [ ] Env-Consistency-Check: `src/env.d.ts` ↔ `wrangler.toml` ↔ tatsächliche Nutzung (alle benötigten Variablen pro Env verfügbar oder bewusst optional).
- [ ] Staging-Validation: `robots.txt` + `sitemap.xml` via Google Search Console / PSI-Sitemap-Script geprüft.

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
