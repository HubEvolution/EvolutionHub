# 📋 Dokumentations-Templates

Standardisierte Templates für die Erstellung neuer Dokumentation in Evolution Hub. Diese Templates gewährleisten Konsistenz und Vollständigkeit.

## Übersicht

Alle neuen Dokumente sollten auf diesen Templates basieren, um eine einheitliche Struktur und Qualität zu gewährleisten. Die Templates sind auf die verschiedenen Dokumenttypen optimiert.

## 📚 Template-Kategorien

### Dokumentationstypen

- **[📖 Standard-Dokument](./standard-document.md)** — Allgemeines Dokument für Features und Konzepte
- **[🔧 API-Dokument](./api-document.md)** — API-Endpunkte und Integrationen
- **[🏗️ Architektur-Dokument](./architecture-document.md)** — Architektur-Entscheidungen und System-Design
- **[🧪 Test-Dokument](./test-document.md)** — Test-Strategien und Implementierungen

### Spezialisierte Templates

- **[🚀 Feature-Template](./feature-template.md)** — Neue Features dokumentieren
- **[🐛 Bug-Report-Template](./bug-report-template.md)** — Strukturierte Fehlerberichte
- **[📋 ADR-Template](./adr-template.md)** — Architecture Decision Records
- **[📖 Guide-Template](./guide-template.md)** — Schritt-für-Schritt-Anleitungen

## 🚀 Schnellstart

### Neues Dokument erstellen

1. **Template auswählen** — Wählen Sie den passenden Template-Typ
2. **Template kopieren** — Kopieren Sie den Inhalt in eine neue Datei
3. **Inhalt anpassen** — Ersetzen Sie Platzhalter mit spezifischem Inhalt
4. **Links prüfen** — Stellen Sie sicher, dass alle Referenzen korrekt sind

### Template-Struktur

**Standard-Dokument:**

```markdown
# [Dokument-Titel]

## Übersicht

[Klare Beschreibung des Dokument-Zwecks]

## [Hauptabschnitt 1]

### [Unterabschnitt 1.1]

[Detaillierte Erklärung]

[Code-Beispiel oder Konfiguration]

### [Unterabschnitt 1.2]

[Praktische Anwendung]

## [Hauptabschnitt 2]

## Beispiele

[Konrekte Beispiele]

## Troubleshooting

[Häufige Probleme]

## Verwandte Dokumentation

- **[Verwandtes Dokument](./verwandt.md)** — [Warum relevant]
```

## 📖 Template-Details

### Standard-Dokument-Template

**Verwendung:**

- Feature-Dokumentation
- Konzept-Erklärungen
- Best-Practices-Dokumente

**Struktur:**

- Klare Übersicht
- Schritt-für-Schritt-Erklärungen
- Praktische Beispiele
- Troubleshooting-Sektion

### API-Dokument-Template

**Verwendung:**

- API-Endpunkt-Dokumentation
- Integration-Guides
- SDK-Dokumentation

**Struktur:**

- Endpunkt-Definitionen
- Request/Response-Beispiele
- Authentifizierungs-Anforderungen
- Rate-Limiting-Informationen

### Architektur-Dokument-Template

**Verwendung:**

- System-Design-Dokumentation
- Architecture Decision Records
- Technische Spezifikationen

**Struktur:**

- Kontext und Problemstellung
- Entscheidungs-Begründung
- Implementierungs-Details
- Alternativen-Bewertung

## 🔧 Anpassungsrichtlinien

### Dokument-Metadaten

**Jedes Dokument sollte enthalten:**

```markdown
---
title: '[Dokument-Titel]'
description: '[Kurze Beschreibung]'
last_updated: '2025-10-10'
version: '2.0.0'
author: '[Verantwortliche Person/Team]'
category: '[Kategorie]'
tags: ['tag1', 'tag2']
---
```

### Code-Beispiele

**Standard-Formatierung:**

```typescript
// Dateiname angeben
// src/lib/example.ts
import { exampleFunction } from '@lib/example';

export const myFunction = (param: string): void => {
  // Implementierung
  exampleFunction(param);
};
```

**API-Beispiele:**

```bash
# Terminal-Befehle
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' \
  http://127.0.0.1:8787/api/endpoint
```

### Cross-Referenzen

**Konsistente Link-Formatierung:**

```markdown
[Verwandtes Dokument](./verwandt.md) — [Kontext erklären]
[API-Referenz](../api/reference.md) — [Warum relevant]
[Setup-Guide](../../guides/setup.md) — [Spezifischer Nutzen]
```

## 🤝 Contribution

Bei neuen Templates:

1. **Testen Sie das Template** mit Beispiel-Inhalten
2. **Dokumentieren Sie die Verwendung** im Template selbst
3. **Halten Sie Templates aktuell** bei Format-Änderungen
4. **Sammeln Sie Feedback** von Dokumentations-Autoren

## 📚 Ressourcen

- **[Markdown Guide](https://www.markdownguide.org/)** — Markdown-Referenz
- **[Technical Writing](https://developers.google.com/tech-writing)** — Richtlinien für technisches Schreiben
- **[API Documentation](https://idratherbewriting.com/)** — Best Practices für API-Dokumentation
- **[Diagramming](https://mermaid.js.org/)** — Diagramme und Visualisierungen

---

**Template-Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-10
**Verantwortlich:** Documentation Team
