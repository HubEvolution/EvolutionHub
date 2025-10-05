# Development Documentation

Diese Dokumentation beschreibt Entwicklungs-Workflows, Tools, Setup-Anleitungen und Best Practices für die Arbeit am Evolution Hub Projekt.

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

### Debug Panel: Filter & Header-Debug-Flags

- Standardmäßig sind die Level-Filter `error`, `warn`, `info`, `log` aktiv; `debug` ist per Default deaktiviert und wird in `localStorage.debugPanel.levelFilter` persistiert.
- Quellen-Filter (`server|client|console|network`) sowie Mute-Patterns werden ebenfalls in LocalStorage gespeichert.
- HeaderScroll-Diagnose-Flags (nur in Dev):
  - `localStorage.debug.headerScroll = '1'` oder URL-Query `?debugHeader` aktiviert ausführlichere Logs.
  - `localStorage.debug.headerScrollTrace = '1'` schaltet optionale Trace-Logs (per Scroll) frei.
  - Ohne Flags werden nur Zustandswechsel (sichtbar/hidden, Init/Cleanup) geloggt, um Log-Spam zu vermeiden.

## Third-Party Integrations

- **[Stripe Setup](./stripe-setup.md)** — Stripe-Integration für Payments und Subscriptions

## Feature Documentation

### Auth & Security

- **[Auth Flow Audit Phase 1](./auth-flow-audit-phase1.md)** — Audit-Dokumentation des Authentifizierungsflows
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

```bash
# Lokale Entwicklung
npm run dev               # Worker Dev (Wrangler)
npm run dev:astro         # Astro Dev (schnell, UI-only)
npm run menu              # Interaktives Menü

# Build
npm run build:worker      # Worker Build
npm run build:watch       # Watch-Mode

# Testing
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
```

Siehe [../cheat-sheet.md](../cheat-sheet.md) für weitere Kommandos.
