---
description: 'Systemarchitektur, Auth-Flow, ADRs und Code-Reviews für Evolution Hub'
owner: 'Architecture Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/middleware, src/lib/auth, src/lib/api-middleware'
testRefs: 'tests/integration, test-suite-v2/src/e2e/auth'
---

<!-- markdownlint-disable MD051 -->

# Architecture Documentation

**Scope** — Diese Kategorie dokumentiert die technische Systemarchitektur von Evolution Hub, einschließlich Authentifizierung, Middleware, API-Design und Architecture Decision Records (ADRs). Zielgruppe sind Architekten, Lead-Entwickler und System-Integratoren. Nicht enthalten: UI/UX-Details (→ Frontend-Kategorie) oder operative Runbooks (→ Ops-Kategorie).

## Primärdokumente

- **[System Overview](./system-overview.md)** — Umfassende Übersicht über Tech-Stack und Datenflüsse

- **[Auth Architecture](./auth-architecture.md)** — Vollständige Authentifizierungsarchitektur (Stytch Magic Link)

- **[Auth Flow](./auth-flow.md)** — Detaillierter Authentifizierungs- und Session-Management-Flow

- **[API Middleware Inventory](./api-middleware-inventory.md)** — Übersicht über alle API-Middlewares und Security-Features

## Sekundär-/Spezialdokumente

- **[Data Flow](./data-flow.md)** — Dokumentation der Datenflüsse durch das System

- **[Database Schema](./database-schema.md)** — Datenbankstruktur und Tabellen-Design

- **[Locale Middleware](./locale-middleware.md)** — i18n-Middleware-Implementierung

- **[Feature-Architekturen](./ai-image-enhancer.md)** — Architektur spezifischer Features (z. B. AI Image Enhancer)

## Architecture Decision Records (ADRs)

Dokumentierte Architekturentscheidungen in [adrs/](./adrs/):

### Aktive ADRs

- **[ADR-0001: Astro + Cloudflare Stack](./adrs/0001-astro-cloudflare-stack.md)** — Grundlegende Tech-Stack-Entscheidung

- **[ADR-0002: Cloudflare Architecture](./adrs/0002-cloudflare-architecture.md)** — Cloudflare-spezifische Architektur

- **[ADR-0003: Frontend Architecture](./adrs/0003-astro-frontend-architecture.md)** — Frontend-Design-Entscheidungen

- **[ADR-0005: Auth Route Locale](./adrs/0005-auth-route-locale-normalisierung.md)** — Locale-Handling in Auth-Routen

### Code Reviews & Analysen

Detaillierte Reviews in [reviews/](./reviews/):

- **[Image Enhancer Review](./reviews/BEWERTUNG_LOGIKREVIEW_IMAGE-ENHANCER_USAGE-PILL_PLANANZEIGE.md)** — UI-Upgrade-Analyse

## Cross-Referenzen

- **[Development](../development/)** — Implementierungsdetails und Workflows

- **[Security](../security/)** — Sicherheitsarchitektur und Best Practices

- **[Frontend](../frontend/)** — UI/UX-Architektur und Design-System

- **[API](../api/)** — API-Design und Middleware-Integration

## Ownership & Maintenance

**Owner:** Architecture Team (Lead: System-Architekt)
**Update-Frequenz:** Bei Code-Änderungen in betroffenen Bereichen (Middleware, Auth, API)
**Review-Prozess:** Peer-Review durch Architecture Team + Security-Review bei Änderungen
**Eskalation:** Bei Architekturkonflikten → Tech Lead oder ADR-Prozess

## Standards & Konventionen

- **ADR-Format:** Gemäß [ADR-Template](./adrs/0001-astro-cloudflare-stack.md)

- **Code-Sync:** Dokumente müssen bei Änderungen in `src/middleware.ts`, `src/lib/auth-*`, `src/lib/api-middleware.ts` aktualisiert werden

- **Sprache:** Deutsch (technische Begriffe auf Englisch)

- **Diagramme:** Mermaid für Systemflüsse und Architekturdiagramme

## Bekannte Lücken

- [TODO] Middleware-Performance-Metriken und Optimierungen

- [TODO] Disaster Recovery Architecture für Cloudflare-Setup

- [TODO] API-Versioning-Strategie
