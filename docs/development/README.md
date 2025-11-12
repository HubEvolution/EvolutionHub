---
description: 'Entwicklungs-Workflows, Tools, Setup-Anleitungen und Best Practices für Evolution Hub'
owner: 'Development Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'package.json, wrangler.toml, vitest.config.ts'
testRefs: 'tests/unit, tests/integration, test-suite-v2'
---

<!-- markdownlint-disable MD051 -->

# Development Documentation

**Scope** — Diese Kategorie umfasst alle Aspekte der Entwicklung für Evolution Hub: lokale Setup, CI/CD-Pipelines, Testing-Strategien, Code-Quality-Standards und Third-Party-Integrationen. Zielgruppe sind Entwickler, DevOps-Ingenieure und Contributors. Nicht enthalten: Produktions-Operationen (→ Ops-Kategorie) oder UI/UX-Design (→ Frontend-Kategorie).

## Primärdokumente

- **[Local Development](./local-development.md)** — **Hauptdokument** für lokale Entwicklungsumgebung (Setup, Tools, Workflows)

- **[CI/CD Pipeline](./ci-cd.md)** — Vollständige CI/CD-Dokumentation (GitHub Actions, Gates, Deployment)

- **[Testing Guidelines](./testing-guidelines.md)** — Verbindliche Praktiken für Unit-, Integration- und E2E-Tests

## Sekundär-/Spezialdokumente

- **[TypeScript Integration](./typescript-integration.md)** — TypeScript-Setup und Best Practices

- **[Debug Panel Usage](./debug-panel-usage.md)** — Hybrid-Debug-Panel für Live-Log-Streaming

- **[Hybrid Logging System](./hybrid-logging-system.md)** — WebSocket/SSE-basiertes Logging

- **[Icon Guidelines](./icon-guidelines.md)** — Icon-Verwendung (Heroicons, Lottie)

- **[Stripe Setup](./stripe-setup.md)** — Stripe-Integration für Payments

## Feature-Dokumentation

### Auth & Security

- **[Stytch OAuth Dev Guide](./stytch-oauth-dev-guide.md)** — Authentifizierungsflow, PKCE, Sessionverhalten

- **[Bugfix: Session Cookie Fallback](./bugfix-session-cookie-fallback.md)** — Session-Cookie-Implementierung

### Customer-Facing APIs

- **[API Validation Workflow](./api-validation.md)** — Validierung & Tooling für formbasierte APIs

### Dashboard-Updates (2025-09)

- **[Stripe Setup](./stripe-setup.md)** — Billing/Newsletter-Integration inkl. API-Endpunkte

## Pull Request Dokumentation

Dokumentierte PRs in [prs/](./prs/):

- **[Image Enhancer Help UI](./prs/imag-enhancer-help-ui.md)** — PR-Dokumentation für Help-UI

## Cross-Referenzen

- **[Architecture](../architecture/)** — Systemarchitektur und Design-Entscheidungen

- **[Testing](../testing/README.md)** — Teststrategie und Coverage-Roadmap

- **[Frontend](../frontend/)** — UI/UX-Entwicklung und Design-System

- **[Security](../security/)** — Sicherheitsfeatures und Best Practices

## Ownership & Maintenance

**Owner:** Development Team (Lead: Tech Lead)
**Update-Frequenz:** Wöchentlich (bei Script-/Config-Änderungen) oder bei neuen Features
**Review-Prozess:** Peer-Review + automatisierte Checks (CI-Gates)
**Eskalation:** Bei Tooling-Konflikten → Tech Lead

## Standards & Konventionen

- **Script-Dokumentation:** Inline-Kommentare + README pro Script

- **Code-Sync:** Bei Änderungen in `package.json`, `wrangler.toml`, `vitest.config.ts` entsprechende Docs aktualisieren

- **Testing:** Mindestens 70% Coverage, siehe [Testing Guidelines](./testing-guidelines.md)

- **Sprache:** Deutsch mit englischen Fachbegriffen

- **Beispiele:** Aktuelle Kommandozeilen-Befehle und Konfigurationen

## Bekannte Lücken

- TODO: Vollständige Docker-Setup-Dokumentation

- TODO: Performance-Optimierung für lokale Entwicklung

- TODO: IDE-Integration (VS Code, Cursor) Guidelines

## Übersicht

Evolution Hub nutzt moderne Entwicklungs-Tools und -Workflows:

- **Local Development**: Wrangler Dev + Astro Dev-Server

- **CI/CD**: GitHub Actions mit vollautomatischen Deployments

- **Testing**: Vitest (Unit), Playwright (E2E)

- **TypeScript**: Strict-Mode mit Astro Check

## Getting Started

### Lokale Entwicklung

- **[Local Development](./local-development.md)** — **Hauptdokument** für lokale Entwicklungsumgebung
  - Zwei-Terminal-Setup (Build-Watch + Dev-Server)

  - Interaktives Menü (`npm run menu`)

  - Datenbank-Setup und Migrationen

  - Wrangler-Konfiguration

  - Fehlerbehebung

Siehe auch: [../SETUP.md](../SETUP.md) für Schnellstart-Anleitung

## CI/CD & Testing

### Continuous Integration & Deployment

- **[CI/CD Pipeline](./ci-cd.md)** — Vollständige CI/CD-Dokumentation
  - GitHub Actions Workflows

  - CI-Gates (Lint, Tests, Security, TypeScript)

  - Automatisches Deployment (via Tags oder manuell)

  - Health-Check-System

  - Rollback-Strategien

  - Secrets & Konfiguration

### Testing

- **[Testing Guidelines](./testing-guidelines.md)** — Richtlinien für Unit-, Integration- und E2E-Tests

- Siehe auch: [../testing/](../testing/) für Test-Strategie und Coverage-Roadmap

## Code Quality & Standards

### TypeScript

- **[TypeScript Integration](./typescript-integration.md)** — TypeScript-Setup und Best Practices

- **[Inline TS Refactor](./inline-ts-refactor.md)** — Refactoring von Inline-TypeScript zu dedizierten Dateien

### Development Tools

- **[Debug Panel Usage](./debug-panel-usage.md)** — Hybrid-Debug-Panel für Live-Log-Streaming

- **[Hybrid Logging System](./hybrid-logging-system.md)** — WebSocket/SSE-basiertes Logging für Astro/Wrangler Dev

- **[Icon Guidelines](./icon-guidelines.md)** — Verwendung von Icons (Heroicons, Lottie)

## Third-Party Integrations

- **[Stripe Setup](./stripe-setup.md)** — Stripe-Integration für Payments und Subscriptions

## Feature Documentation

### Auth & Security

- **[Stytch OAuth Dev Guide](./stytch-oauth-dev-guide.md)** — Authentifizierungsflow, PKCE und Session-Verhalten

- **[Bugfix: Session Cookie Fallback](./bugfix-session-cookie-fallback.md)** — Session-Cookie-Fallback-Implementierung

- **Kontolöschung mit Abo-Schutz** — `DELETE /api/user/account` blockiert aktive Stripe-Abonnements (Status `active`, `trialing`, `past_due`). Die API liefert den Fehlercode `subscription_active` inklusive Plan-Details; Nutzer:innen können entweder zur Abrechnung wechseln oder die Kündigung automatisch zum Periodenende terminieren lassen.

### Dashboard Updates (2025-09)

- Neues Dashboard-Layout mit Karten für **Billing & Plan**, **Werkzeuge im Schnellzugriff**, **Newsletter-Einstellungen** und **Empfehlungen**.

- APIs:
  - `GET /api/dashboard/billing-summary` liefert Plan-, Status- und Credit-Daten aus `subscriptions` + KV.

  - `POST /api/billing/cancel` markiert aktive Stripe-Subscriptions für eine Kündigung zum Periodenende.

  - `POST /api/newsletter/unsubscribe` ermöglicht opt-out, optional erneutes Opt-in via bestehender Subscribe-Route.

  - `GET /api/dashboard/recommendations` gibt Tool- und Dokumenten-Empfehlungen abhängig von der Locale zurück.

- UI-Komponenten: `BillingCard`, `NewsletterPreferencesCard`, `ToolShortcutsCard`, `RecommendationsCard` (siehe `src/components/dashboard/`).

## Pull Requests

Dokumentierte PRs und Feature-Implementierungen finden Sie in [prs/](./prs/):

- **[Image Enhancer Help UI](./prs/imag-enhancer-help-ui.md)** — PR-Dokumentation für Image Enhancer Help-UI

## Weitere Dokumentation

- **[Architecture Documentation](../architecture/)** — Systemarchitektur und Design-Entscheidungen

- **[Frontend Documentation](../frontend/)** — UI/UX-Komponenten und Design System

- **[API Documentation](../api/)** — API-Endpunkte und OpenAPI-Spezifikation

- **[Security Documentation](../security/)** — Sicherheits-Features und Best Practices

## Schnellreferenzen

### Wichtige Kommandos

````bash

# Lokale Entwicklung (2)

npm run dev               # Worker Dev (Wrangler)
npm run dev:astro         # Astro Dev (schnell, UI-only)
npm run menu              # Interaktives Menü

# Build

npm run build:worker      # Worker Build
npm run build:watch       # Watch-Mode

# Testing (2)

npm test                  # Unit Tests (Watch)
npm run test:once         # Unit Tests (Single Run)
npm run test:coverage     # Mit Coverage Report
npm run test:e2e          # E2E Tests

# Code Quality

npm run lint              # ESLint Check
npm run format            # Prettier Format
npx astro check           # TypeScript Check

# Database

npm run setup:local       # Lokale DB einrichten + Migrationen

```text

Siehe [../cheat-sheet.md](../cheat-sheet.md) für weitere Kommandos.

```text
````
