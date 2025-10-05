# Evolution Hub Documentation

Willkommen zur Evolution Hub Dokumentation. Diese Dokumentation bietet umfassende Informationen zu Architektur, Entwicklung, Deployment, Testing und Sicherheit.

## 📚 Dokumentations-Kategorien

### Core Documentation

- **[Architecture](./architecture/)** — Systemarchitektur, Auth-Flow, ADRs
  - System-Übersicht und Datenflüsse
  - Authentifizierungs-Architektur (Stytch Magic Link)
  - Architecture Decision Records (ADRs)
  - Code-Reviews und Analysen

- **[Development](./development/.)** — Entwicklungs-Workflows, Tools, Setup
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
  - [Blog-System](./features/blog-system.md) — Content Collections, BlogService, CTA-Integration (Production-Ready 75%)
  - [Comment-System](./features/comment-system.md) — CRUD, Moderation, Security (Production-Ready 80%)

### Operational Documentation

- **[Operations](./ops/)** — Operative Dokumentation
  - Stytch-Integration und Custom-Domain-Setup
  - Third-Party-Service-Status

- **[Archive](./archive/)** — Archivierte/Obsolete Dokumentation
  - Abgeschlossene Migrations-Dokumente
  - Veraltete Planungsdokumente

## 🚀 Schnellstart-Guides

### Für neue Entwickler

1. **Setup:** [SETUP.md](./SETUP.md) — Schnellstart-Anleitung für lokale Entwicklung
2. **Lokale Entwicklung:** [Development: Local Development](./development/local-development.md) — Detaillierte Anleitung für lokale Umgebung
3. **Architektur-Übersicht:** [Architecture: System Overview](./architecture/system-overview.md) — Verstehen Sie die Systemarchitektur
4. **Testing:** [Testing: Strategy](./testing/testing-strategy.md) — Wie Tests geschrieben werden

### Für Contributors

1. **CONTRIBUTING.md** (Root) — Richtlinien für Contributions
2. **[Cheat Sheet](./cheat-sheet.md)** — Wichtige Kommandos und Workflows
3. **[CI/CD](./development/ci-cd.md)** — GitHub Actions und Deployment-Pipeline
4. **[Testing Guidelines](./development/testing-guidelines.md)** — Testing-Best-Practices

### Für Security-Reviews

1. **[Security: README](./security/README.md)** — Übersicht aller Security-Features
2. **[Security: Improvements](./security/improvements.md)** — Implementierte Sicherheitsverbesserungen
3. **[Auth Architecture](./architecture/auth-architecture.md)** — Authentifizierungs-Flow und Sicherheit
4. **SECURITY.md** (Root) — Vulnerability-Reporting-Policy

### Für UI/UX-Entwicklung

1. **[Frontend: Design System](./frontend/design-system.md)** — Design-Tokens und Style-Guide
2. **[Frontend: UI Components](./frontend/ui-components.md)** — Komponenten-Leitfaden
3. **[Frontend: UI/UX Guidelines](./frontend/ui-ux.md)** — UX-Prinzipien und Best Practices
4. **[Animation](./animation.md)** — Typewriter-Animation und Implementation

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

### Product

- **[Feature Roadmap](./feature-roadmap.md)** — Produkt-Roadmap und geplante Features

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
```

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
2. Kategorie-README.md aktualisieren, wenn neue Dokumente hinzugefügt werden
3. Links und Referenzen überprüfen
4. Conventional Commit Messages verwenden (`docs: ...`)

## 📚 Weitere Ressourcen

- **GitHub Repository:** [Evolution Hub GitHub](https://github.com/HubEvolution/evolution-hub)
- **Astro Documentation:** [docs.astro.build](https://docs.astro.build/)
- **Cloudflare Workers:** [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)
- **Vitest:** [vitest.dev](https://vitest.dev/)
- **Playwright:** [playwright.dev](https://playwright.dev/)

---

**Letzte Aktualisierung:** 2025-10-01 (Phase 6: Dokumentations-Refactoring)
