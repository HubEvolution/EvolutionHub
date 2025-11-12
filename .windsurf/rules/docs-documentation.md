---
trigger: always_on
---

# Docs & Documentation Rules

## Zweck

Verbindliche Leitplanken für alle Änderungen im `docs/`‑Verzeichnis. Stellt sicher, dass Dokumentation konsistent strukturiert, gepflegt und mit dem Code synchron bleibt.

## Muss

- Frontmatter
  - Jedes Markdown‑Dokument in `docs/` startet mit YAML‑Frontmatter: `description`, `owner`, `priority`, `lastSync`, `codeRefs` (falls relevant), `testRefs` (falls relevant).
  - `lastSync` spiegelt den Abgleich mit Code/Konfiguration wider (Format `YYYY-MM-DD`).
  - `codeRefs`/`testRefs` referenzieren Pfade oder Globs; bei keiner Referenz `N/A` verwenden.
- Struktur
  - Neue Dokumente nur innerhalb bestehender Kategorien (`docs/architecture`, `docs/development`, `docs/frontend`, `docs/security`, `docs/testing`, `docs/ops`, …).
  - Jede Kategorie besitzt ein README als Index. Neue Dateien müssen dort verlinkt werden.
  - Archivierte Inhalte gehören ausschließlich nach `docs/archive/` und werden aus aktiven Docs nicht mehr verlinkt.
- Inhalt & Konsistenz
  - Aussagen zu APIs, Middleware, Limiter, Env‑Vars und Workflows gegen den aktuellen Codebestand prüfen.
  - Keine Platzhalter oder TODOs in `[Klammern]`; stattdessen `TODO: …` schreiben.
  - Relative Links (`./`) und funktionierende Anker gemäß GitHub‑Slug‑Regel verwenden.
  - Screenshots/GIFs nur unter `docs/media/` ablegen; großformatige Videos vermeiden.
  - Beim Entfernen von Dokumenten alle Verweise in anderen Dateien aktualisieren.
  - Archiv‑Dokumente eindeutig als historisch kennzeichnen und dort belassen; Reaktivierung nur nach Review.

## Sollte

- `lastSync` pflegen und Änderungen im Changelog der Kategorie festhalten.
- Screenshots mit kurzen Captions versehen; CLI‑Beispiele mit `bash`/`sh` hervorheben.
- Deployment‑/Runbook‑Dokumente in Abschnitte für Ablauf, Validierung und Rollback gliedern.
- Bei Unsicherheit auf bestehende Regeln (Tooling & Style, Project Structure, Content) verweisen.

## Review‑Checkliste

- Markdownlint & Prettier laufen (`npm run docs:lint`, `npm run format:check`).
- Link‑Check (`npm run docs:links` oder manuell) ohne Fehler.
- Frontmatter vollständig und aktuell (`lastSync` angepasst).
- Kategorie‑README oder Changelog listet neue/entfernte Dokumente.
- Keine toten Links oder Verweise auf gelöschte Dateien.
- Bei API‑/Infra‑Themen: Deployment‑Guide/Runbooks auf Aktualität prüfen.

## Bekannte Stolperfallen

- Verweise auf nicht existente Dateien unbedingt vermeiden.
- `TODO:` korrekt schreiben (kein `[TODO]`).
- Emoji in Überschriften verändert Slugs → entweder ohne Emoji oder mit zusätzlichem Anker arbeiten.
- Archiv‑README muss echte Dateien auflisten → bei jeder Änderung synchron halten.

## Code-/Dok‑Anker

- `docs/README.md`
- `docs/ops/deployment-guide.md`
- `docs/ops/runbook-image-enhancer-go-live.md`
- `docs/security/README.md`
- [.windsurf/rules/tooling-and-style.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/tooling-and-style.md:0:0-0:0)
- [.windsurf/rules/project-structure.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/project-structure.md:0:0-0:0)
- [.windsurf/rules/content.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/content.md:0:0-0:0)

## Changelog

- 2025‑11‑06: Erstfassung der Docs‑Regel (Baselines, Frontmatter, Review‑Checkliste, Anti‑Patterns).