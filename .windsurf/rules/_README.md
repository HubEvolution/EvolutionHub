# Windsurf Rules Index

> **Letzte Aktualisierung:** 2025-11-13  
> **Maintainer:** Architecture Team  
> **Status:** 🟢 19 aktive Rules | 🟡 8 geplante Rules

Alle projektspezifischen Regeln für KI-Assistenten und Entwickler in diesem Repository.

## Schnellstart

### Für KI-Agenten

1. **Starte mit Root:** Lies [`/AGENTS.md`](../../AGENTS.md) zuerst
2. **Folge der Kaskade:** Root → Feature-spezifische Rules → Lokale AGENTS.md
3. **Nutze Cross-References:** Beachte `extends:` Angaben für Dependencies
4. **Prüfe Changelog:** Aktuelle Änderungen am Ende jeder Rule

### Für Entwickler

- **Neue Features:** Erstelle dedizierte Rule-Datei (siehe [Template](#template))
- **Änderungen:** Aktualisiere Changelog in betroffenen Rules
- **Review:** Prüfe Cross-References und Code-Anker
- **CI:** Rules-Quality-Checks laufen automatisch (geplant)

## Übersicht

### Nach Kategorie

| Kategorie               | Anzahl | Dateien                                                                                                                 |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Core Infrastructure** | 4      | api-and-security, auth, infra, project-structure                                                                        |
| **Feature-Specific**    | 6      | image-enhancer, video-enhancer, transcriptor, prompt, scraper, pricing                                                  |
| **Quality & Tooling**   | 6      | testing-and-ci, tooling-and-style, zod-openapi, docs-documentation, agentic-workflow, cascade-hooks                     |
| **Cross-Cutting**       | 3      | cookies-and-consent, content, (prompt)                                                                                  |
| **Geplant (Phase 1-2)** | 8      | database-migrations, caching-kv, email-notifications, background-jobs, observability, frontend-state, i18n, performance |

### Nach Priorität

| Priorität       | Scope             | Status     | Dateien                                                                                                 |
| --------------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| 🔴 **Critical** | Core, Infra       | ✅ Aktiv   | api-and-security, auth, testing-and-ci                                                                  |
| 🟠 **High**     | Features, Quality | ✅ Aktiv   | pricing, image-enhancer, video-enhancer, infra, tooling-and-style, zod-openapi                          |
| 🟡 **Medium**   | Features, Docs    | ✅ Aktiv   | transcriptor, prompt, scraper, docs-documentation, agentic-workflow, cookies-and-consent, cascade-hooks |
| 🟢 **Low**      | Content           | ⚠️ Minimal | content                                                                                                 |

## Vollständige Rules-Liste

### Core Infrastructure

#### [api-and-security.md](./api-and-security.md) 🔴 Critical

- **Zweck:** Middleware, Security-Header, CSRF/Same-Origin, JSON-Error-Shapes
- **Extends:** -
- **Last Update:** 2025-11-03
- **Status:** ✅ Vollständig (79 Zeilen)
- **Key Points:**
  - `withApiMiddleware` / `withAuthApiMiddleware` verpflichtend
  - Same-Origin für unsafe Methods (POST/PUT/PATCH/DELETE)
  - Double-Submit CSRF für sensible Endpunkte (`X-CSRF-Token` == Cookie `csrf_token`)
  - Security-Header: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
  - `/r2-ai/**` bleibt öffentlich und ungated

#### [auth.md](./auth.md) 🔴 Critical

- **Zweck:** Auth-Flows (Magic Link/OAuth), PKCE, Session-Cookies, 410-Stubs
- **Extends:** -
- **Last Update:** 2025-10-31
- **Status:** ✅ Vollständig (70 Zeilen)
- **Key Points:**
  - `__Host-session` Cookie (HttpOnly, Secure, SameSite=Strict, Path=/)
  - PKCE-Flow: `pkce_verifier` Cookie + `pkce_code_challenge` an Provider
  - Deprecated Endpoints als 410-Stubs (HTML für Hauptmethode, JSON für andere)
  - `X-Stytch-Request-Id` in Auth-Callback-Responses

#### [infra.md](./infra.md) 🟠 High

- **Zweck:** Worker-Config, Bindings, Middleware, Assets-Serving
- **Extends:** -
- **Last Update:** 2025-10-31
- **Status:** ⚠️ Minimal (36 Zeilen) - **Erweiterung geplant (Phase 1)**
- **Key Points:**
  - `wrangler.toml` Bindings (D1/KV/R2; optional AI)
  - Security-Header via Middleware
  - `/r2-ai/**` öffentlich
  - `.assetsignore` schließt `_worker.js` aus
- **Gaps:** Bindings-Zugriff, Edge-Caching, Deployment-Strategien fehlen

#### [project-structure.md](./project-structure.md) 🟠 High

- **Zweck:** Ordnerstruktur, Pfade, Aliase, Build-Artefakte
- **Extends:** -
- **Last Update:** 2025-11-03
- **Status:** ✅ Vollständig (40 Zeilen)
- **Key Points:**
  - `src/` Runtime-Root, `src/pages/api/**` Server-Handler
  - R2-Proxy: `src/pages/r2/**` und `src/pages/r2-ai/**` (öffentlich)
  - Tests: `tests/unit`, `tests/integration`, `test-suite-v2/src/e2e`
  - Aliase: `@/*` (kein `~/*`)

### Feature-Specific Rules

#### [pricing.md](./pricing.md) 🟠 High

- **Zweck:** Stripe-Integration, Webhooks, Plans/Entitlements, Admin-APIs
- **Extends:** api-and-security, zod-openapi
- **Last Update:** 2025-11-02
- **Status:** ✅ Vollständig (88 Zeilen)
- **Key Points:**
  - Webhook-Signaturprüfung strikt, Idempotency beachten
  - `users.plan` via Webhook/Sync setzen (Source of Truth)
  - Admin Set-Plan orchestriert Stripe (kein direktes DB-Update)
  - Price-Mapping: `PRICING_TABLE`, `PRICING_TABLE_ANNUAL`
- **Gaps:** Refund-Flows nicht dokumentiert

#### [image-enhancer.md](./image-enhancer.md) 🟠 High

- **Zweck:** AI Image (Workers AI + Replicate), Provider-Gating, Quoten, R2
- **Extends:** -
- **Last Update:** 2025-10-31
- **Status:** ✅ Vollständig (61 Zeilen)
- **Key Points:**
  - Testing/Local: Replicate serverseitig verboten (403)
  - R2-Ablage: `/r2-ai/**` öffentlich
  - Rate-Limits: `aiGenerateLimiter` (15/min), `aiJobsLimiter` (10/min)
  - Zod-Validierung strikt
- **Gaps:** Cost-Tracking fehlt

#### [video-enhancer.md](./video-enhancer.md) 🟠 High

- **Zweck:** Video-Upscaling (Replicate), Upload-Guardrails, Quoten/Kredite, R2
- **Extends:** -
- **Last Update:** 2025-11-05
- **Status:** ✅ Vollständig (84 Zeilen)
- **Key Points:**
  - Form-Data: `file`, `tier`, `durationMs` via `videoUploadSchema`
  - MIME-Allowlist: video/mp4, video/quicktime, video/webm
  - Kredite: tenths-basiert, idempotent per Job-ID
  - Job-Polling: Eigentum validieren (Session vs. `guest_id`)

#### [transcriptor.md](./transcriptor.md) 🟡 Medium

- **Zweck:** Whisper-Transkription, Multipart-Upload, Quoten, Rate-Limits
- **Extends:** -
- **Last Update:** 2025-10-31
- **Status:** ✅ Vollständig (63 Zeilen)
- **Key Points:**
  - Multipart-Upload, MIME-Allowlist (audio/mpeg, audio/wav, audio/webm)
  - Rate-Limit: `voiceTranscribeLimiter` (15/min)
  - Permissions-Policy (microphone) nur auf Tool-Seiten
- **Gaps:** SSE/Poll für Streaming (Phase 2+)

#### [prompt.md](./prompt.md) 🟡 Medium

- **Zweck:** Prompt-Enhance-API, Validierung, Same-Origin/CSRF, Quoten
- **Extends:** -
- **Last Update:** 2025-10-31
- **Status:** ✅ Vollständig (59 Zeilen)
- **Key Points:**
  - Same-Origin + Double-Submit CSRF für POST
  - Zod-Schemas: `src/lib/validation/schemas/prompt.ts`
  - Rate-Limit: `apiRateLimiter` oder strenger
- **Gaps:** PII-Filter in Validation fehlen

#### [scraper.md](./scraper.md) 🟡 Medium

- **Zweck:** Webscraper mit SSRF-Schutz, Netz-/Inhalts-Guardrails, Rate-Limits
- **Extends:** -
- **Last Update:** 2025-10-31
- **Status:** ✅ Vollständig (66 Zeilen)
- **Key Points:**
  - SSRF-Schutz: Private/Link-Local/Loopback IPs blockieren
  - Port-Allowlist (80/443), Timeout/Max-Size
  - Content-Type Allowlist (text/html, text/plain, application/json)
- **Gaps:** Robots.txt-Respekt dokumentieren

### Quality & Tooling

#### [testing-and-ci.md](./testing-and-ci.md) 🔴 Critical

- **Zweck:** Unit/Integration/E2E-Tests, Coverage, OpenAPI-Validation, CI-Gates
- **Extends:** -
- **Last Update:** 2025-11-12
- **Status:** ✅ Vollständig (72 Zeilen)
- **Key Points:**
  - Test-JSON-Parsing: `safeParseJson<ApiJson>()` (kein direktes `JSON.parse`)
  - V8 Coverage ≥ 70% für `src/**/*.{ts,tsx}`
  - Stripe-Tests env-guarded
  - Hygiene-Reports: `reports/lint.txt`, `reports/astro-check.txt`, etc.

#### [tooling-and-style.md](./tooling-and-style.md) 🟠 High

- **Zweck:** TypeScript strict, ESLint, Prettier, Astro-Linting
- **Extends:** -
- **Last Update:** 2025-11-12
- **Status:** ✅ Vollständig (73 Zeilen)
- **Key Points:**
  - `@typescript-eslint/no-explicit-any`: error in `src/**/*.{ts,tsx}`, warn in `.astro`/`tests`
  - Astro-Plugin aktiv: `plugin:astro/recommended`
  - Prettier: 2 spaces, single quotes, width 100
  - `.prettierignore` enthält `tests/performance/README.md`

#### [zod-openapi.md](./zod-openapi.md) 🟠 High

- **Zweck:** Hybrid-Ansatz Zod↔OpenAPI, Drift minimieren, Pilot/Diff
- **Extends:** -
- **Last Update:** 2025-10-31
- **Status:** ✅ Vollständig (44 Zeilen)
- **Key Points:**
  - Zentrale Zod-Schemas, OpenAPI kuratiert
  - Kein Auto-Overwrite der `openapi.yaml`
  - `.strict()` → `additionalProperties: false`
  - Pilot/Diff: `npm run openapi:zod:pilot|diff`

#### [docs-documentation.md](./docs-documentation.md) 🟡 Medium

- **Zweck:** Docs-Standards, Frontmatter, Struktur, Link-Checks, Changelog
- **Extends:** -
- **Last Update:** 2025-11-06
- **Status:** ✅ Vollständig (61 Zeilen)
- **Key Points:**
  - Frontmatter: `description`, `owner`, `priority`, `lastSync`, `codeRefs`, `testRefs`
  - Kategorien: architecture, development, frontend, security, testing, ops
  - Relative Links (`./`), funktionierende Anker
  - Archiv: `docs/archive/` (nicht verlinkt aus aktiven Docs)

#### [agentic-workflow.md](./agentic-workflow.md) 🟡 Medium

- **Zweck:** Agent-Arbeitsablauf, Planung, Freigabe, SOP (Standard Operating Procedure)
- **Extends:** -
- **Last Update:** 2025-11-12
- **Status:** ✅ Vollständig (96 Zeilen)
- **Key Points:**
  - Planungspflicht vor Umsetzung (Ziele, Ansatz, Risiken, Alternativen)
  - Beleg-/Kontextpflicht (Code-Recherche über Fast Context → grep/read)
  - Freigabepflicht vor Datei-Änderungen
  - 10-Schritte-SOP: Ziel → Kontext → Constraints → Entwurf → Freigabe → Umsetzung → Verifikation → Docs → Handover → Follow-ups

#### [cascade-hooks.md](./cascade-hooks.md) 🟡 Medium

- **Zweck:** Windsurf Cascade Hooks Integration, automatische Quality Gates und Security Controls
- **Extends:** tooling-and-style, testing-and-ci
- **Last Update:** 2025-11-13
- **Status:** ✅ Vollständig (316 Zeilen)
- **Key Points:**
  - Workspace-level hooks in `.windsurf/hooks.json`
  - Pre-read hooks für Security (blockieren sensible Dateien)
  - Post-write hooks für Auto-Lint/Format/TypeCheck
  - Post-command hooks für Audit-Logging
  - Integration mit bestehendem Hygiene-Workflow

### Cross-Cutting Concerns

#### [cookies-and-consent.md](./cookies-and-consent.md) 🟡 Medium

- **Zweck:** GDPR-Consent, CookieConsent v3, Event-Bridge, Analytics-Gating
- **Extends:** api-and-security, auth, project-structure
- **Last Update:** 2025-11-03
- **Status:** ✅ Vollständig (76 Zeilen)
- **Key Points:**
  - CookieConsent v3 in BaseLayout initialisiert
  - Event-Bridge: `cookieconsent:userpreferencesset` dispatcht
  - Analytics-Gating: Provider nur nach `analytics=true` laden
  - Fallback: localStorage + manuelles Event
  - Consent-UI: Speichern, Alle akzeptieren, Alle ablehnen, Zurücksetzen

#### [content.md](./content.md) 🟢 Low

- **Zweck:** Content Collections, Locales, Pages consuming Content
- **Extends:** -
- **Last Update:** N/A
- **Status:** ⚠️ Minimal (20 Zeilen) - **Erweiterung geplant (Phase 2)**
- **Key Points:**
  - Schema: `src/content/config.ts`, Types: `src/content/types.ts`
  - Structure per project-structure, Style/Tooling gelten
  - Kein PII/Secrets in Content
- **Gaps:** Collections, Frontmatter-Standards, Slug-Generierung fehlen

## Dependency-Graph

```
api-and-security.md (Basis für alle API-Rules)
  ├─ auth.md
  ├─ pricing.md
  │   └─ zod-openapi.md
  ├─ image-enhancer.md
  ├─ video-enhancer.md
  ├─ transcriptor.md
  ├─ prompt.md
  ├─ scraper.md
  └─ cookies-and-consent.md
      ├─ auth.md
      └─ project-structure.md

zod-openapi.md (Basis für Validation)
  └─ pricing.md
      └─ [alle Feature-APIs]

testing-and-ci.md (Basis für alle Tests)
  └─ [alle Features mit Tests]

infra.md (Basis für Worker/Edge)
  └─ project-structure.md

tooling-and-style.md (Basis für Code-Qualität)
  ├─ cascade-hooks.md
  └─ [gesamter Codebase]

testing-and-ci.md (Basis für alle Tests)
  ├─ cascade-hooks.md
  └─ [alle Features mit Tests]

docs-documentation.md (Basis für Docs)
  └─ [docs/**]

agentic-workflow.md (Basis für Agent-Prozesse)
  └─ [alle Agenten-Tätigkeiten]
```

## Geplante Erweiterungen

### Phase 1: Kritische Lücken (Woche 1-2) 🔴

| Rule                     | Priorität | Status     | Owner   |
| ------------------------ | --------- | ---------- | ------- |
| `database-migrations.md` | Critical  | 🔴 Fehlt   | DevOps  |
| `caching-kv.md`          | High      | 🔴 Fehlt   | Backend |
| `email-notifications.md` | High      | 🔴 Fehlt   | Backend |
| `background-jobs.md`     | High      | 🔴 Fehlt   | DevOps  |
| `observability.md`       | High      | 🔴 Fehlt   | SRE     |
| `infra.md` (Erweiterung) | High      | ⚠️ Minimal | DevOps  |

### Phase 2: Erweiterte Rules (Woche 3-4) 🟡

| Rule                       | Priorität | Status     | Owner       |
| -------------------------- | --------- | ---------- | ----------- |
| `content.md` (Erweiterung) | Medium    | ⚠️ Minimal | Content     |
| `frontend-state.md`        | Medium    | 🔴 Fehlt   | Frontend    |
| `i18n.md`                  | Medium    | 🔴 Fehlt   | i18n-Team   |
| `performance.md`           | Medium    | 🔴 Fehlt   | Performance |

### Phase 3: Strukturelle Optimierung (Woche 5-6) 🟢

- [ ] Rules-Index (dieses Dokument) finalisieren
- [ ] Frontmatter-Standardisierung (Template + Script)
- [ ] Rules-Linting (`npm run rules:lint`)
- [ ] Cross-Reference-Validation (`npm run rules:validate`)
- [ ] Coverage-Report (`npm run rules:coverage`)
- [ ] CI-Integration für Rules-Quality-Checks

## Konventionen

### Frontmatter (Standard)

```yaml
---
trigger: always_on # required (immer aktiv für Agenten)
scope: core|feature|infra|quality|cross-cutting # optional (empfohlen)
priority: critical|high|medium|low # optional (empfohlen)
extends: # optional (Dependencies)
  - ../relative/path.md
lastUpdate: YYYY-MM-DD # optional (empfohlen)
maintainer: team-name # optional
---
```

### Struktur-Template {#template}

Siehe [Anhang B im Analyse-Report](../../docs/architecture/configuration-analysis-2025-11-12.md#b-vorgeschlagene-template-struktur) für vollständiges Template.

**Mindest-Struktur:**

```markdown
# [Feature/Area] Rules

## Zweck

Kurze Beschreibung (1-2 Sätze).

## Muss

- Verpflichtende Anforderungen (Bullet-Points)

## Sollte

- Empfohlene Best Practices

## Nicht

- Verbotene Patterns

## Checkliste

- [ ] Requirement 1
- [ ] Requirement 2

## Code-Anker

- `src/path/to/code.ts`
- `tests/path/to/tests.ts`

## CI/Gates

- `npm run command`

## Referenzen

- Verwandte Rules (relative Links)

## Changelog

- YYYY-MM-DD: Änderung
```

## Verwendung

### Für neue Features

1. **Prüfe Scope:** Feature-spezifisch → neue Rule in `.windsurf/rules/`
2. **Template nutzen:** Kopiere Struktur aus [Anhang B](../../docs/architecture/configuration-analysis-2025-11-12.md#b-vorgeschlagene-template-struktur)
3. **Extends setzen:** Mindestens `api-and-security.md` für APIs
4. **Code-Anker:** Verlinke relevante Dateien
5. **Changelog:** Initiale Version datieren
6. **Update Index:** Füge Rule in diesem README hinzu
7. **PR:** Mit `[RULES]` Prefix, mindestens 1 Tech-Lead-Approval

### Für Rule-Änderungen

1. **Changelog pflegen:** Neue Zeile mit Datum + Änderung
2. **lastUpdate aktualisieren:** Im Frontmatter
3. **Cross-References prüfen:** Extends/Referenzen aktuell?
4. **Code-Anker validieren:** Pfade noch korrekt?
5. **CI/Gates anpassen:** Falls neue Commands
6. **PR:** Mit `[RULES]` Prefix im Titel

### Für Deprecation

1. **2-Wochen-Notice:** Im Changelog ankündigen
2. **Migration-Guide:** Als Issue mit Label `rules-deprecation`
3. **Team-Discussion:** Auswirkungen klären
4. **Archiv-Move:** Nach Deprecation nach `.windsurf/rules/archive/`
5. **Index-Update:** Status auf `🔴 Deprecated` setzen

## Tools & Automation (Roadmap)

```json
// package.json (geplant)
{
  "scripts": {
    "rules:lint": "tsx scripts/rules-lint.ts",
    "rules:validate": "tsx scripts/rules-validate-refs.ts",
    "rules:coverage": "tsx scripts/rules-coverage.ts",
    "rules:frontmatter": "tsx scripts/rules-frontmatter-update.ts",
    "rules:check": "run-s rules:lint rules:validate",
    "rules:report": "run-s rules:coverage"
  }
}
```

**Geplante Checks:**

- **Lint:** Frontmatter vollständig, Changelog vorhanden, Strukturelemente (Muss/Sollte/Nicht)
- **Validate:** Cross-References gültig, Code-Anker existieren, keine zirkulären Dependencies
- **Coverage:** Welche Features/Code-Bereiche ohne Rules, veraltete Rules (lastUpdate > 6 Monate)

## Weitere Ressourcen

- **Analyse-Report:** [docs/architecture/configuration-analysis-2025-11-12.md](../../docs/architecture/configuration-analysis-2025-11-12.md)
- **Root AGENTS.md:** [/AGENTS.md](../../AGENTS.md)
- **Workflows:** [.windsurf/workflows/](../workflows/)
- **CI/CD:** [.github/workflows/](../../.github/workflows/)

## Kontakt & Maintenance

- **Architecture Team:** Verantwortlich für Core/Infra Rules
- **Feature-Owner:** Pflegen Feature-spezifische Rules
- **DevOps:** Infra/CI-Rules aktuell halten
- **QA:** Testing-Rules validieren

**Fragen/Feedback:** Erstelle ein Issue mit Label `rules-feedback` oder kontaktiere das Architecture Team.

---

**Version:** 1.0  
**Erstellt:** 2025-11-12  
**Nächste Review:** 2025-12-12
