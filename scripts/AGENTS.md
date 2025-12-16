# AGENTS.md (Scripts)

Geltung: `scripts/*` (inkl. `scripts/dev`, `scripts/setup`).

Baseline-Rules für Skripte:

- Infra/Struktur: `.windsurf/rules/infra.md`, `.windsurf/rules/project-structure.md`.
- Qualität/Automation (falls zutreffend): `.windsurf/rules/testing-and-ci.md`, `.windsurf/rules/docs-documentation.md`, `.windsurf/rules/zod-openapi.md`.

## Richtlinien

- Skripte sind idempotent und sicher; keine destruktiven Defaults.
- ESM/TS‑Konventionen beibehalten (Dateiendungen `.mjs`/`.ts` entsprechend vorhandenen Mustern).
- Kein unkontrolliertes Network/Prod‑Schreiben ohne Flag/Konfiguration.
- Logging informativ, ohne Secrets/PII; sinnvolle Exit‑Codes verwenden.

## Tests & Dry‑Runs

- Wenn sinnvoll, Dry‑Run‑Modus anbieten.
- Kritische Migrationen/Publishes mit klaren Rollback‑Hinweisen dokumentieren.
