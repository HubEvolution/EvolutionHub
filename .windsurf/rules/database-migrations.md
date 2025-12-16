---
scope: infra
extends:
  - infra.md
  - testing-and-ci.md
priority: critical
---

# Database Migrations Rules

## Zweck

Sichere, nachvollziehbare Weiterentwicklung des D1‑Schemas über deklarative SQL‑Migrations in [migrations/](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/migrations:0:0-0:0), ohne manuelle Ad‑hoc‑Änderungen in Production.

## Muss

- Pfad & Format
  - Alle Schema‑Änderungen laufen über Dateien in [migrations/](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/migrations:0:0-0:0).
  - Dateinamen sind **null‑gepadde Integer + Unterstrich + Kurzbeschreibung**:
    `NNNN_description.sql`, z. B. [0000_initial_schema.sql](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/migrations/0000_initial_schema.sql:0:0-0:0), [0033_create_discount_codes.sql](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/migrations/0033_create_discount_codes.sql:0:0-0:0).
  - Die Nummernfolge ist monoton steigend und lückenlos innerhalb des Repos (keine Neunummerierung bestehender Dateien).

- Single Responsibility
  - Jede Migration adressiert **genau ein fachliches Thema** (z. B. „create_ai_jobs_table“, „add_users_plan“).
  - Vermischen von mehrfachen, unabhängigen Features in einer Migration ist nicht erlaubt.

- Unveränderlichkeit
  - Bereits in **Staging oder Production** ausgeführte Migrationen dürfen **nicht nachträglich editiert** werden.
  - Korrekturen erfolgen immer durch **Folgemigrationen** (z. B. `0034_fix_comment_indexes.sql`), nicht durch Umschreiben historischer Dateien.

- Safety bei destruktiven Änderungen
  - Destruktive Operationen (DROP TABLE/COLUMN, breaking ALTERs) benötigen:
    - Explizite Freigabe (Tech Lead/Owner).
    - Dokumentierten Backout‑Plan (Rollback‑Migration oder klarer „Break‑Glass“-Pfad).
  - Wo möglich, zuerst **additiv** arbeiten (Spalte hinzufügen, migrieren, dann alte Spalte in separater Migration entfernen).

- Environments & Reihenfolge
  - Migrations werden **immer zuerst lokal/Testing**, dann in **Staging**, zuletzt in **Production** angewendet.
  - Die **Reihenfolge der Dateien** in [migrations/](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/migrations:0:0-0:0) ist die einzig zulässige Reihenfolge; kein Überspringen einzelner Migrations in einer Umgebung.

- Tests & Health
  - Nach Migrationsänderungen müssen mindestens:
    - `npm run test`
    - `npm run test:integration`
  - grün sein, bevor nach Staging/Production deployt wird.
  - Bei schema‑relevanten Änderungen an API/Features ist zusätzlich ein kurzer Health‑Check auf die betroffenen Endpunkte Pflicht (z. B. `/api/tools`, Billing/Enhancer‑APIs).

## Sollte

- Dokumentation
  - Komplexere Migrationen mit **Kurzkommentar** im SQL (z. B. „-- backfill legacy comments to new audit table“).
  - Relevante Änderungen im Schema‑Dokument (`docs/architecture/database-schema.md`) nachziehen.

- Schrittweise Migration
  - Datenmigration (Backfill) und Schema‑Änderung nach Möglichkeit **trennen**:
    - Migration A: neue Tabelle/Spalte.
    - Migration B: Backfill/Copy‑Daten.
    - Migration C: Entfernen veralteter Strukturen.

- Performance
  - Teure Operationen (große Backfills, Index‑Builds) bevorzugt **in mehreren kleineren Schritten** und zu Timeslots ausführen, in denen Last gering ist.
  - Index‑Änderungen möglichst explizit dokumentieren (z. B. „performance indexes for comments“ wie in bestehenden Migrations).

## Nicht

- Keine manuellen Schema‑Änderungen direkt in D1‑Production (Wrangler Console, Dashboard) ohne begleitende Migration.
- Keine nachträgliche inhaltliche Änderung von bereits ausgeführten SQL‑Migrations (nur Tippfehler‑Kommentare/Whitespace wären tolerierbar).
- Keine gemischten „Feature‑Bündel“ in einer Migration, die später nicht mehr trennscharf nachvollziehbar sind.

## Checkliste

- [ ] Neue Migration folgt dem Schema `NNNN_description.sql`.
- [ ] Migration enthält nur ein klares fachliches Thema.
- [ ] Keine bereits ausgeführte Migration wurde verändert.
- [ ] Destruktive Änderungen haben einen dokumentierten Backout‑Plan.
- [ ] Tests (`npm run test`, `npm run test:integration`) sind grün.
- [ ] Relevante Schema‑Doku wurde aktualisiert (falls nötig).
- [ ] Migration wurde in Testing/Staging erfolgreich durchlaufen, bevor sie in Production angewendet wird.

## Code‑Anker

- `migrations/*.sql`
- [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) (D1 Binding: `env.DB`)
- `docs/architecture/database-schema.md`
- `docs/ops/production-readiness-go-live.md` (DB‑bezogene Gates)

## CI/Gates

- Indirekt über bestehende Pipelines:
  - `npm run test`
  - `npm run test:integration`
  - `npm run openapi:validate` (falls API‑Schemas betroffen sind)
- Optional (Phase 2+):
  - `npm run health-check` nach Deploy, bevor Go‑Live als erfolgreich markiert wird.

## Referenzen

- [.windsurf/rules/infra.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/infra.md:0:0-0:0)
- [.windsurf/rules/testing-and-ci.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/testing-and-ci.md:0:0-0:0)
- Root `AGENTS.md` (Abschnitt DB/Migrations, sobald ergänzt)

## Changelog

- 2025-12-09: Erstfassung für D1/SQL‑Migrations (Benennung, Unveränderlichkeit, Safety, Envs, Tests).
