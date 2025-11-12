---
description: 'Datenbank-Schema & Migrationen – Überblick und lokale Setup-Anleitung'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: 'docs/db_schema_update.md, migrations/**, scripts/setup-local-dev.ts, scripts/seed-test-data.ts'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Datenbank-Schema und Migrationen

## Aktuelles Schema

Evolution Hub verwendet eine SQLite-Datenbank mit Cloudflare D1. Die wichtigsten Tabellen sind:

- `users` - Benutzerdaten und Authentifizierung

- `sessions` - Aktive Benutzersitzungen

- `projects` - Projektdaten

- `activities` - Benutzeraktivitäten

- `comments` - Kommentare

- `password_reset_tokens` - Tokens für Passwort-Reset (entfernt in Migration `0010_drop_password_artifacts.sql`)

- `email_verification_tokens` - Tokens für E‑Mail‑Verifikation (seit Migration `0007`)

- `download_audit` - Audit‑Log für Lead‑Magnet/Asset‑Downloads (seit Migration `0006`)

- `tasks` - Aufgaben

- `notifications` - Benachrichtigungen

- `ai_jobs` - AI-Bildbearbeitungsaufträge (seit Migration `0008`, erweitert in `0009` für Gast‑Ownership)

In Migration `0007_add_email_verification.sql` wurden außerdem Spalten in `users` ergänzt:

- `email_verified` (INTEGER / boolean)

- `email_verified_at` (Unix timestamp)

In Migration `0009_update_ai_jobs_guest_ownership.sql` wurde die Gastbenutzer-Unterstützung für AI-Jobs hinzugefügt (`owner_type`, `owner_ref`).

## Migrations‑Dateien (in `/migrations`)

Die Migrations liegen im Verzeichnis `/migrations`. Aktuell vorhandene Migrations-Dateien:

1. `0000_initial_schema.sql` - Grundlegendes Schema (users, projects, activities, comments)
1. `0001_add_sessions_table.sql` - Sessions‑Tabelle (Session‑Management)
1. `0002_add_password_hash_to_users.sql` - Passwort‑Hash‑Feld für Benutzer
1. `0003_add_password_reset_tokens_table.sql` - Tabelle für Passwort‑Reset‑Tokens
1. `0004_add_tasks_table.sql` - Aufgaben‑Tabelle
1. `0005_add_notifications_table.sql` - Benachrichtigungs‑Tabelle
1. `0006_create_download_audit.sql` - Audit‑Tabelle für Download/Lead‑Magnet‑Events (asset_key, status, bytes)
1. `0007_add_email_verification.sql` - E‑Mail‑Verifikation (columns + tokens table + backfill)
1. `0008_create_ai_jobs_table.sql` - AI-Jobs-Tabelle für asynchrone Bildbearbeitung
1. `0009_update_ai_jobs_guest_ownership.sql` - Gastbenutzer-Unterstützung für AI-Jobs
1. `0010_drop_password_artifacts.sql` - Entfernt `users.password_hash` und die Tabelle `password_reset_tokens`

> Hinweis: Dateinamen und Reihenfolge sind wichtig. Führen Sie Migrations in numerischer Reihenfolge aus.

## Setup und Migration

Die Datenbank wird typischerweise mit dem Setup‑Script `scripts/setup-local-dev.ts` erstellt und migriert:

````bash
npm run setup:local

# oder

npx tsx scripts/setup-local-dev.ts

```bash

Das Script legt lokal an:

- Eine D1‑Datenbank (lokal / miniflare)

- Führt alle Migrationen in `/migrations` aus

- Erstellt bei Bedarf R2‑Bucket/KV‑Namespaces und Testdaten

### Manuelle Migration (Wrangler D1)

Alternativ können Sie Migrationen manuell mit Wrangler ausführen:

```bash
npx wrangler d1 execute evolution-hub-main-local --local --file=./migrations/0000_initial_schema.sql
npx wrangler d1 execute evolution-hub-main-local --local --file=./migrations/0001_add_sessions_table.sql
# ... weitere Dateien in aufsteigender Reihenfolge
````

## Lokale Datenbank‑Dateien

Die lokale SQLite‑Datenbank wird unter typischen Wrangler‑Pfaden gespeichert:

- Hauptdatenbank: `.wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite`

- Wrangler State: `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`

Das Setup‑Script versucht, Migrationen in allen gefundenen Wrangler‑Datenbanken konsistent anzuwenden.

## Änderungen durch die jüngsten Migrationen

- `0006_create_download_audit.sql`:
  - Fügt Tabelle `download_audit(id, created_at, ip, user_id, asset_key, status, bytes)`

  - Indizes: `idx_download_audit_created_at`, `idx_download_audit_asset_key`, `idx_download_audit_status`

- `0007_add_email_verification.sql`:
  - Fügt Spalten `email_verified` (INTEGER), `email_verified_at` zu `users`

  - Legt Tabelle `email_verification_tokens(token, user_id, email, created_at, expires_at, used_at)` an

  - Indizes für Performance und Backfill: markiert alle bestehenden Benutzer als verifiziert für Kompatibilität

- `0008_create_ai_jobs_table.sql`:
  - Erstellt Tabelle `ai_jobs` für asynchrone AI-Bildbearbeitung

  - Felder: id, user_id, type, status, input_params, output_url, created_at, updated_at, completed_at, error_message

  - Indizes für Performance: idx_ai_jobs_user_id, idx_ai_jobs_status, idx_ai_jobs_created_at

- `0009_update_ai_jobs_guest_ownership.sql`:
  - Fügt Unterstützung für Gastbenutzer zu AI-Jobs hinzu

  - Neue Felder: owner_type, owner_id für flexiblere Besitzverhältnisse

  - Migration bestehender Daten für Abwärtskompatibilität

## AI-Jobs-Schema-Details

Die `ai_jobs`-Tabelle ist speziell für die KI-Bildbearbeitungsfunktionalität optimiert und unterstützt Benutzer wie auch Gäste:

````sql
CREATE TABLE ai_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT,                    -- nullable für Gäste
  owner_type TEXT NOT NULL,        -- 'user' | 'guest'
  owner_ref TEXT NOT NULL,         -- user.id oder guest_id (Cookie)
  provider TEXT NOT NULL,          -- z. B. 'replicate'
  model TEXT,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  provider_job_id TEXT,
  input_r2_key TEXT,
  input_content_type TEXT,
  input_size INTEGER,
  output_r2_key TEXT,
  params_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

```text

### Indizes für optimale Performance

```sql
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created_at ON ai_jobs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_owner_created_at ON ai_jobs (owner_type, owner_ref, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_provider_job_id ON ai_jobs (provider_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs (created_at);
````

## Fehlerbehebung bei Migrationen

Wenn Migrationen fehlschlagen oder Tabellen fehlen:

1. Führen Sie das Setup‑Script aus:

   ```bash
   npm run setup:local
   ```

1. Prüfen Sie das Schema einer Tabelle:

   ```bash
   sqlite3 .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite ".schema sessions"
   ```

1. Bei inkonsistenten Wrangler‑State‑Datenbanken prüfen Sie beide Speicherorte (siehe oben) und führen Migrationen dort aus.

## Rollback / Reset

Um die lokale Datenbank zurückzusetzen:

````bash
rm .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite
rm .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite
npm run setup:local

```text

## Empfehlungen

1. Versionieren Sie Migrationen streng und vermeiden Sie rückwirkende Änderungen an bereits deployten Migrationsnummern.
1. Erstellen Sie separate Seed‑Scripte für Testdaten (`scripts/seed-test-data.ts`).
1. Generieren Sie ein ER‑Diagramm aus den Migrations‑SQLs für die Entwickler‑Dokumentation.
1. Überwachen Sie die Datenbank-Performance bei steigendem AI-Jobs-Volumen.

## Referenzen

- Migrations‑Verzeichnis: [`/migrations`](migrations:1)

- AI-Image-Service: [`src/lib/services/ai-image-service.ts`](src/lib/services/ai-image-service.ts:1)

- AI-Jobs-Service: [`src/lib/services/ai-jobs-service.ts`](src/lib/services/ai-jobs-service.ts:1)

```text
````
