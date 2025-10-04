# Changelog

Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
und dieser Projekt haftet an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CI: Neuer Workflow „Enhancer E2E Smoke (EN+DE)“ mit Artefakt-Upload (Screenshots/Videos)
- Imag‑Enhancer: Hilfe‑Modal mit Fokus‑Falle (A11y)
- Imag‑Enhancer: Unit‑Test für Fokus‑Falle & Tastaturbedienung
- feat: implement prompt enhancer v1.0.0 with ai-parsing, ui, tests

### Changed

- docs(frontend/imag-enhancer-ui-upgrade): Hinweis ergänzt, dass die aktuelle Request-Origin automatisch erlaubt wird
- docs(frontend/imag-enhancer-ui-upgrade): Hinweis ergänzt, dass TEST_BASE_URL den laufenden Dev-Port widerspiegeln muss
- docs(development/ci-cd): Abschnitt „Geplant: Enhancer E2E Smoke (EN+DE)“ mit Lauf- und Artefaktdetails ergänzt
- Imag‑Enhancer: Tastatur‑Hinweis (i18n) erweitert – Pfeile/Shift+Pfeile, Home/End, 0, +/−, 1, L, Space (Hold)
- dev(worker): Lokale Worker-Entwicklung nutzt jetzt `build:worker:dev` (Astro `--mode development`), damit `.env.development` greift und das Debug Panel aktiv ist (siehe `docs/tools/debug-panel.md`).
- test(vitest): Projekte in `vitest.config.ts` benannt (`unit`, `integration`) und `package.json`-Skripte angepasst, sodass `--project=integration` zuverlässig funktioniert.

### Deprecated

### Removed

### Fixed

- debug-panel: In Dev war das Panel deaktiviert, da vorher ein Prod-Build `.env.production` erzwang (`PUBLIC_ENABLE_DEBUG_PANEL=false`). Dev-Build-Skript korrigiert.
- tests/integration: Startfehler „No projects matched the filter \"integration\"“ behoben durch korrektes Setzen von `projects[].test.name`.

### Security

## [v1.7.0] - 2025-09-11

### Added

- Evolution Hub Bundle v1.7_full

### Changed

- Initiale Version

[Unreleased]: https://github.com/evolution-hub/evolution-hub/compare/v1.7.0...HEAD
[v1.7.0]: https://github.com/evolution-hub/evolution-hub/releases/tag/v1.7.0
