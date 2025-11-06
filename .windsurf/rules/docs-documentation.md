---
trigger: always_on
---

# Docs & Documentation Rules

## Zweck

Verbindliche Leitplanken für alle Änderungen im [docs/](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs:0:0-0:0)-Verzeichnis. Stellt sicher, dass Dokumentation konsistent strukturiert, gepflegt und mit dem Code synchron bleibt.

## Muss

- **Frontmatter**
  - Jedes Markdown-Dokument in [docs/](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs:0:0-0:0) startet mit YAML-Frontmatter: `description`, `owner`, `priority`, `lastSync`, `codeRefs` (falls relevant), `testRefs` (falls relevant).
  - `lastSync` spiegelt den Abgleich mit Code/Konfiguration wider (Format `YYYY-MM-DD`).
  - `codeRefs`/`testRefs` referenzieren Pfade oder Globs; bei keiner Referenz `N/A` verwenden.
- **Struktur**
  - Neue Dokumente nur innerhalb bestehender Kategorien ([architecture](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/architecture:0:0-0:0), [development](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/development:0:0-0:0), [frontend](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/frontend:0:0-0:0), [security](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/security:0:0-0:0), [testing](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/testing:0:0-0:0), [ops](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/ops:0:0-0:0), …).
  - Jede Kategorie besitzt ein README als Index. Neue Dateien müssen dort verlinkt werden.
  - Archivierte Inhalte gehören ausschließlich nach [docs/archive/](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/archive:0:0-0:0) und werden aus aktiven Docs nicht mehr verlinkt.
- **Inhalt & Konsistenz**
  - Aussagen zu APIs, Middleware, Limiter, Env-Vars und Workflows gegen den aktuellen Codebestand prüfen.
  - Keine Platzhalter oder TODOs in `[Klammern]`; stattdessen `TODO: …` schreiben.
  - Relative Links (`./`) und funktionierende Anker gemäß GitHub-Slug-Regel verwenden.
  - Screenshots/GIFs nur unter [docs/media/](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/media:0:0-0:0) ablegen; großformatige Videos vermeiden.
  - Beim Entfernen von Dokumenten alle Verweise in anderen Dateien aktualisieren.
  - Archiv-Dokumente eindeutig als historisch kennzeichnen und dort belassen; Reaktivierung nur nach Review.

## Sollte

- `lastSync` pflegen und Änderungen im Changelog der Kategorie festhalten.
- Screenshots mit kurzen Captions versehen; CLI-Beispiele mit `bash`/`sh` hervorheben.
- Deployment-/Runbook-Dokumente in Abschnitte für Ablauf, Validierung und Rollback gliedern.
- Bei Unsicherheit auf bestehende Regeln (`tooling-and-style`, `project-structure`, `content`) verweisen.

## Review-Checkliste

- Markdownlint & Prettier laufen (`npm run docs:lint`, `npm run format:check`).
- Link-Check (`npm run docs:links` oder manuell) ohne Fehler.
- Frontmatter vollständig und aktuell (`lastSync` angepasst).
- Kategorie-README oder Changelog listet neue/entfernte Dokumente.
- Keine toten Links oder Verweise auf gelöschte Dateien.
- Bei API-/Infra-Themen: Deployment-Guide/Runbooks auf Aktualität prüfen.

## Bekannte Stolperfallen

- Verweise auf nicht existente Dateien (`blog-system.md`, `feature-roadmap.md`, …) unbedingt vermeiden.
- `[TODO]` löst Markdownlint-Fehler aus → immer `TODO:` verwenden.
- Emoji in Überschriften verändert Slugs → entweder ohne Emoji oder mit zusätzlichem Anker arbeiten.
- Archiv-README muss echte Dateien auflisten → bei jeder Änderung synchron halten.

## Code-/Dok-Anker

- [docs/README.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/README.md:0:0-0:0)
- [docs/ops/deployment-guide.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/ops/deployment-guide.md:0:0-0:0)
- [docs/ops/runbook-image-enhancer-go-live.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/docs/ops/runbook-image-enhancer-go-live.md:0:0-0:0)
- `docs/security/README.md`
- [.windsurf/rules/tooling-and-style.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/tooling-and-style.md:0:0-0:0)
- [.windsurf/rules/project-structure.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/project-structure.md:0:0-0:0)
- [.windsurf/rules/content.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/content.md:0:0-0:0)

## Changelog

- 2025-11-06: Erstfassung der Docs-Regel (Baselines, Frontmatter, Review-Checkliste, Anti-Patterns).
