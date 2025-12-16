# AGENTS.md (Migrations)

Geltung: `migrations/**`.

## Baseline-Rules
- Core/Infra: `.windsurf/rules/database-migrations.md`, `.windsurf/rules/infra.md`, `.windsurf/rules/project-structure.md`.
- Qualität/Tooling: `.windsurf/rules/testing-and-ci.md`, `.windsurf/rules/tooling-and-style.md`.

## Konventionen
- Migrationen sind unveränderlich nach Merge; keine Retro-Edits, stattdessen neue Migration anfügen.
- Naming/Sequenz strikt gemäß bestehendem Nummern-/Timestamp-Schema.
- Keine destruktiven Defaults: Drops nur mit explizitem Approval/Feature-Flag + vorherigem Backup/Export.
- PII-Sicherheit beachten; keine sensiblen Daten in Logs/Seeds.

## Validierung & Tests
- Vor Merge: Migration lokal ausführen; bei DB-Änderungen Tests/Seeds anpassen.
- Integration/Smoke-Tests ergänzen, falls neue Constraints/Defaults Verhalten ändern.
- Rollback-Strategie dokumentieren (Kommentar im Migration-Header, falls relevant).
