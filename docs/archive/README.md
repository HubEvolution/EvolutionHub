---
description: 'Archivierte und obsolete Dokumentation für Evolution Hub'
owner: 'Documentation Team'
priority: 'low'
lastSync: '2025-10-27'
codeRefs: 'N/A'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Archivierte Dokumentation

**Scope** — Diese Kategorie enthält archivierte, obsolete oder historische Dokumentation, die nicht mehr aktiv gepflegt wird. Umfasst abgeschlossene Migrations-Dokumente, veraltete Planungsdokumente und deprecated Features. Zielgruppe sind Entwickler mit historischem Kontext-Bedarf. Nicht enthalten: Aktuelle Dokumentation (→ entsprechende Kategorien).

## Primärdokumente

- **[migration_pages_zu_worker.md](./migration_pages_zu_worker.md)** — Abschlussbericht zur Migration von Cloudflare Pages zu Workers (Stand: 2025-10-01)

- **[documentation-gap-analysis.md](./documentation-gap-analysis.md)** — Historische Gap-Analyse, die das aktuelle Docs-Refactoring vorbereitet hat

- **[status-assessment.md](./status-assessment.md)** — Projektstatus-Snapshot vor dem Docs-Refresh (veraltet)

## Cross-Referenzen

- **[Architecture](../architecture/)** — Aktuelle Architektur-Dokumentation

- **[Development](../development/)** — Aktuelle Entwicklungs-Workflows

- **[Security](../security/)** — Aktuelle Security-Implementation

## Ownership & Maintenance

**Owner:** Documentation Team (Lead: Technical Writer)
**Update-Frequenz:** Nur bei neuer Archivierung (selten)
**Review-Prozess:** Minimal - nur Vollständigkeits-Check
**Eskalation:** Bei Bedarf für historische Kontext → Architecture Team

## Standards & Konventionen

- **Archivierungs-Kriterien:** Dokumente werden hierhin verschoben, wenn sie nicht mehr relevant sind

- **Status-Markierung:** Alle archivierten Dokumente müssen als "historisch" markiert sein

- **Referenzen:** Keine Links von aktiver Dokumentation hierhin (um Dead Links zu vermeiden)

- **Aufbewahrung:** Mindestens 2 Jahre, dann optionale Löschung

## Bekannte Lücken

- TODO: Vollständige Inventur aller archivierten Dokumente

- TODO: Automatisches Archivierungs-Script für veraltete Dokumentation

### migration_pages_zu_worker.md

- **Status:** Abgeschlossen

- **Archiviert am:** 2025-10-01

- **Grund:** Die Migration von Cloudflare Pages zu Cloudflare Workers wurde erfolgreich abgeschlossen. Das Projekt nutzt jetzt Workers mit Static Assets (`wrangler.toml` konfiguriert).

- **Referenz:** Siehe aktuelle `wrangler.toml` Konfiguration

### documentation-gap-analysis.md

- **Status:** Abgeschlossen

- **Archiviert am:** 2025-10-01 (Phase 5)

- **Grund:** Gap-Analyse diente als Planungsgrundlage für das Dokumentations-Refactoring (Phase 1-6). Refactoring ist abgeschlossen. Die identifizierten Lücken wurden durch neue Kategorie-READMEs und strukturelle Verbesserungen adressiert.

- **Referenz:** Siehe aktuelle Dokumentationsstruktur in `/docs`

### status-assessment.md

- **Status:** Veraltet

- **Archiviert am:** 2025-10-01 (Phase 5)

- **Grund:** Status-Assessment war ein Snapshot aus einem älteren Zeitpunkt. Aktueller Projektstatus ist in README.md, SETUP.md und den Kategorie-spezifischen READMEs dokumentiert.

- **Referenz:** Siehe [README.md](../../README.md) und Kategorie-READMEs in `/docs`
