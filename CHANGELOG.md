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
- locale/welcome: q‑Value‑basierte Accept‑Language‑Erkennung (best‑match `de|en`)
- locale/welcome: `?lang=de|en` als Alias zu `?set_locale=` (gleiches Guarding)
- tests(integration): `locale-routing`, `lang-alias`, `headers`, `seo-hreflang`
- D1: Notifications-Subsystem Tabellen angelegt: `notification_settings`, `email_templates`, `email_queue` inkl. Indizes; Seeds (DE) für Kommentar‑Benachrichtigungen (EN folgt mit angepasster Namens-/Locale‑Strategie).
- D1: Ops/Data-Management Tabellen angelegt: `data_export_jobs`, `data_deletion_requests`, `backup_jobs`, `system_maintenance` (TEXT‑FKs) inkl. Indizes.
- D1: WebScraper: `scraping_jobs` Tabelle mit sinnvollen Indizes erstellt.

### Changed

- docs(frontend/imag-enhancer-ui-upgrade): Hinweis ergänzt, dass die aktuelle Request-Origin automatisch erlaubt wird
- docs(frontend/imag-enhancer-ui-upgrade): Hinweis ergänzt, dass TEST_BASE_URL den laufenden Dev-Port widerspiegeln muss
- docs(development/ci-cd): Abschnitt „Geplant: Enhancer E2E Smoke (EN+DE)“ mit Lauf- und Artefaktdetails ergänzt
- Imag‑Enhancer: Tastatur‑Hinweis (i18n) erweitert – Pfeile/Shift+Pfeile, Home/End, 0, +/−, 1, L, Space (Hold)
- dev(worker): Lokale Worker-Entwicklung nutzt jetzt `build:worker:dev` (Astro `--mode development`), damit `.env.development` greift und das Debug Panel aktiv ist (siehe `docs/tools/debug-panel.md`).
- test(vitest): Projekte in `vitest.config.ts` benannt (`unit`, `integration`) und `package.json`-Skripte angepasst, sodass `--project=integration` zuverlässig funktioniert.
- docs(architecture/locale-middleware): q‑Values, `?lang` Alias, Flags `PUBLIC_WELCOME_AUTO_DELAY_MS`/`WELCOME_BYPASS_SPLASH` dokumentiert
- routes.md: `?lang` Alias und Flags für Welcome vermerkt
- D1: `notifications` auf finales Schema transformiert (`user_id` als TEXT, `is_read` als INTEGER, zusätzliche optionale Felder, neue Indizes).
- D1: `d1_migrations` aktualisiert; relevante Migrationen als angewendet markiert (0015, 0016, 0019, 0022/0023, 0026). Legacy‑Performance‑Artefakte (0017/0021) bewusst übersprungen, um Schema‑Konflikte zu vermeiden.

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
