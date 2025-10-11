# 💻 Development Documentation

Umfassende Anleitung für die Entwicklung mit Evolution Hub, inklusive Setup, Workflows, Tools und Best Practices für lokale Entwicklung und CI/CD.

## Übersicht

Diese Dokumentation beschreibt die komplette Entwicklungs-Umgebung für Evolution Hub, von der lokalen Einrichtung bis hin zu Production-Deployments. Basierend auf modernen Tools wie Astro, Cloudflare Workers und automatisierten CI/CD-Pipelines.

## 📚 Hauptthemen

### Lokale Entwicklung

- **[Local Development](./local-development.md)** — **Hauptdokument** für lokale Entwicklungsumgebung
- **[Debug Panel Usage](./debug-panel-usage.md)** — Hybrid-Debug-Panel für Live-Log-Streaming
- **[Hybrid Logging System](./hybrid-logging-system.md)** — WebSocket/SSE-basiertes Logging für Astro/Wrangler Dev
- **[TypeScript Integration](./typescript-integration.md)** — TypeScript-Setup und Best Practices

### CI/CD & Deployment

- **[CI/CD Pipeline](./ci-cd.md)** — Vollständige CI/CD-Dokumentation
- **[Testing Guidelines](./testing-guidelines.md)** — Richtlinien für Unit-, Integration- und E2E-Tests
- **[Stripe Setup](./stripe-setup.md)** — Stripe-Integration für Payments und Subscriptions

### Third-Party Integrationen

- **[Stytch OAuth Dev Guide](./stytch-oauth-dev-guide.md)** — Stytch-Integration und Custom-Domain-Setup

### Bugfixes & Features

- **[Bugfix: Session Cookie Fallback](./bugfix-session-cookie-fallback.md)** — Session-Cookie-Fallback-Implementierung
- **[Inline TS Refactor](./inline-ts-refactor.md)** — Refactoring von Inline-TypeScript zu dedizierten Dateien

### Tools & Hilfsmittel

- **[Icon Guidelines](./icon-guidelines.md)** — Verwendung von Icons (Heroicons, Lottie)
- **[Docs Style Guide](./docs-style-guide.md)** — Richtlinien für Dokumentations-Erstellung

## 🚀 Schnellstart-Guides

### Für neue Entwickler

1. **[Setup Guide](../../guides/setup.md)** — Schnellstart-Anleitung für lokale Entwicklung
2. **[Local Development](./local-development.md)** — Detaillierte Anleitung für lokale Umgebung
3. **[Debug Panel Usage](./debug-panel-usage.md)** — Aktivieren Sie das Debug-Panel für Entwicklung

### Für erfahrene Entwickler

1. **[CI/CD Pipeline](./ci-cd.md)** — Verstehen Sie die Deployment-Pipeline
2. **[Testing Guidelines](./testing-guidelines.md)** — Schreiben Sie effektive Tests
3. **[TypeScript Integration](./typescript-integration.md)** — Nutzen Sie TypeScript optimal

## 📖 Verwandte Kategorien

- **[🏗️ Architecture](../architecture/)** — Systemarchitektur und Design-Entscheidungen
- **[🧪 Testing](../testing/)** — Teststrategie und Coverage
- **[🔒 Security](../security/)** — Sicherheits-Features und Best Practices
- **[⚙️ Operations](../operations/)** — Operative Dokumentation

## 🔍 Navigation

### Nach Entwicklungs-Phase

**"Ich möchte lokal entwickeln"**
→ [Setup Guide](../../guides/setup.md) → [Local Development](./local-development.md)

**"Ich möchte Features entwickeln"**
→ [TypeScript Integration](./typescript-integration.md) → [Testing Guidelines](./testing-guidelines.md)

**"Ich möchte deployen"**
→ [CI/CD Pipeline](./ci-cd.md) → [Debug Panel Usage](./debug-panel-usage.md)

**"Ich möchte Third-Party integrieren"**
→ [Stytch OAuth Dev Guide](./stytch-oauth-dev-guide.md) → [Stripe Setup](./stripe-setup.md)

### Nach Dokument-Typ

- **[📋 Setup](./local-development.md)** — Entwicklungsumgebung einrichten
- **[🔧 Tools](./debug-panel-usage.md)** — Entwicklungs-Tools und Hilfsmittel
- **[🚀 Deployment](./ci-cd.md)** — CI/CD und Deployment-Prozesse
- **[🐛 Debugging](./hybrid-logging-system.md)** — Debugging und Logging

## 📝 Standards

### Code-Standards

- **TypeScript Strict Mode** — Alle neuen Dateien verwenden strikte Typisierung
- **Import-Pfade** — Verwenden Sie `@/*` Aliase, niemals relative Pfade mit `../`
- **Error Handling** — Konsistente Fehlerbehandlung mit `createApiSuccess`/`createApiError`
- **Logging** — Strukturierte Logs mit Security-Logger für sensible Operationen

### Entwicklungs-Workflow

- **Zwei-Terminal-Setup** — Parallele Ausführung von Build-Watch und Dev-Server
- **Hot Reload** — Schnelle Iteration mit Astro Dev Server
- **Debug Panel** — Live-Log-Streaming für effektives Debugging
- **Testing First** — Tests vor Feature-Implementierung schreiben

### Dokumentations-Standards

- **Bei Code-Änderungen** — Dokumentation gleichzeitig aktualisieren
- **Klare Beispiele** — Praktische Code-Beispiele für alle Features
- **Troubleshooting** — Häufige Probleme und Lösungen dokumentieren
- **Cross-Referenzen** — Verwandte Dokumente verlinken

## 🔧 Wichtige Kommandos

### Lokale Entwicklung

```bash
# Zwei-Terminal-Setup
npm run dev              # Terminal 1: Worker Dev (Port 8787)
npm run dev:astro        # Terminal 2: Astro Dev (schnell, UI-only)

# Alternative
npm run menu             # Interaktives Menü für alle Optionen
```

### Build & Deployment

```bash
npm run build:worker     # Produktions-Build
npm run build:worker:staging  # Staging-Build
npm run build:worker:dev      # Entwicklungs-Build
```

### Testing

```bash
npm test                 # Unit Tests (Watch)
npm run test:once        # Unit Tests (Single Run)
npm run test:coverage    # Mit Coverage Report
npm run test:e2e         # E2E Tests
```

### Code Quality

```bash
npm run lint             # ESLint Check
npm run format           # Prettier Format
npx astro check          # TypeScript Check
```

## 🤝 Contribution

Bei Entwicklungs-Dokumentation:

1. **Testen Sie lokale Setup-Anweisungen** vor der Dokumentation
2. **Dokumentieren Sie neue Features** sofort nach der Implementierung
3. **Aktualisieren Sie Troubleshooting** bei bekannten Problemen
4. **Prüfen Sie Cross-Referenzen** bei Änderungen

## 📚 Ressourcen

- **Astro Documentation:** [docs.astro.build](https://docs.astro.build/)
- **Cloudflare Workers:** [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)
- **Vitest:** [vitest.dev](https://vitest.dev/)
- **Playwright:** [playwright.dev](https://playwright.dev/)
- **Stytch Documentation:** [stytch.com/docs](https://stytch.com/docs)

---

**Kategorie-Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-10
**Verantwortlich:** Development Team
