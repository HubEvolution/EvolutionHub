---
description: 'Zentrale Übersicht über Feature- und Env-Flags (Tools, Billing, UI)'
owner: 'Project Owner & Cascade EvolutionHub AI Agent'
priority: 'medium'
lastSync: '2025-12-09'
codeRefs: 'wrangler.toml, .env.example, src/utils/feature-flags.ts, src/lib/services/**, src/pages/api/**'
testRefs: 'tests/**, test-suite-v2/**'
---

# Feature-Flags & Env-Gating

Dieses Dokument bündelt die wichtigsten Feature- und Env-Flags, die das Verhalten von Tools,
Billing und UI steuern. Ziel ist eine **klare Matrix pro Environment** (development/testing/
staging/production) als Grundlage für Go-Live-Entscheidungen.

## Grundprinzipien

- **PUBLIC_***
  - sind Client-Flags (Astro `import.meta.env.PUBLIC_*`), steuern UI/UX.
  - keine sicherheitskritischen Entscheidungen nur über PUBLIC-Flags treffen.
- **Server-Flags** (ohne `PUBLIC_`)
  - steuern Provider, Kosten, Risiken (Web-Eval, Webscraper, Voice, Billing, Credits).
  - Default-Werte werden in `wrangler.toml` pro Env gesetzt.
- **Prod ist konservativ**
  - Experimentelle / kostenintensive Features sind nur bewusst aktiv.
  - Debug-/Dev-Hilfen sind in Production deaktiviert.

## Status & Visibility

Die **funktionale Verfügbarkeit** eines Tools wird gemeinsam über **Status**, **Cohorts** und
Flags gesteuert:

- **Status** (siehe `docs/ops/tool-launch-matrix.md`)
  - `incubating` – intern / Lab; UI standardmäßig ausgeblendet, API nur für C0/C1.
  - `beta` – eingeschränkter Rollout; UI nur für definierte Cohorts sichtbar, strenge Limits.
  - `ga` – General Availability; regulär sicht- und nutzbar (weiterhin per Flags rollbar).
  - `deprecated` – wird aus der Haupt-UX entfernt; Flags/Routes bleiben nur für Übergänge.
- **Flags**
  - PUBLIC-Flags steuern primär **Sichtbarkeit** (z. B. Prompt-, Image-, Video-Tools im UI).
  - Server-Flags steuern **Provider-/Kosten-Gating** (z. B. WORKERS_AI_ENABLED, ENABLE_*).
- **Tools (Auszug)**
  - Prompt Enhancer, AI Image Enhancer und AI Video Enhancer nutzen diese Kombination,
    um unfertige oder verschobene Varianten für Endkund:innen vollständig auszublenden und
    erst bei explizitem Status-/Flag-Wechsel sichtbar/nutzbar zu machen.

## Flag-Matrix (Kernfeatures)

### Landing & UI

| Feature        | Flag                      | Dev        | Testing    | Staging    | Production | Kommentar                                  |
|---------------|---------------------------|-----------:|-----------:|-----------:|-----------:|---------------------------------------------|
| Landing V2    | PUBLIC_LANDING_V2         | on         | on         | on         | on         | Standard-Variant immer aktiv                |
| Landing BG    | PUBLIC_LANDING_BG_VARIANT | techcells  | techcells  | techcells  | techcells  | Nur Optik (lattice/techcells/off)          |
| Tools-Filter  | PUBLIC_TOOLS_FILTER       | on         | on         | on         | on         | UX-only (Suche/Filter in Tools-Liste)      |
| Debug Panel   | PUBLIC_ENABLE_DEBUG_PANEL | on         | on         | on         | off        | Prod: Debug-Overlay strikt aus (`.env.prod`)|

### Web-Eval

| Feature        | Flag                     | Dev   | Testing | Staging | Production | Kommentar                                                   |
|---------------|--------------------------|------:|--------:|--------:|-----------:|-------------------------------------------------------------|
| Task-Create   | WEB_EVAL_ENABLE_PROD     | n/a   | n/a     | n/a     | on         | Prod: Task-Erstellung bewusst erlaubt                      |
| Executor      | WEB_EVAL_EXEC_ALLOW_PROD | n/a   | n/a     | n/a     | on         | Prod: Executor-Routen bewusst erlaubt                      |
| Browser-Run   | WEB_EVAL_BROWSER_ENABLE  | off   | off     | on      | off        | Cloudflare Browser Rendering nur in Staging                |
| Browser-Prod  | WEB_EVAL_BROWSER_ALLOW_PROD | 0  | 0       | 0       | 1          | Prod nur mit internem Header + Flag                        |
| SSRF-Origins  | WEB_EVAL_ALLOWED_ORIGINS | leer | CI-Host | staging+www | www+non-www | SSRF-Allowlist pro Env, in Prod auf Domains beschränkt |
| Auto-Asserts  | WEB_EVAL_AUTO_ASSERTIONS_ENABLE | on | on | on | on | Env-gated, Low-Risk, bereits getestet                      |

### Prompt-Enhancer

| Feature         | Flag                   | Dev | Testing | Staging | Production | Kommentar                                         |
|----------------|------------------------|----:|--------:|--------:|-----------:|---------------------------------------------------|
| Public API     | PUBLIC_PROMPT_ENHANCER_V1 | on | on   | on     | on         | API öffentlich verfügbar (Feature-Gate im Code)  |
| Safety         | ENABLE_PROMPT_SAFETY   | on  | on      | on      | on         | Nie in Prod deaktivieren                          |
| Rewrite        | PROMPT_REWRITE_V1      | on  | on      | on      | on         | Rewrite/Normalisierung aktiv                      |
| Metrics        | PROMPT_METRICS_V1      | off | on      | on      | on         | Telemetrie pro Env konfigurierbar                |

### Webscraper

| Feature     | Flag                | Dev | Testing | Staging | Production | Kommentar                                            |
|------------|---------------------|----:|--------:|--------:|-----------:|------------------------------------------------------|
| Public API | PUBLIC_WEBSCRAPER_V1| on  | on      | on      | on         | Feature-Gate (`forbidden` wenn `"false"`)          |
| Limits     | WEBSCRAPER_GUEST_LIMIT / WEBSCRAPER_USER_LIMIT | hoch | realistisch | realistisch | konservativ | Quoten je Env, in `.env` justierbar |

### Voice (Transcriptor/Visualizer)

| Feature        | Flag               | Dev | Testing | Staging | Production | Kommentar                                       |
|---------------|--------------------|----:|--------:|--------:|-----------:|-----------------------------------------------|
| Streaming SSE | VOICE_STREAM_SSE   | on  | on      | on      | off        | Prod aktuell ohne Streaming                    |
| Streaming Poll| VOICE_STREAM_POLL  | on  | on      | on      | off        |                                               |
| R2-Archiv     | VOICE_R2_ARCHIVE   | 0   | 0       | 0       | 0          | Archiv erst in späterer Phase aktivieren      |

### AI-Image / Video Enhancer

| Feature           | Flag                        | Dev | Testing | Staging | Production | Kommentar                                                |
|------------------|-----------------------------|----:|--------:|--------:|-----------:|----------------------------------------------------------|
| Workers AI       | WORKERS_AI_ENABLED          | on  | on      | on      | off        | Cloudflare Workers AI; in Prod derzeit deaktiviert      |
| Testing AI-Only  | TESTING_WORKERS_AI_ALLOW    | n/a | on      | n/a     | n/a        | In Testing nur ausgewählte CF-Modelle, Replicate off    |
| Enhancer Mode    | PUBLIC_ENHANCER_MVP_MODE    | 0   | 1       | 1       | 1          | Neuer Enhancer-Fluss aktiv                              |
| Legacy Mode      | PUBLIC_ENHANCER_LEGACY_MODE | 1   | 1       | 1       | 0          | Legacy-Ansicht in Prod abgeschaltet                     |
| Video-API Gate   | ENABLE_VIDEO_ENHANCER       | 1   | 1       | 1       | 1          | Gemeinsames Flag für Video-Enhancer (UI + API)          |

### Billing / Credits

| Feature          | Flag                    | Dev | Testing | Staging | Production | Kommentar                                                  |
|-----------------|-------------------------|----:|--------:|--------:|-----------:|------------------------------------------------------------|
| Credits-CTA     | PUBLIC_ENABLE_CREDITS_CTA | 0 | 1      | 1      | 1          | "Buy Credits" CTA im UI sichtbar                        |
| Usage UI        | BILLING_USAGE_OVERVIEW_V2 | 1 | 1      | 1      | 1          | Neue Billing/Usage-Übersicht aktiv                         |
| Usage Storage   | USAGE_KV_V2             | 1   | 1       | 1       | 1          | Neue Usage-Storage-Pfade aktiv                             |
| Referral        | ENABLE_REFERRAL_REWARDS | 1   | 1       | 1       | 1          | Referral-Rewards-Funktion aktiv                            |
| Referral Amount | REFERRAL_REWARD_TENTHS  | 500 | 500     | 500     | 500        | Reward-Höhe (Zehntel-Credits)                              |
| Admin Grants    | INTERNAL_CREDIT_GRANT   | 1   | 1       | 1       | 0 (Ziel)   | Admin-Credit-Grants temporär; Prod idealerweise wieder 0  |

### Auth / Stytch / Debug

| Feature          | Flag             | Dev | Testing | Staging | Production | Kommentar                                          |
|-----------------|------------------|----:|--------:|--------:|-----------:|----------------------------------------------------|
| Auth-Provider   | AUTH_PROVIDER    | stytch | stytch | stytch | stytch   | Einheitlicher Provider                             |
| PKCE            | STYTCH_PKCE      | 0   | 0       | 0       | 0         | PKCE derzeit aus (per Env steuerbar)              |
| Dev-Bypass      | STYTCH_BYPASS    | 1   | 0       | 0       | 0         | Nur Dev                                            |
| E2E-Fake        | E2E_FAKE_STYTCH  | 1   | 0       | 0       | 0         | Nur Dev/Tests                                      |

## Nutzung im Go-Live-Prozess

- **Vor jedem Prod-Deploy**:
  - Diese Matrix kurz mit `wrangler.toml [env.*.vars]` und `.env.*` abgleichen.
  - Speziell prüfen:
    - `PUBLIC_ENABLE_DEBUG_PANEL` in Prod: **muss aus**.
    - Web-Eval: Flags wie gewünscht? (Tasks/Exec on, Browser-Runner off).
    - `PUBLIC_WEBSCRAPER_V1` & Limits: passen zu Risiko-Appetit?
    - `INTERNAL_CREDIT_GRANT`: nur aktiv, wenn dringend benötigt.
- **Tests**:
  - Für wichtige Gates existieren (oder sollten existieren) Integrationstests, die
    bei deaktiviertem Flag `forbidden`/`disabled_in_production` erwarten.

## Offene Punkte / Weiterführung

- Feintuning der Webscraper-Limits je Env (insb. Production) nach realem Traffic.
- Entscheidung, wann Voice-Streaming (SSE/Poll) in Staging/Prod aktiv getestet
  und ggf. live geschaltet wird.
- Langfristig: Historische Flags (z.B. alte MVP-/Legacy-Modi) regelmäßig aufräumen
  und aus Code/Config entfernen, sobald sie nicht mehr gebraucht werden.
