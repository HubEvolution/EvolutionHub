---
description: 'Archivierte und obsolete Dokumentation für Evolution Hub'
owner: 'Documentation Team'
priority: 'low'
lastSync: '2025-10-27'
codeRefs: 'N/A'
testRefs: 'N/A'
---

# Archivierte Dokumentation

**Scope** — Diese Kategorie enthält archivierte, obsolete oder historische Dokumentation, die nicht mehr aktiv gepflegt wird. Umfasst abgeschlossene Migrations-Dokumente, veraltete Planungsdokumente und deprecated Features. Zielgruppe sind Entwickler mit historischem Kontext-Bedarf. Nicht enthalten: Aktuelle Dokumentation (→ entsprechende Kategorien).

## Primärdokumente

- **[Migration Overview](./migration-overview.md)** — **Hauptdokument** für abgeschlossene Migrationen
- **[Deprecated Features](./deprecated-features.md)** — Auflistung veralteter Features und APIs
- **[Historical Decisions](./historical-decisions.md)** — Historische Architekturentscheidungen

## Sekundär-/Spezialdokumente

- **[Legacy Documentation](./legacy-docs.md)** — Weitere veraltete Dokumente
- **[Obsolete Processes](./obsolete-processes.md)** — Frühere Workflows und Prozesse

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

- [TODO] Vollständige Inventur aller archivierten Dokumente
- [TODO] Automatisches Archivierungs-Script für veraltete Dokumentation

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

### security-implementation-plan.md

- **Status:** Veraltet/Ersetzt
- **Archiviert am:** 2025-10-01 (Phase 5)
- **Grund:** Alter Security-Implementation-Plan wurde durch aktualisierte Dokumentation ersetzt. Aktuelle Security-Features und Implementierungen sind in `docs/security/improvements.md` dokumentiert.
- **Referenz:** Siehe [docs/security/improvements.md](../security/improvements.md) für aktuelle Implementierungen

### status-assessment.md

- **Status:** Veraltet
- **Archiviert am:** 2025-10-01 (Phase 5)
- **Grund:** Status-Assessment war ein Snapshot aus einem älteren Zeitpunkt. Aktueller Projektstatus ist in README.md, SETUP.md und den Kategorie-spezifischen READMEs dokumentiert.
- **Referenz:** Siehe [README.md](../../README.md) und Kategorie-READMEs in `/docs`
