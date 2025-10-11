# 🏗️ Architecture Documentation

Umfassende Übersicht über die Systemarchitektur von Evolution Hub, inklusive Architecture Decision Records (ADRs), Code-Reviews und technische Analysen.

## Übersicht

Evolution Hub verwendet eine moderne, skalierbare Architektur basierend auf Cloudflare Workers, Astro und React. Diese Dokumentation beschreibt die Architektur-Entscheidungen, Datenflüsse und System-Komponenten.

## 📚 Hauptthemen

### System-Architektur

- **[System Overview](./system-overview.md)** — High-Level-Übersicht der gesamten Architektur
- **[Data Flow](./data-flow.md)** — Datenflüsse zwischen Komponenten und Services
- **[Database Schema](./database-schema.md)** — Datenbank-Design und Schema-Dokumentation
- **[API Middleware Inventory](./api-middleware-inventory.md)** — Übersicht aller API-Middleware

### Authentifizierung & Sicherheit

- **[Auth Architecture](./auth-architecture.md)** — Architektur der Authentifizierungs-Systems
- **[Auth Flow](./auth-flow.md)** — Detaillierter Authentifizierungs-Flow
- **[Locale Middleware](./locale-middleware.md)** — Internationalisierung und Locale-Handling

### KI & Tools

- **[AI Image Enhancer](./ai-image-enhancer.md)** — Architektur des AI Image Enhancement Systems

### Architecture Decision Records (ADRs)

- **[ADR Template](./adr/template.md)** — Standard-Template für Architektur-Entscheidungen
- **[ADR Index](./adr/index.md)** — Übersicht aller dokumentierten Entscheidungen

## 🚀 Schnellzugriff

### Für Architekten

1. **[System Overview](./system-overview.md)** — Verstehen Sie die Gesamtarchitektur
2. **[Data Flow](./data-flow.md)** — Analysieren Sie die Datenflüsse
3. **[Database Schema](./database-schema.md)** — Prüfen Sie das Datenbank-Design

### Für Entwickler

1. **[Auth Architecture](./auth-architecture.md)** — Implementieren Sie sichere Authentifizierung
2. **[API Middleware](./api-middleware-inventory.md)** — Verwenden Sie die richtige Middleware
3. **[ADRs](./adr/index.md)** — Verstehen Sie die Architektur-Entscheidungen

## 📖 Verwandte Kategorien

- **[💻 Development](../development/)** — Entwicklungs-Workflows und Tools
- **[🔒 Security](../security/)** — Sicherheits-Features und Best Practices
- **[🔌 API](../api/)** — API-Dokumentation und Endpunkte
- **[🧪 Testing](../testing/)** — Teststrategie und Coverage

## 🔍 Navigation

### Nach Architektur-Bereich

**"Ich möchte die System-Architektur verstehen"**
→ [System Overview](./system-overview.md) → [Data Flow](./data-flow.md)

**"Ich möchte Authentifizierung implementieren"**
→ [Auth Architecture](./auth-architecture.md) → [Auth Flow](./auth-flow.md)

**"Ich möchte Datenbank-Änderungen vornehmen"**
→ [Database Schema](./database-schema.md) → [Migration Guide](../../guides/database-migrations.md)

**"Ich möchte eine neue API entwickeln"**
→ [API Middleware Inventory](./api-middleware-inventory.md) → [API Standards](../../guides/api-standards.md)

### Nach Dokument-Typ

- **[📋 Übersichten](./system-overview.md)** — High-Level-Architektur-Übersichten
- **[🔄 Flows](./data-flow.md)** — Detaillierte Prozess-Flows
- **[💾 Schema](./database-schema.md)** — Datenbank- und API-Schema
- **[📝 ADRs](./adr/)** — Architecture Decision Records

## 📝 Standards

### Dokumentations-Konventionen

- **Klare Architektur-Diagramme** — Verwenden Sie standardisierte Diagramme
- **Entscheidungs-Begründung** — Dokumentieren Sie das "Warum" jeder Entscheidung
- **Technische Details** — Enthalten Sie konkrete Implementierungs-Details
- **Aktualität** — Halten Sie Schemata und Flows aktuell

### ADR-Format

Alle Architecture Decision Records folgen dem Standard-Format:

```markdown
# ADR-XXX: [Titel]

## Status

[proposed | accepted | rejected | deprecated | superseded]

## Kontext

[Problem-Beschreibung und Hintergrund]

## Entscheidung

[Getroffene Entscheidung]

## Konsequenzen

[Auswirkungen und Konsequenzen]

## Alternativen

[Alternative Lösungen und warum sie abgelehnt wurden]
```

## 🤝 Contribution

Bei Architektur-Änderungen:

1. **Erstellen Sie ein ADR** für wichtige Entscheidungen
2. **Aktualisieren Sie relevante Dokumente** bei Architektur-Änderungen
3. **Dokumentieren Sie Datenflüsse** für neue Features
4. **Prüfen Sie Sicherheits-Auswirkungen** bei Änderungen

## 📚 Ressourcen

- **Cloudflare Workers:** [Entwickler-Dokumentation](https://developers.cloudflare.com/workers/)
- **Astro Architecture:** [docs.astro.build](https://docs.astro.build/)
- **React Best Practices:** [react.dev](https://react.dev/)
- **ADR Template:** [adr.github.io](https://adr.github.io/)

---

**Kategorie-Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-10
**Verantwortlich:** Architecture Team
