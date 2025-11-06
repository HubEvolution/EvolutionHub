---
description: 'Hauptdokumentation für Evolution Hub - Architektur, Entwicklung, Deployment und Features'
owner: 'Documentation Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'docs/, scripts/, package.json'
testRefs: 'test-suite-v2/, tests/'
---

<!-- markdownlint-disable MD051 -->

# Evolution Hub Documentation

**Scope** — Diese Hauptdokumentation bietet den zentralen Einstiegspunkt in alle Aspekte von Evolution Hub. Umfasst Architektur, Entwicklung, Testing, Security und operative Dokumentation. Zielgruppe sind alle Projektbeteiligten: Entwickler, Architekten, QA und Operations. Nicht enthalten: Code-Implementation-Details (→ spezifische Kategorien).

## Inhaltsübersicht

- [Primärdokumente](#primärdokumente)
- [Sekundär- und Spezialdokumente](#sekundär--und-spezialdokumente)
- [Dokumentations-Kategorien](#dokumentations-kategorien)
- [Schnellstart-Guides](#schnellstart-guides)
- [Cross-Referenzen](#cross-referenzen)
- [Ownership & Maintenance](#ownership--maintenance)
- [Standards & Konventionen](#standards--konventionen)
- [Anker-Slug-Policy](#anker-slug-policy)
- [Bekannte Lücken](#bekannte-lücken)

## Primärdokumente

- **[SETUP.md](./SETUP.md)** — **Hauptdokument** für Projekt-Setup und Schnellstart

- **[Architecture Overview](./architecture.md)** — Technische Architektur und Tech-Stack

- **[Development Guide](./development/README.md)** — Entwicklungs-Workflows und Best Practices

## Sekundär- und Spezialdokumente

- **[Cheat Sheet](./cheat-sheet.md)** — Schnellreferenz für Kommandos und Workflows

- **[Content Management](./content.md)** — Content-Guidelines und SEO

- **[i18n Guide](./i18n.md)** — Internationalisierung und Locale-Management

## Dokumentations-Kategorien

### Core Documentation

- **[Architecture](./architecture/)** — Systemarchitektur, Auth-Flow, ADRs

  - System-Übersicht und Datenflüsse

  - Authentifizierungs-Architektur (Stytch Magic Link)

  - Architecture Decision Records (ADRs)

  - Code-Reviews und Analysen

- **[Development](./development/)** — Entwicklungs-Workflows, Tools, Setup

  - Lokale Entwicklungsumgebung

  - CI/CD-Pipeline und Deployment

  - Testing-Guidelines

  - TypeScript-Integration

  - Debug- und Logging-Tools

- **[Frontend](./frontend/)** — UI/UX-Design, Komponenten, Animationen

  - Design-System (Farben, Typography, Spacing)

  - UI-Komponenten (Buttons, Forms, Cards)

  - React Islands und Astro-Komponenten

  - Animationssysteme (AOS, Header-Scroll)

  - Feature-Upgrades (Image Enhancer UI)

- **[Security](./security/)** — Sicherheits-Features, Best Practices

  - Rate-Limiting-System

  - Security-Headers-Konfiguration

  - Audit-Logging

  - Input-Validierung

  - Known Issues und Improvements

- **[Testing](./testing/)** — Teststrategie, Coverage, Tools

  - Testing-Strategy (Unit, Integration, E2E)

  - Coverage-Roadmap zu 95%

  - Vitest und Playwright Setup

  - Mocking-Strategien

- **[API](./api/)** — API-Dokumentation und Spezifikation

  - API-Endpunkte und Routen

  - OpenAPI-Spezifikation

  - Known Issues und Verbesserungspotentiale

  - Auth (Magic Link): [Auth API](./api/auth_api.md)

  - Comments API: [Public API - Comments](./api/public_api.md#1-kommentare-api)

- **[Features](./features/)** — Feature-spezifische Dokumentation

  - [Blog & Comment System Plan](./features/blog+commentsystem-plan.md) — Content Collections, BlogService, Moderation (Roadmap)

### Operational Documentation

- **[Operations](./ops/)** — Operative Dokumentation

  - Stytch-Integration und Custom-Domain-Setup

  - Third-Party-Service-Status

- **[Archive](./archive/)** — Archivierte/Obsolete Dokumentation

  - Abgeschlossene Migrations-Dokumente

  - Veraltete Planungsdokumente

## Schnellstart-Guides

🚀

### Für neue Entwickler

1. **Setup:** [SETUP.md](./SETUP.md) — Schnellstart-Anleitung für lokale Entwicklung
1. **Lokale Entwicklung:** [Development: Local Development](./development/local-development.md) — Detaillierte Anleitung für lokale Umgebung
1. **Architektur-Übersicht:** [Architecture: System Overview](./architecture/system-overview.md) — Verstehen Sie die Systemarchitektur
1. **Testing:** [Testing: Strategy](./testing/testing-strategy.md) — Wie Tests geschrieben werden

### Für Contributors

1. **CONTRIBUTING.md** (Root) — Richtlinien für Contributions
1. **[Cheat Sheet](./cheat-sheet.md)** — Wichtige Kommandos und Workflows
1. **[CI/CD](./development/ci-cd.md)** — GitHub Actions und Deployment-Pipeline
1. **[Testing Guidelines](./development/testing-guidelines.md)** — Testing-Best-Practices

### Für Security-Reviews

1. **[Security: README](./security/README.md)** — Übersicht aller Security-Features
1. **[Security: Improvements](./security/improvements.md)** — Implementierte Sicherheitsverbesserungen
1. **[Auth Architecture](./architecture/auth-architecture.md)** — Authentifizierungs-Flow und Sicherheit
1. **SECURITY.md** (Root) — Vulnerability-Reporting-Policy

### Für UI/UX-Entwicklung

1. **[Frontend: Design System](./frontend/design-system.md)** — Design-Tokens und Style-Guide
1. **[Frontend: UI Components](./frontend/ui-components.md)** — Komponenten-Leitfaden
1. **[Frontend: UI/UX Guidelines](./frontend/ui-ux.md)** — UX-Prinzipien und Best Practices
1. **[Animation](./animation.md)** — Typewriter-Animation und Implementation

## Cross-Referenzen

- **[Features](./features/)** — Feature-spezifische Dokumentation

- **[Tools](./tools/)** — Tool-spezifische Dokumentation (z. B. Webscraper)

- **[Lead Magnets](./lead-magnets/)** — Marketing-Content und Lead-Generierung

## Ownership & Maintenance

**Owner:** Documentation Team (Lead: Technical Writer)
**Update-Frequenz:** Bei strukturellen Änderungen oder neuen Kategorien
**Review-Prozess:** Documentation-Review + Cross-Team-Feedback
**Eskalation:** Bei Dokumentationskonflikten → Tech Lead

## Standards & Konventionen

- **Struktur:** Kategorien mit README-Index, Standard-Frontmatter

- **Navigation:** Relative Links, keine Legacy-Routen

- **Sprache:** Deutsch (technische Begriffe auf Englisch)

- **Updates:** Bei Code-Änderungen entsprechende Dokumentation aktualisieren

- **Tools:** Markdownlint, Prettier, automatisierte Link-Checks

### Anker-Slug-Policy

- Kanonische Slugs folgen GitHub‑Stil (MD051): Kleinbuchstaben, Diakritika entfernt, Leerzeichen→Bindestrich, Sonderzeichen entfernt, Duplikate mit -2/-3 …

- Interne Links `](#...)` werden auf die kanonischen Slugs harmonisiert.

- Optional können für häufige Legacy‑Fragmente Alias‑Anker `<a id="alt-fragment"></a>` gesetzt werden.

- Skript:

  ```bash
  # Dry‑Run (Übersicht)
  npm run docs:harmonize

  # Anwenden (+ anschließend TOC aktualisieren)
  npm run docs:harmonize:write && npm run docs:toc
  ```

## Bekannte Lücken

- TODO: Vollständige Tool-Dokumentation (Webscraper, Voice Visualizer)

- TODO: Produktions-Readiness-Checklisten

- TODO: Multi-Language-Dokumentation (DE/EN)

## 📖 Wichtige Root-Dokumente

### Setup & Onboarding

- **[SETUP.md](./SETUP.md)** — Hauptdokument für Projekt-Setup und Konfiguration

- **[Cheat Sheet](./cheat-sheet.md)** — Schnellreferenz für wichtige Kommandos

### Technical Reference

- **[Architecture](./architecture.md)** — High-Level Tech-Stack und Architektur-Übersicht

- **[Database Schema Update](./db_schema_update.md)** — DB-Schema und Migrations-Dokumentation

- **[i18n](./i18n.md)** — Internationalisierung und Locale-Management

### Content & SEO

- **[Content Management](./content.md)** — Content-Guidelines und Best Practices

- **[SEO](./seo.md)** — SEO-Guidelines und Optimierung

### Security & Compliance

- **[SECURITY.md](./SECURITY.md)** — Security-Policy und Vulnerability-Reporting

## 🗂️ Dokumentationsstruktur

```plain
docs/
├── README.md                          # Diese Datei - Hauptindex
├── SETUP.md                           # Hauptdokument für Setup
├── SECURITY.md                        # Security-Policy
├── architecture/                      # System-Architektur
│   ├── README.md                      # Kategorie-Index
│   ├── adrs/                          # Architecture Decision Records
│   └── reviews/                       # Code-Reviews
├── development/                       # Entwicklungs-Dokumentation
│   ├── README.md                      # Kategorie-Index
│   └── prs/                           # PR-Dokumentation
├── frontend/                          # Frontend & UI/UX
│   └── README.md                      # Kategorie-Index
├── security/                          # Sicherheits-Dokumentation
│   └── README.md                      # Kategorie-Index
├── testing/                           # Test-Dokumentation
│   └── README.md                      # Kategorie-Index
├── api/                               # API-Dokumentation
│   └── README.md                      # Kategorie-Index
├── ops/                               # Operative Dokumentation
│   └── README.md                      # Kategorie-Index
├── lead-magnets/                      # Marketing-Content (nicht technisch)
│   └── README.md                      # Kategorie-Index
└── archive/                           # Archivierte Dokumentation
    └── README.md                      # Archive-Index

```text

## 🔍 Dokumentation finden

### Nach Aufgabe

**"Ich möchte lokal entwickeln"**
→ [SETUP.md](./SETUP.md) → [Development: Local Development](./development/local-development.md)

**"Ich möchte die Architektur verstehen"**
→ [Architecture: System Overview](./architecture/system-overview.md) → [Architecture: Data Flow](./architecture/data-flow.md)

**"Ich möchte Tests schreiben"**
→ [Testing: Strategy](./testing/testing-strategy.md) → [Development: Testing Guidelines](./development/testing-guidelines.md)

**"Ich möchte neue UI-Komponenten erstellen"**
→ [Frontend: Design System](./frontend/design-system.md) → [Frontend: UI Components](./frontend/ui-components.md)

**"Ich möchte die Security-Features verstehen"**
→ [Security: README](./security/README.md) → [Security: Improvements](./security/improvements.md)

**"Ich möchte ein Feature deployen"**
→ [Development: CI/CD](./development/ci-cd.md) → [Cheat Sheet](./cheat-sheet.md)

### Nach Kategorie

Jede Kategorie hat ein eigenes **README.md** mit Links zu allen Dokumenten in dieser Kategorie:

- `docs/architecture/README.md`

- `docs/development/README.md`

- `docs/frontend/README.md`

- `docs/security/README.md`

- `docs/testing/README.md`

- `docs/api/README.md`

- `docs/ops/README.md`

## 📝 Dokumentations-Konventionen

### Markdown-Format

- Alle Dokumentation in Markdown (`.md`)

- Relative Links für interne Verweise

- Code-Beispiele mit Syntax-Highlighting

### Struktur

- Jede Kategorie hat ein `README.md` als Index

- Haupt-Kategorie-Dokumente in Kategorie-Verzeichnissen

- Root-Dokumente nur für übergreifende Themen

### Aktualisierung

- Dokumentation bei Code-Änderungen mitpflegen

- ADRs für wichtige Architektur-Entscheidungen

- Obsolete Dokumente nach `docs/archive/` verschieben

## 🤝 Contribution

Siehe **CONTRIBUTING.md** (Root) für detaillierte Contribution-Guidelines.

Bei Dokumentations-Verbesserungen:

1. Prüfen, ob das Dokument in die richtige Kategorie gehört
1. Kategorie-README.md aktualisieren, wenn neue Dokumente hinzugefügt werden
1. Links und Referenzen überprüfen
1. Conventional Commit Messages verwenden (`docs: ...`)

## 📚 Weitere Ressourcen

- **GitHub Repository:** [Evolution Hub GitHub](https://github.com/HubEvolution/evolution-hub)

- **Astro Documentation:** [docs.astro.build](https://docs.astro.build/)

- **Cloudflare Workers:** [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)

- **Vitest:** [vitest.dev](https://vitest.dev/)

- **Playwright:** [playwright.dev](https://playwright.dev/)

---

**Letzte Aktualisierung:** 2025-10-27 (Refakturierung abgeschlossen)

```text
