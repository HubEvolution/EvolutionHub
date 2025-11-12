---
description: Umfassende Analyse der projektspezifischen Konfigurationen mit Lücken und Verbesserungsvorschlägen
owner: architecture
priority: high
lastSync: 2025-11-12
codeRefs:
  - .windsurf/rules/*.md
  - AGENTS.md
  - .codex/config.toml
  - package.json
testRefs: N/A
---

# Projektspezifische Konfigurations-Analyse 2025-11-12

## Executive Summary

Diese Analyse untersucht die projektspezifischen Konfigurationen des EvolutionHub-Repositories, mit besonderem Fokus auf `.windsurf/rules/`, AGENTS.md-Dateien und verwandte Konfigurationen. Das Projekt verfügt über eine **solide Grundlage** mit 18 spezialisierten Rules-Dateien, klaren Sicherheitsstandards und konsistenten Konventionen.

**Status:** 🟢 Sehr gut strukturiert | 🟡 Mittlere Verbesserungspotenziale | 🔴 Kritische Lücken

## Inhaltsverzeichnis

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [1. Bestandsaufnahme](#1-bestandsaufnahme)
  - [1.1 Vorhandene Rules-Dateien](#11-vorhandene-rules-dateien)
    - [Core Infrastructure (4 Dateien)](#core-infrastructure-4-dateien)
    - [Feature-Specific (6 Dateien)](#feature-specific-6-dateien)
    - [Quality & Tooling (5 Dateien)](#quality--tooling-5-dateien)
    - [Cross-Cutting (3 Dateien)](#cross-cutting-3-dateien)
  - [1.2 AGENTS.md Hierarchie](#12-agentsmd-hierarchie)
  - [1.3 Weitere Konfigurationen](#13-weitere-konfigurationen)
    - [.codex/config.toml](#codexconfigtoml)
    - [Package.json Scripts](#packagejson-scripts)
    - [CI/CD Workflows (.github/workflows/)](#cicd-workflows-githubworkflows)
- [2. Gap-Analyse](#2-gap-analyse)
  - [2.1 Fehlende Feature-spezifische Rules](#21-fehlende-feature-spezifische-rules)
    - [🔴 Kritisch: Fehlende Rules](#-kritisch-fehlende-rules)
    - [🟡 Mittel: Unterrepräsentierte Bereiche](#-mittel-unterrepr%C3%A4sentierte-bereiche)
  - [2.2 Unvollständige Cross-References](#22-unvollst%C3%A4ndige-cross-references)
    - [Beispiele:](#beispiele)
  - [2.3 Inkonsistenzen in der Dokumentation](#23-inkonsistenzen-in-der-dokumentation)
    - [Frontmatter-Unterschiede](#frontmatter-unterschiede)
    - [Changelog-Pflege](#changelog-pflege)
  - [2.4 Fehlende Integrations-Guidelines](#24-fehlende-integrations-guidelines)
  - [2.5 Unklare Scope-Definitionen](#25-unklare-scope-definitionen)
- [3. Verbesserungsvorschläge](#3-verbesserungsvorschl%C3%A4ge)
  - [3.1 Neue Rules-Dateien (Priorität: Hoch)](#31-neue-rules-dateien-priorit%C3%A4t-hoch)
    - [1. `database-migrations.md`](#1-database-migrationsmd)
    - [2. `caching-kv.md`](#2-caching-kvmd)
    - [3. `email-notifications.md`](#3-email-notificationsmd)
    - [4. `background-jobs.md`](#4-background-jobsmd)
    - [5. `observability.md`](#5-observabilitymd)
  - [3.2 Erweiterte Bestehende Rules (Priorität: Mittel)](#32-erweiterte-bestehende-rules-priorit%C3%A4t-mittel)
    - [1. `infra.md` erweitern](#1-inframd-erweitern)
    - [2. `content.md` erweitern](#2-contentmd-erweitern)
  - [3.3 Strukturelle Verbesserungen (Priorität: Mittel)](#33-strukturelle-verbesserungen-priorit%C3%A4t-mittel)
    - [1. Rules-Index erstellen](#1-rules-index-erstellen)
    - [2. AGENTS.md für fehlende Bereiche](#2-agentsmd-f%C3%BCr-fehlende-bereiche)
    - [3. Frontmatter-Standardisierung](#3-frontmatter-standardisierung)
  - [3.4 Dokumentations-Optimierungen (Priorität: Niedrig)](#34-dokumentations-optimierungen-priorit%C3%A4t-niedrig)
    - [1. Rules-Linting](#1-rules-linting)
    - [2. Automated Cross-Reference-Check](#2-automated-cross-reference-check)
    - [3. Rules-Coverage-Report](#3-rules-coverage-report)
- [4. Implementierungs-Roadmap](#4-implementierungs-roadmap)
  - [Phase 1: Kritische Lücken schließen (Woche 1-2)](#phase-1-kritische-l%C3%BCcken-schlie%C3%9Fen-woche-1-2)
  - [Phase 2: Erweiterte Rules (Woche 3-4)](#phase-2-erweiterte-rules-woche-3-4)
  - [Phase 3: Strukturelle Optimierungen (Woche 5-6)](#phase-3-strukturelle-optimierungen-woche-5-6)
- [5. Maintenance & Governance](#5-maintenance--governance)
  - [Verantwortlichkeiten](#verantwortlichkeiten)
  - [Review-Prozess](#review-prozess)
  - [Automatisierung](#automatisierung)
- [Anhang](#anhang)
  - [A. Vollständige Rules-Matrix](#a-vollst%C3%A4ndige-rules-matrix)
  - [B. Vorgeschlagene Template-Struktur](#b-vorgeschlagene-template-struktur)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 1. Bestandsaufnahme

### 1.1 Vorhandene Rules-Dateien

**Gesamt: 18 Rules-Dateien** in `.windsurf/rules/`

#### Core Infrastructure (4 Dateien)

| Datei | Status | Qualität | Umfang |
|-------|--------|----------|--------|
| `api-and-security.md` | ✅ Vollständig | 🟢 Exzellent | Middleware, CSRF, Headers, JSON-Shapes |
| `auth.md` | ✅ Vollständig | 🟢 Exzellent | Magic Link, OAuth, PKCE, Session-Cookies |
| `infra.md` | ⚠️ Minimal | 🟡 Ausbaufähig | Worker-Config, Bindings (sehr kurz) |
| `project-structure.md` | ✅ Vollständig | 🟢 Gut | Ordnerstruktur, Aliase, Build-Artefakte |

#### Feature-Specific (6 Dateien)

| Datei | Feature | Status | Qualität |
|-------|---------|--------|----------|
| `image-enhancer.md` | AI Image | ✅ Vollständig | 🟢 Gut |
| `video-enhancer.md` | AI Video | ✅ Vollständig | 🟢 Sehr gut |
| `transcriptor.md` | Whisper | ✅ Vollständig | 🟢 Gut |
| `prompt.md` | Prompt Enhance | ✅ Vollständig | 🟢 Gut |
| `scraper.md` | Web Scraper | ✅ Vollständig | 🟢 Exzellent (SSRF) |
| `pricing.md` | Billing/Stripe | ✅ Vollständig | 🟢 Sehr gut |

#### Quality & Tooling (5 Dateien)

| Datei | Bereich | Status | Qualität |
|-------|---------|--------|----------|
| `testing-and-ci.md` | Tests/CI | ✅ Vollständig | 🟢 Exzellent |
| `tooling-and-style.md` | ESLint/Prettier | ✅ Vollständig | 🟢 Gut |
| `zod-openapi.md` | Validation/API | ✅ Vollständig | 🟢 Gut |
| `docs-documentation.md` | Docs-Standards | ✅ Vollständig | 🟢 Sehr gut |
| `agentic-workflow.md` | Agent-Prozess | ✅ Vollständig | 🟢 Exzellent |

#### Cross-Cutting (3 Dateien)

| Datei | Bereich | Status | Qualität |
|-------|---------|--------|----------|
| `cookies-and-consent.md` | GDPR/Tracking | ✅ Vollständig | 🟢 Exzellent |
| `content.md` | Content Collections | ⚠️ Minimal | 🔴 Sehr kurz |
| `prompt.md` | (siehe Feature) | - | - |

### 1.2 AGENTS.md Hierarchie

```
AGENTS.md (Root)                        ✅ Umfassend (138 Zeilen)
├── src/pages/api/AGENTS.md             ✅ Detailliert (37 Zeilen)
├── src/components/AGENTS.md            ✅ Gut strukturiert (27 Zeilen)
├── tests/AGENTS.md                     ✅ Klar (26 Zeilen)
└── scripts/AGENTS.md                   ✅ Vorhanden (nicht analysiert)
```

**Stärken:**
- Klare Kaskadierung (Root → Feature-Ordner)
- Konsistente Struktur (Muss/Sollte/Nicht)
- Gute Referenzierung auf `.windsurf/rules/*`

**Schwächen:**
- Keine AGENTS.md für `src/lib/` (Services, Utils, Config)
- Keine AGENTS.md für `migrations/`
- Keine AGENTS.md für `workers/cron-worker/`

### 1.3 Weitere Konfigurationen

#### .codex/config.toml
```toml
✅ Vollständig konfiguriert
- Model: gpt-5-codex
- Sandbox: workspace-write
- MCP Servers: gsc, cloudflare
- Profiles: dev, ci
```

#### Package.json Scripts
```json
✅ Umfassend (80+ Scripts)
- Build-Varianten: worker, staging, ci
- Test-Suites: unit, integration, e2e
- Docs: build, lint, links, inventory
- Hygiene: full, report, handoff
```

#### CI/CD Workflows (.github/workflows/)
```yaml
✅ Solide Abdeckung (11 Workflows)
- quality-gate.yml
- e2e-smoke.yml
- unit-coverage.yml
- openapi-zod-diff.yml
- docs-inventory.yml
- i18n-validate.yml
```

## 2. Gap-Analyse

### 2.1 Fehlende Feature-spezifische Rules

#### 🔴 Kritisch: Fehlende Rules

1. **Database & Migrations** (`database-migrations.md`)
   - Migration-Naming-Conventions fehlen
   - Rollback-Strategien nicht dokumentiert
   - Schema-Sync-Prozess unklar
   - D1/Drizzle-spezifische Patterns fehlen

2. **Caching & KV** (`caching-kv.md`)
   - KV-Namespaces und TTL-Strategien nicht dokumentiert
   - Cache-Invalidierung fehlt
   - R2-Lifecycle-Policies unklar
   - Distributed Locking (falls genutzt) fehlt

3. **Email & Notifications** (`email-notifications.md`)
   - Resend-Integration nicht dokumentiert
   - Template-Management fehlt
   - Retry/Fallback-Logik unklar
   - Rate-Limiting für Emails fehlt

4. **Background Jobs & Cron** (`background-jobs.md`)
   - Cron-Worker-Setup nicht dokumentiert
   - Job-Scheduling-Patterns fehlen
   - Failure-Handling unklar
   - Monitoring/Alerting fehlt

5. **Observability & Monitoring** (`observability.md`)
   - Logging-Standards nur teilweise in `api-and-security.md`
   - Metriken/Dashboards nicht dokumentiert
   - Error-Tracking (Sentry?) fehlt
   - Performance-Monitoring unklar

#### 🟡 Mittel: Unterrepräsentierte Bereiche

6. **Frontend State Management** (`frontend-state.md`)
   - React-State-Patterns nicht dokumentiert
   - Form-Handling-Conventions fehlen
   - Client-side-Caching unklar

7. **Internationalization (i18n)** (`i18n.md`)
   - Nur kurz in Root AGENTS.md erwähnt
   - Key-Naming-Conventions fehlen
   - Pluralisierung/Interpolation nicht dokumentiert
   - RTL-Support (falls geplant) fehlt

8. **Performance Optimization** (`performance.md`)
   - Nur in `tests/performance` vorhanden
   - Core Web Vitals nicht dokumentiert
   - Bundle-Size-Budgets fehlen
   - Edge-Caching-Strategien minimal

### 2.2 Unvollständige Cross-References

**Problem:** Rules referenzieren sich gegenseitig, aber nicht konsistent.

#### Beispiele:

```markdown
# pricing.md
extends:
- api-and-security.md ✅
- zod-openapi.md ✅

# video-enhancer.md
Referenzen:
- .windsurf/rules/image-enhancer.md ✅
- .windsurf/rules/transcriptor.md ✅

# auth.md
Referenzen:
- Global Rules ❌ (unklar welche)
- API & Security Rules ✅
```

**Fehlende Referenzen:**
- `infra.md` → `api-and-security.md` (Security-Header)
- `cookies-and-consent.md` → `infra.md` (CSP-Konfiguration)
- `image-enhancer.md` → `caching-kv.md` (R2-Speicherung)

### 2.3 Inkonsistenzen in der Dokumentation

#### Frontmatter-Unterschiede

```yaml
# Konsistent in neueren Dateien:
---
trigger: always_on
scope: feature  # nur teilweise
extends: [...]  # nur in 3 Dateien
---

# Uneinheitlich:
- Manche haben scope, manche nicht
- extends nur in pricing.md, cookies-and-consent.md
- Kein lastSync in Rules (nur in docs/)
```

#### Changelog-Pflege

**Gut gepflegt:**
- `api-and-security.md` ✅ (3 Einträge)
- `testing-and-ci.md` ✅ (4 Einträge)
- `video-enhancer.md` ✅ (1 Eintrag, neu)

**Fehlend:**
- `content.md` ❌ (kein Changelog)
- `prompt.md` ✅ (1 Eintrag)
- `scraper.md` ✅ (1 Eintrag)

### 2.4 Fehlende Integrations-Guidelines

**Provider-Integrationen ohne dedizierte Rules:**

1. **Cloudflare-spezifisch**
   - Bindings (D1, KV, R2, AI) → teilweise in `infra.md`
   - Durable Objects (falls genutzt) → fehlt
   - Analytics/Beacon → in `cookies-and-consent.md` erwähnt

2. **Stripe**
   - Gut dokumentiert in `pricing.md` ✅
   - Webhook-Retry-Logik fehlt
   - Refund-Flows nicht dokumentiert

3. **Replicate**
   - Gut dokumentiert in `video-enhancer.md` ✅
   - Cost-Tracking fehlt
   - Fallback-Strategien bei Ausfällen fehlen

4. **Stytch (Auth)**
   - Gut dokumentiert in `auth.md` ✅
   - Session-Refresh-Flows fehlen
   - Magic-Link-Deeplinks unklar

### 2.5 Unklare Scope-Definitionen

**Problem:** Manche Rules haben `scope: feature`, aber keine klare Definition.

```markdown
# pricing.md
scope: feature
extends: [api-and-security.md, zod-openapi.md]
✅ Klar: Feature = Billing/Stripe

# cookies-and-consent.md
scope: feature
extends: [api-and-security.md, auth.md, project-structure.md]
❓ Unklar: Feature = Consent-Management? Cross-Cutting?

# Fehlend in:
- image-enhancer.md (sollte scope: feature haben)
- video-enhancer.md (sollte scope: feature haben)
```

## 3. Verbesserungsvorschläge

### 3.1 Neue Rules-Dateien (Priorität: Hoch)

#### 1. `database-migrations.md`

```markdown
---
trigger: always_on
scope: infra
extends:
  - project-structure.md
---

# Database & Migrations Rules

## Zweck
Konsistente DB-Schema-Evolution mit Drizzle/D1, sichere Migrations und Rollback-Strategien.

## Muss
- Naming: `YYYYMMDD_HHmmss_descriptive_name.ts`
- Keine destructive Migrationen ohne Data-Migration
- Transaktionale Änderungen gruppieren
- Forward/Backward-kompatible Änderungen bevorzugen

## Migration-Workflow
1. Lokale Schema-Änderung in `src/lib/db/schema.ts`
2. `npm run db:generate` → Migration erstellen
3. Review der generierten SQL
4. Lokaler Test mit `npm run db:migrate`
5. Staging-Deploy → Migration automatisch
6. Production-Deploy → Migration mit Backup

## Rollback-Strategie
- Additive Änderungen: Forward-Only
- Breaking Changes: Blue-Green-Deploy mit separaten Schemas
- Data-Migrations: Separate von Schema-Migrations

## Checkliste
- [ ] Migration-File benannt nach Convention?
- [ ] SQL reviewed (keine Locks auf großen Tables)?
- [ ] Rollback-Plan dokumentiert?
- [ ] Staging-Test durchgeführt?
- [ ] Backup vor Production-Deploy?

## Code-Anker
- `migrations/`
- `src/lib/db/schema.ts`
- `docs/architecture/database-schema.md`

## Changelog
- 2025-11-12: Erstfassung
```

#### 2. `caching-kv.md`

```markdown
---
trigger: always_on
scope: infra
extends:
  - infra.md
  - api-and-security.md
---

# Caching & KV Storage Rules

## Zweck
Konsistente Nutzung von Cloudflare KV, Cache-API und R2 für Performance und Cost-Optimierung.

## KV Namespaces
- `SESSION`: User-Sessions (TTL: 7 Tage)
- `RATE_LIMIT`: Rate-Limit-Counters (TTL: 1 Stunde)
- `CACHE`: API-Response-Cache (TTL: variabel)
- `JOBS`: AI-Job-Metadaten (TTL: 14 Tage)

## Muss
- TTL immer explizit setzen (`expirationTtl`)
- Keys konsistent prefixen (`session:`, `ratelimit:`, `cache:`, `job:`)
- Keine PII in KV-Keys (nur Hashes/IDs)
- Graceful Degradation bei KV-Ausfällen

## Cache-Invalidierung
- Manual: `await env.CACHE.delete(key)`
- Pattern-based: Prefix-Iteration (sparsam nutzen)
- Time-based: TTL bevorzugen

## R2 Lifecycle
- Uploads: 14 Tage (`expiresAt` in Metadata)
- Results: 14 Tage
- Permanent: `feature=user-avatar` (kein Expiry)

## Checkliste
- [ ] TTL gesetzt?
- [ ] Key-Prefix korrekt?
- [ ] Fallback bei KV-Fehler vorhanden?
- [ ] R2-Lifecycle dokumentiert?

## Code-Anker
- `src/lib/kv/`
- `src/config/r2.ts`
- `wrangler.toml` (Bindings)

## Changelog
- 2025-11-12: Erstfassung
```

#### 3. `email-notifications.md`

```markdown
---
trigger: always_on
scope: feature
extends:
  - api-and-security.md
  - auth.md
---

# Email & Notifications Rules

## Zweck
Sichere, zuverlässige Email-Zustellung via Resend mit Template-Management und Rate-Limiting.

## Muss
- Templates in `src/lib/email/templates/` (TSX-Komponenten)
- Niemals Email-Adressen in Logs (nur Hash)
- Rate-Limit: max 5 Emails/User/Stunde
- Retry mit Exponential Backoff (3 Versuche)

## Template-Struktur
\`\`\`tsx
// src/lib/email/templates/magic-link.tsx
export const MagicLinkEmail = ({ token, email }: Props) => (
  <Html>
    <Head />
    <Body>
      {/* Template-Content */}
    </Body>
  </Html>
);
\`\`\`

## Versand-Workflow
1. Validierung (Email-Format, User existiert)
2. Rate-Limit-Check (KV)
3. Template-Render
4. Resend-API-Call mit Retry
5. Logging (redacted)

## Fehlerbehandlung
- Invalid Email → `validation_error`
- Rate-Limit → `forbidden` mit `Retry-After`
- Resend-Fehler → `server_error` mit redacted Details

## Checkliste
- [ ] Template in `templates/` erstellt?
- [ ] Rate-Limit aktiv?
- [ ] Retry-Logik implementiert?
- [ ] Logging ohne PII?

## Code-Anker
- `src/lib/email/`
- `src/lib/services/email-service-impl.ts`
- `src/pages/api/auth/magic/request.ts`

## Changelog
- 2025-11-12: Erstfassung
```

#### 4. `background-jobs.md`

```markdown
---
trigger: always_on
scope: infra
extends:
  - infra.md
  - observability.md
---

# Background Jobs & Cron Rules

## Zweck
Zuverlässige Hintergrund-Verarbeitung via Cloudflare Cron Triggers und Queue (falls genutzt).

## Cron-Worker-Struktur
- Worker: `workers/cron-worker/`
- Wrangler: `workers/cron-worker/wrangler.toml`
- Schedules: CRON-Expression in `wrangler.toml`

## Muss
- Idempotent: Mehrfache Ausführungen sicher
- Timeout-Handling: 30s CPU-Time-Limit beachten
- Checkpointing: Fortschritt in KV speichern bei langen Jobs
- Monitoring: Success/Failure in KV/D1 loggen

## Job-Patterns
\`\`\`typescript
// Idempotent Job
export async function processAuthHealthCheck(env: Env) {
  const jobId = `auth-health-${Date.now()}`;
  const existing = await env.KV_JOBS.get(jobId);
  if (existing) return; // Already processed

  // ... Job Logic ...

  await env.KV_JOBS.put(jobId, 'completed', { expirationTtl: 3600 });
}
\`\`\`

## Verfügbare Cron-Jobs
- `__cron/run/auth` (täglich 2 Uhr UTC)
- `__cron/run/docs` (täglich 3 Uhr UTC)
- `__cron/run/status` (alle 5 Minuten)

## Checkliste
- [ ] Idempotent implementiert?
- [ ] Timeout-Handling vorhanden?
- [ ] Monitoring/Alerting aktiv?
- [ ] Lokaler Test mit Trigger durchgeführt?

## Code-Anker
- `workers/cron-worker/`
- `src/pages/api/cron/`
- `docs/ops/cron-monitoring.md`

## Changelog
- 2025-11-12: Erstfassung
```

#### 5. `observability.md`

```markdown
---
trigger: always_on
scope: infra
extends:
  - api-and-security.md
  - infra.md
---

# Observability & Monitoring Rules

## Zweck
Konsistentes Logging, Metriken und Error-Tracking für schnelle Fehlerdiagnose.

## Logging-Standards
- Strukturiert: JSON mit `level`, `timestamp`, `requestId`, `context`
- PII-Maskierung: `logger-utils.ts` nutzen
- Levels: `debug`, `info`, `warn`, `error`
- Context: `{ route, userId?, sessionId?, jobId? }`

## Metriken (Cloudflare Analytics)
- Worker-Requests: automatisch
- Custom Metrics: via `ctx.waitUntil()` + KV
- Performance: `performance.measure()` in kritischen Pfaden

## Error-Tracking
- Cloudflare-Fehler: automatisch in Dashboard
- Custom Errors: `createApiError` mit Details
- Sentry (optional): nur Production, redacted Payloads

## Correlation-IDs
- Request-ID: UUID v4 in Middleware
- Stripe-Event-ID: in Webhook-Logs
- Job-ID: in AI-Job-Polling

## Dashboards
- Cloudflare Analytics: Worker-Health
- Custom: KV-basierte Metrics-Aggregation
- Alerts: >5% Error-Rate → Email/Slack

## Checkliste
- [ ] Strukturiertes Logging vorhanden?
- [ ] PII maskiert?
- [ ] Request-ID gesetzt?
- [ ] Metriken bei kritischen Pfaden?

## Code-Anker
- `src/lib/services/logger-utils.ts`
- `src/config/logging.ts`
- `docs/features/production-logging.md`
- `docs/runbooks/logging-pipeline.md`

## Changelog
- 2025-11-12: Erstfassung
```

### 3.2 Erweiterte Bestehende Rules (Priorität: Mittel)

#### 1. `infra.md` erweitern

**Aktuell:** 36 Zeilen (sehr kurz)

**Ergänzungen:**

```markdown
## Cloudflare-spezifische Patterns

### Bindings-Zugriff
\`\`\`typescript
// In API-Routen
const db = context.locals.runtime.env.DB;
const kv = context.locals.runtime.env.SESSION;
const r2 = context.locals.runtime.env.R2_AI_IMAGES;
const ai = context.locals.runtime.env.AI; // Optional
\`\`\`

### Edge-Caching
- Cache-API für statische Assets (automatisch via Astro)
- Custom Caching für API-Responses (KV)
- Bypass für `/api/*` (außer explizit gecached)

### Wrangler-Environments
- `development`: Lokale SQLite + KV-Simulator
- `staging`: Production-ähnlich, separate DB
- `production`: Live mit Backups

### Deployment-Strategie
- Zero-Downtime: Workers versioned automatisch
- Rollback: `wrangler deployments list` + `rollback`
- Health-Check vor Prod-Deploy

## Code-Anker
- `astro.config.mjs` (Edge-Adapter)
- `wrangler.toml` + `wrangler.ci.toml`
- `src/middleware.ts` (Security-Header)
- `docs/ops/deployment-guide.md`
```

#### 2. `content.md` erweitern

**Aktuell:** 20 Zeilen (minimal)

**Ergänzungen:**

```markdown
# Content Rules (erweitert)

## Content Collections

### Schema-Definition
- Zentral in `src/content/config.ts`
- Types generiert in `src/content/types.ts`
- Strikte Validierung via Zod

### Verfügbare Collections
- `blog`: Blog-Posts (Markdown/MDX)
- `docs`: Dokumentation (Markdown)
- `tools`: Tool-Beschreibungen (JSON/Markdown)

### Frontmatter-Standards
\`\`\`yaml
---
title: "Title" # required
description: "Description" # required
author: "Author" # optional
pubDate: 2025-11-12 # required für blog
tags: [tag1, tag2] # optional
draft: false # optional, default false
---
\`\`\`

### Slug-Generierung
- Automatisch aus Filename: `2025-11-12-my-post.md` → `/blog/my-post`
- Custom Slug: `slug: custom-url` im Frontmatter
- i18n: `de/blog/mein-post.md` → `/de/blog/mein-post`

## Images & Media
- Blog-Images: `public/images/blog/`
- Tool-Assets: `public/images/tools/`
- Optimierung: Astro Image-Service (automatisch)

## Checkliste
- [ ] Frontmatter vollständig?
- [ ] Slug korrekt?
- [ ] Images optimiert?
- [ ] i18n-Varianten vorhanden?

## Code-Anker
- `src/content/config.ts`
- `src/content/types.ts`
- `src/pages/blog/[...slug].astro`
```

### 3.3 Strukturelle Verbesserungen (Priorität: Mittel)

#### 1. Rules-Index erstellen

**Datei:** `.windsurf/rules/README.md`

```markdown
# Windsurf Rules Index

Alle projektspezifischen Regeln für KI-Assistenten.

## Übersicht

| Kategorie | Dateien | Beschreibung |
|-----------|---------|--------------|
| **Core** | 4 | API, Auth, Infra, Struktur |
| **Features** | 8 | AI-Tools, Billing, Content |
| **Quality** | 5 | Testing, Linting, Docs |
| **Cross-Cutting** | 2 | Cookies, Workflows |

## Verwendung

### Für Agenten
1. Lies Root `AGENTS.md` zuerst
2. Folge der Kaskade: Root → Feature-Rules
3. Nutze `extends:` für Cross-References

### Für Entwickler
- Neue Features: Erstelle dedizierte Rule-Datei
- Änderungen: Aktualisiere Changelog in betroffenen Rules
- Review: Prüfe Cross-References

## Dependency-Graph

\`\`\`
api-and-security.md (Basis für alle API-Rules)
  ↓
  ├─ auth.md
  ├─ pricing.md
  ├─ image-enhancer.md
  ├─ video-enhancer.md
  ├─ transcriptor.md
  ├─ prompt.md
  └─ scraper.md

zod-openapi.md (Basis für Validation)
  ↓
  ├─ pricing.md
  └─ [alle Feature-APIs]

testing-and-ci.md (Basis für alle Tests)
  ↓
  └─ [alle Features mit Tests]
\`\`\`

## Konventionen

### Frontmatter
\`\`\`yaml
---
trigger: always_on        # required
scope: core|feature|infra # optional
extends: [...]            # optional
---
\`\`\`

### Struktur
1. Zweck
2. Muss / Sollte / Nicht
3. Checkliste
4. Code-Anker
5. CI/Gates
6. Referenzen
7. Changelog
```

#### 2. AGENTS.md für fehlende Bereiche

**Neu:** `src/lib/AGENTS.md`

```markdown
# AGENTS.md (Lib)

Geltung: Services, Utils, Config unter `src/lib/`.

## Service-Konventionen
- Interfaces in separaten Dateien (`-service.ts`)
- Implementierungen mit `-impl` Suffix
- Dependency Injection via Constructor
- Typed Errors via `createApiError`

## Utils
- Pure Functions bevorzugen
- Keine Side-Effects in Utils
- Tests für alle Utils (Unit-Tests)

## Config
- Env-Variablen über `import.meta.env`
- Validation mit Zod
- Defaults für alle Optionals

## Typisierung
- Keine `any` (Lint-Enforcement)
- Types in `src/lib/types/` für Shared-Types
- DB-Types aus `src/lib/db/types.ts`

## Tests
- Unit-Tests für alle Utils/Services
- Mocks für External Dependencies
- Fixtures in `tests/fixtures/`
```

**Neu:** `migrations/AGENTS.md`

```markdown
# AGENTS.md (Migrations)

Geltung: DB-Migrations unter `migrations/`.

## Naming
`YYYYMMDD_HHmmss_descriptive_name.ts`

## Struktur
\`\`\`typescript
export async function up(db: Database) {
  // Forward Migration
}

export async function down(db: Database) {
  // Rollback (optional)
}
\`\`\`

## Muss
- Idempotent wo möglich
- Keine Locks auf großen Tables
- Transaktionen nutzen
- Rollback-Plan dokumentieren

## Nicht
- Keine destructive Migrationen ohne Backup
- Keine Data-Migrations in Schema-Migrations mischen
```

#### 3. Frontmatter-Standardisierung

**Proposal:** Alle Rules bekommen einheitliches Frontmatter:

```yaml
---
trigger: always_on
scope: core|feature|infra|quality|cross-cutting
priority: critical|high|medium|low
extends:
  - relative/path/to/other.md
lastUpdate: YYYY-MM-DD
maintainer: team-name
---
```

**Migration-Plan:**
1. Template erstellen (`.windsurf/rules/TEMPLATE.md`)
2. Script schreiben (`scripts/rules-frontmatter-update.ts`)
3. Batch-Update mit Review

### 3.4 Dokumentations-Optimierungen (Priorität: Niedrig)

#### 1. Rules-Linting

**Script:** `scripts/rules-lint.ts`

```typescript
// Prüft:
// - Frontmatter vollständig
// - Changelog vorhanden
// - Cross-References gültig
// - Code-Anker existieren
// - Strukturelemente (Muss/Sollte/Nicht)
```

**Integration:** `npm run rules:lint` in CI

#### 2. Automated Cross-Reference-Check

```typescript
// scripts/rules-validate-refs.ts
// - Parst alle extends: [...] Angaben
// - Prüft ob referenzierte Dateien existieren
// - Warnt bei zirkulären Dependencies
```

#### 3. Rules-Coverage-Report

```typescript
// scripts/rules-coverage.ts
// Generiert Matrix:
// - Welche Features haben dedizierte Rules?
// - Welche Code-Bereiche sind nicht abgedeckt?
// - Welche Rules sind veraltet (lastUpdate > 6 Monate)?
```

## 4. Implementierungs-Roadmap

### Phase 1: Kritische Lücken schließen (Woche 1-2)

**Priorität: Hoch**

- [ ] `database-migrations.md` erstellen und mit Team reviewen
- [ ] `caching-kv.md` erstellen (R2-Lifecycle-Policies dokumentieren)
- [ ] `email-notifications.md` erstellen (Resend-Integration)
- [ ] `background-jobs.md` erstellen (Cron-Worker-Patterns)
- [ ] `observability.md` erstellen (Logging/Metriken)
- [ ] `infra.md` erweitern (Bindings, Edge-Caching, Deployment)

**Deliverables:**
- 6 neue/erweiterte Rules-Dateien
- Integration in Root `AGENTS.md`
- Code-Beispiele für jede Rule

### Phase 2: Erweiterte Rules (Woche 3-4)

**Priorität: Mittel**

- [ ] `content.md` erweitern (Collections, Frontmatter, Slugs)
- [ ] `frontend-state.md` erstellen (React-Patterns, Forms)
- [ ] `i18n.md` erstellen (Key-Naming, Plurals, Scripts)
- [ ] `performance.md` erstellen (Core Web Vitals, Budgets)
- [ ] AGENTS.md für `src/lib/` erstellen
- [ ] AGENTS.md für `migrations/` erstellen

**Deliverables:**
- 4 neue Rules-Dateien
- 2 neue AGENTS.md
- Aktualisierte Cross-References

### Phase 3: Strukturelle Optimierungen (Woche 5-6)

**Priorität: Niedrig**

- [ ] `.windsurf/rules/README.md` erstellen (Index + Dependency-Graph)
- [ ] Frontmatter standardisieren (Template + Script)
- [ ] Rules-Linting implementieren (`npm run rules:lint`)
- [ ] Cross-Reference-Validation (`npm run rules:validate`)
- [ ] Coverage-Report (`npm run rules:coverage`)
- [ ] CI-Integration für Rules-Quality-Checks

**Deliverables:**
- Rules-Governance-Tooling
- Automatisierte Quality-Gates
- Maintenance-Playbook

## 5. Maintenance & Governance

### Verantwortlichkeiten

| Rolle | Verantwortung |
|-------|---------------|
| **Tech Lead** | Rules-Approval, Breaking-Changes |
| **Feature-Owner** | Feature-spezifische Rules pflegen |
| **DevOps** | Infra/CI-Rules aktuell halten |
| **QA** | Testing-Rules validieren |

### Review-Prozess

1. **Rule-Änderungen:**
   - PR mit `[RULES]` Prefix im Titel
   - Mindestens 1 Approval von Tech Lead
   - CI prüft Frontmatter + Cross-Refs

2. **Neue Rules:**
   - Proposal als Issue (Template)
   - Team-Discussion
   - Implementation + Docs-Sync
   - Integration in Root AGENTS.md

3. **Deprecation:**
   - 2-Wochen-Notice im Changelog
   - Migration-Guide im Issue
   - Archiv-Move nach Deprecation

### Automatisierung

```json
// package.json (neu)
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

## Anhang

### A. Vollständige Rules-Matrix

| Rule-Datei | Scope | Priority | Status | Last-Update | Extends | Gaps |
|------------|-------|----------|--------|-------------|---------|------|
| `api-and-security.md` | core | critical | ✅ Complete | 2025-11-03 | - | None |
| `auth.md` | core | critical | ✅ Complete | 2025-10-31 | - | Session-Refresh |
| `pricing.md` | feature | high | ✅ Complete | 2025-11-02 | api, zod | Refunds |
| `image-enhancer.md` | feature | high | ✅ Complete | 2025-10-31 | - | Cost-Tracking |
| `video-enhancer.md` | feature | high | ✅ Complete | 2025-11-05 | - | None |
| `transcriptor.md` | feature | medium | ✅ Complete | 2025-10-31 | - | SSE/Poll |
| `prompt.md` | feature | medium | ✅ Complete | 2025-10-31 | - | PII-Filters |
| `scraper.md` | feature | medium | ✅ Complete | 2025-10-31 | - | Robots.txt |
| `testing-and-ci.md` | quality | critical | ✅ Complete | 2025-11-12 | - | None |
| `tooling-and-style.md` | quality | high | ✅ Complete | 2025-11-12 | - | None |
| `zod-openapi.md` | quality | high | ✅ Complete | 2025-10-31 | - | None |
| `docs-documentation.md` | quality | medium | ✅ Complete | 2025-11-06 | - | None |
| `agentic-workflow.md` | quality | high | ✅ Complete | 2025-11-12 | - | None |
| `cookies-and-consent.md` | cross | high | ✅ Complete | 2025-11-03 | api, auth, structure | None |
| `infra.md` | infra | high | ⚠️ Minimal | 2025-10-31 | - | Bindings, Edge |
| `project-structure.md` | infra | high | ✅ Complete | 2025-11-03 | - | None |
| `content.md` | cross | low | ⚠️ Minimal | N/A | - | Collections |
| **`database-migrations.md`** | infra | critical | ❌ Missing | - | structure | **Neu** |
| **`caching-kv.md`** | infra | high | ❌ Missing | - | infra | **Neu** |
| **`email-notifications.md`** | feature | high | ❌ Missing | - | api, auth | **Neu** |
| **`background-jobs.md`** | infra | high | ❌ Missing | - | infra, observability | **Neu** |
| **`observability.md`** | infra | high | ❌ Missing | - | api, infra | **Neu** |
| **`frontend-state.md`** | quality | medium | ❌ Missing | - | tooling | **Neu** |
| **`i18n.md`** | cross | medium | ❌ Missing | - | structure | **Neu** |
| **`performance.md`** | quality | medium | ❌ Missing | - | infra | **Neu** |

**Legende:**
- ✅ Complete: Vollständig dokumentiert
- ⚠️ Minimal: Vorhanden, aber ausbaufähig
- ❌ Missing: Fehlt komplett

### B. Vorgeschlagene Template-Struktur

```markdown
---
trigger: always_on
scope: core|feature|infra|quality|cross-cutting
priority: critical|high|medium|low
extends:
  - ../relative/path.md
lastUpdate: YYYY-MM-DD
maintainer: team-name|owner
---

# [Feature/Area] Rules

## Zweck

Kurze Beschreibung (1-2 Sätze) was diese Rule regelt.

## Muss

- **Verpflichtende** Anforderungen (Bullet-Points)
- Mit klaren Beispielen wo sinnvoll

## Sollte

- **Empfohlene** Best Practices
- Optional aber stark empfohlen

## Nicht

- **Verbotene** Patterns
- Antipatterns mit Begründung

## Checkliste

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] ...

## Code-Anker

- `src/path/to/relevant/code.ts`
- `tests/path/to/tests.ts`
- `docs/path/to/docs.md`

## CI/Gates

- `npm run command-that-validates-this`
- `npm run related-tests`

## Referenzen

- Verwandte Rules (relative Links)
- Externe Docs (URLs)

## Changelog

- YYYY-MM-DD: Änderung-Beschreibung
- YYYY-MM-DD: Initiale Version
```

---

**Erstellt:** 2025-11-12
**Version:** 1.0
**Nächste Review:** 2025-12-12
**Maintainer:** Architecture Team
