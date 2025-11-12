---
description: 'Überblick über Technologie-Stack und Architektur von Evolution Hub'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-03'
codeRefs: 'docs/architecture/**, src/lib/**, package.json'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Evolution Hub - Technologie-Stack und Architektur

> Hinweis: Der kanonische Einstiegspunkt für die Architektur-Dokumentation ist `docs/architecture/README.md`. Verwende primär die Dokumente im Verzeichnis `docs/architecture/` (Kategorie-Index, Unterseiten, ADRs).

## Technologie‑Stack (aktuell)

### Frontend

- **Astro v5.13.0** (siehe [`package.json`](package.json:56))

- **React v18.3.1** (siehe [`package.json`](package.json:75))

- **Tailwind CSS v3.4.17** (siehe [`package.json`](package.json:115))

- **AOS** (Animate On Scroll) – typischerweise via CDN/Coordinator‑Island

- **Lottie Web v5.13.0** (siehe [`package.json`](package.json:74))

- **astro‑heroicons / Heroicons** (siehe [`package.json`](package.json:57))

### Backend & Platform

- **Cloudflare Workers / Wrangler** — primäres Deployment‑Target & lokale Runtime (siehe Build‑/Dev‑Skripte in [`package.json`](package.json:6))

- **Cloudflare Pages** (Preview/hosting) — optional in CI/CD workflows

- **Cloudflare D1** (Serverless SQLite) — persistente Daten

- **Cloudflare R2** — Objektspeicher (Avatare, Assets)

- **Cloudflare KV** — Key‑Value Store (Sessions, Cache)

- **Hono v4.9.1** (siehe [`package.json`](package.json:72))

- **Auth:** Stytch Magic Link (Stytch SDK in `src/lib/stytch.ts`)

### Authentifizierung & Sicherheit

- **jose v6.0.12** (JWT, siehe [`package.json`](package.json:73)) – Hinweis: Nicht für Session‑Auth im Einsatz; Sessions sind Cookie‑basiert (`__Host-session`).

- **cookie v1.0.2** (siehe [`package.json`](package.json:66))

- Zentrale Security‑Implementierungen:
  - Rate‑Limiting: [`src/lib/rate-limiter.ts`](src/lib/rate-limiter.ts:1)

  - Security‑Headers: [`src/lib/security-headers.ts`](src/lib/security-headers.ts:1)

  - Audit‑Logging: [`src/lib/security-logger.ts`](src/lib/security-logger.ts:1) + [`src/server/utils/logger.ts`](src/server/utils/logger.ts:42)

### Testing & Tooling

- **Vitest v3.2.4** (siehe [`package.json`](package.json:120)) — Unit & Integration

- **Playwright v1.54.2** (siehe [`package.json`](package.json:90)) — E2E

- **MSW v2.10.5 / @mswjs/data** (siehe [`package.json`](package.json:88, src entries))

### E‑Mail & Notifications

- **Resend v6.0.1** (siehe [`package.json`](package.json:78)) — Transaktionale E‑Mails

- **Sonner** — In‑App Notifications (Wrapper in [`src/lib/notify.ts`](src/lib/notify.ts:1))

### Payments

- **Stripe v18.4.0** (siehe [`package.json`](package.json:81))

## Architektur‑Übersicht

### Verzeichnisstruktur (Auszug)

````text
evolution-hub/
├── src/
│   ├── components/       # UI‑Komponenten (Astro + React Islands)
│   ├── content/          # Content Collections (Blog/Docs)
│   ├── layouts/          # Layouts/Templates
│   ├── lib/              # Shared Libraries (rate‑limiter, security, services)
│   ├── pages/            # File‑based routing (Astro pages & API)
│   ├── server/           # Dev/WebSocket/Logger utilities
│   └── utils/            # Helpers (i18n, validators, services)
├── public/               # Static assets
├── migrations/           # D1 migration SQL files
└── tests/                # E2E / integration / fixtures

```text

### API‑Architektur

- File‑based API unter `src/pages/api/`:

  - Auth: `/api/auth/*` — magic/request, callback

  - User: `/api/user/*` — me/profile/logout/avatar

  - Projects: `/api/projects/*` — CRUD

  - Dashboard: `/api/dashboard/*`

  - Billing: `/api/billing/*`

- Middleware & helpers: [`src/lib/api-middleware.ts`](src/lib/api-middleware.ts:1), [`src/lib/response-helpers.ts`](src/lib/response-helpers.ts:1)

### Datenmodell

Die DB‑Tabellen spiegeln die Migrations in `/migrations`:

- `users` — Accounts, E‑Mail, Verifikation

- `sessions` — Session‑ID, user_id, expires_at

- `projects` — Projekt‑Metadaten

- `comments`

- `subscriptions`
  (Konkret: siehe `/migrations/*.sql`)

### Frontend‑Architektur

- Islands Approach: statische SSR‑Seiten mit kleinen hydratisierbaren React‑Islands

- Styling & Utility classes: Tailwind CSS (`src/styles/`)

- Komponenten‑Standorte: [`src/components/`](src/components:1)

### Security & Observability

- Rate‑Limiting: in [`src/lib/rate-limiter.ts`](src/lib/rate-limiter.ts:1) (In‑Memory; Persistenzplanung mit D1/KV)

- Security‑Headers: applied via [`src/lib/security-headers.ts`](src/lib/security-headers.ts:59)

- Centralized Logging: [`src/server/utils/logger.ts`](src/server/utils/logger.ts:37) + client UI [`src/components/ui/DebugPanel.tsx`](src/components/ui/DebugPanel.tsx:39)

- SSE/WebSocket hybrid streaming for dev: logs via WebSocket in Astro dev, SSE in Wrangler dev

### Development & Deployment

- Development modes:

  - Fast UI dev: `npm run dev:astro` → starts Astro dev server (see [`package.json`](package.json:11))

  - Full Worker dev: `npm run dev` → runs `npm run dev:worker` (see [`package.json`](package.json:6-13))

  - Worker dev (no build): `npm run dev:worker:nobuild` (see [`package.json`](package.json:10))

- Builds:

  - `npm run build` → standard Astro build

  - `npm run build:worker` → Worker build artifacts (see [`package.json`](package.json:17))

- Deployment:

  - Cloudflare Workers via Wrangler / Workers Builds; Cloudflare Pages used for preview/deployment pipelines where configured

## Konkrete Implementationen & Orte

- Rate‑Limiter: [`src/lib/rate-limiter.ts`](src/lib/rate-limiter.ts:1)

- Security Headers: [`src/lib/security-headers.ts`](src/lib/security-headers.ts:1)

- Security Logger: [`src/lib/security-logger.ts`](src/lib/security-logger.ts:1)

- Central logger + SSE/WebSocket buffer: [`src/server/utils/logger.ts`](src/server/utils/logger.ts:37)

- i18n utilities: [`src/lib/i18n.ts`](src/lib/i18n.ts:12) & [`src/utils/i18n.ts`](src/utils/i18n.ts:23)

## Weitere Architektur-Dokumentation

Detaillierte Architektur-Dokumentation finden Sie in:

- **[System-Übersicht](./architecture/system-overview.md)** — Umfassender Überblick über die Systemarchitektur

- **[Datenfluss](./architecture/data-flow.md)** — Dokumentation der Datenflüsse

- **[Auth-Architektur](./architecture/auth-architecture.md)** — Authentifizierungsflow und Sicherheitsmaßnahmen

- **[Datenbank-Schema](./architecture/database-schema.md)** — DB-Struktur und Migrations

- **[AI Image Enhancer](./architecture/ai-image-enhancer.md)** — AI-Service-Architektur

- **[API Middleware Inventory](./architecture/api-middleware-inventory.md)** — Middleware-Übersicht

- **[ADRs](./architecture/adrs/)** — Architecture Decision Records

  - [0001: Astro + Cloudflare Stack](./architecture/adrs/0001-astro-cloudflare-stack.md)

  - [0002: Cloudflare Architecture](./architecture/adrs/0002-cloudflare-architecture.md)

  - [0003: Astro Frontend Architecture](./architecture/adrs/0003-astro-frontend-architecture.md)

  - [0004: Database Schema](./architecture/adrs/0004-database-schema.md)

  - [0005: Auth Route Locale Normalisierung](./architecture/adrs/0005-auth-route-locale-normalisierung.md)

  - [0006: Dev Echo in Nicht-Prod-Umgebungen](./architecture/adrs/0006-dev-echo-non-prod.md)

## Hinweise

- Diese Architektur‑Doku wurde an die aktuell in [`package.json`](package.json:1) gelisteten Abhängigkeiten angepasst.

- Für exakte Versionen und weitere Abhängigkeiten prüfen Sie [`package.json`](package.json:6).

- Änderungen an Build/Deploy können in `wrangler.toml` und CI‑Konfigurationen erfolgen.

---

```text
````
