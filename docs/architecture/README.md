# Architecture Documentation

Diese Dokumentation beschreibt die technische Architektur von Evolution Hub, einschließlich Systemdesign, Datenflüsse, Authentifizierung und wichtige Architekturentscheidungen.

## Übersicht

Evolution Hub ist eine moderne Full-Stack-Webanwendung basierend auf:

- **Frontend**: Astro mit React Islands
- **Backend**: Cloudflare Workers
- **Datenbank**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **KV Store**: Cloudflare KV

## System-Architektur

### Kern-Dokumentation

- **[System Overview](./system-overview.md)** — Umfassender Überblick über die Systemarchitektur
- **[Data Flow](./data-flow.md)** — Dokumentation der Datenflüsse durch das System
- **[Database Schema](./database-schema.md)** — Datenbankstruktur und Tabellen-Design

### Authentifizierung

- **[Auth Architecture](./auth-architecture.md)** — Vollständige Authentifizierungsarchitektur (Stytch Magic Link)
- **[Auth Flow](./auth-flow.md)** — Detaillierter Authentifizierungsflow
- **[Auth Migration Stytch](./auth-migration-stytch.md)** — Migration von Passwort-Auth zu Stytch Magic Link

### API & Middleware

- **[API Middleware Inventory](./api-middleware-inventory.md)** — Übersicht über alle API-Middlewares
- **[Locale Middleware](./locale-middleware.md)** — i18n-Middleware-Implementierung

### Features

- **[AI Image Enhancer](./ai-image-enhancer.md)** — Architektur des AI-basierten Bildverbesserungs-Features
- **[Voice Visualizer + Transcriptor](./voice-visualizer-transcriptor.md)** — Aufnahme/Visualizer, segmentierter Upload, serverseitige Normalisierung & Transkription (Whisper), Limits/Quoten, Security

## Architecture Decision Records (ADRs)

Dokumentierte Architekturentscheidungen finden Sie im [adrs/](./adrs/) Verzeichnis:

### Aktive ADRs

- **[ADR-0001: Astro + Cloudflare Stack](./adrs/0001-astro-cloudflare-stack.md)** — Entscheidung für Astro und Cloudflare
- **[ADR-0002: Cloudflare Architecture](./adrs/0002-cloudflare-architecture.md)** — Details zur Cloudflare-Architektur
- **[ADR-0003: Astro Frontend Architecture](./adrs/0003-astro-frontend-architecture.md)** — Frontend-Architekturentscheidungen
- **[ADR-0004: Database Schema](./adrs/0004-database-schema.md)** — Datenbank-Design-Entscheidungen
- **[ADR-0005: Auth Route Locale Normalisierung](./adrs/0005-auth-route-locale-normalisierung.md)** — Locale-Handling in Auth-Routes
- **[ADR-0006: Dev Echo in Nicht-Prod-Umgebungen](./adrs/0006-dev-echo-non-prod.md)** — Deterministisches Dev-Echo für AI Image Enhancer

### Deprecated ADRs

Veraltete Architekturentscheidungen (z.B. JWT-Auth) befinden sich in [adrs/deprecated/](./adrs/deprecated/).

## Code Reviews

Detaillierte Code-Reviews und Analysen finden Sie in [reviews/](./reviews/):

- **[Image Enhancer Usage Pill & Plan-Anzeige](./reviews/BEWERTUNG_LOGIKREVIEW_IMAGE-ENHANCER_USAGE-PILL_PLANANZEIGE.md)** — Review des Image Enhancer UI-Upgrades

## Weitere Dokumentation

- **[API Documentation](../api/)** — API-Endpunkte und OpenAPI-Spezifikation
- **[Development Documentation](../development/)** — Entwicklungs-Workflows und Setup
- **[Frontend Documentation](../frontend/)** — UI/UX-Komponenten und Design System
- **[Security Documentation](../security/)** — Sicherheits-Features und Best Practices
