# Datenbank-Schema und Migrationen

## Aktuelles Schema

Evolution Hub verwendet eine SQLite-Datenbank mit Cloudflare D1. Die wichtigsten Tabellen sind:

- `users` - Benutzerdaten und Authentifizierung
- `sessions` - Aktive Benutzersitzungen
- `projects` - Projektdaten
- `activities` - Benutzeraktivitäten
- `comments` - Kommentare
- `password_reset_tokens` - Tokens für Passwort-Reset
- `email_verification_tokens` - Tokens für E‑Mail‑Verifikation (seit Migration `0007`)
- `download_audit` - Audit‑Log für Lead‑Magnet/Asset‑Downloads (seit Migration `0006`)
- `tasks` - Aufgaben
- `notifications` - Benachrichtigungen

In Migration `0007_add_email_verification.sql` wurden außerdem Spalten in `users` ergänzt:
- `email_verified` (INTEGER / boolean)
- `email_verified_at` (Unix timestamp)

## Migrations‑Dateien (in `/migrations`)

Die Migrations liegen im Verzeichnis `/migrations`. Aktuell vorhandene Migrations-Dateien:

1. `0000_initial_schema.sql` - Grundlegendes Schema (users, projects, activities, comments)
2. `0001_add_sessions_table.sql` - Sessions‑Tabelle (Session‑Management)
3. `0002_add_password_hash_to_users.sql` - Passwort‑Hash‑Feld für Benutzer
4. `0003_add_password_reset_tokens_table.sql` - Tabelle für Passwort‑Reset‑Tokens
5. `0004_add_tasks_table.sql` - Aufgaben‑Tabelle
6. `0005_add_notifications_table.sql` - Benachrichtigungs‑Tabelle
7. `0006_create_download_audit.sql` - Audit‑Tabelle für Download/Lead‑Magnet‑Events (asset_key, status, bytes)
8. `0007_add_email_verification.sql` - E‑Mail‑Verifikation (columns + tokens table + backfill)

> Hinweis: Dateinamen und Reihenfolge sind wichtig. Führen Sie Migrations in numerischer Reihenfolge aus.

## Setup und Migration

Die Datenbank wird typischerweise mit dem Setup‑Script `scripts/setup-local-dev.ts` erstellt und migriert:

```bash
npm run setup:local
# oder
npx tsx scripts/setup-local-dev.ts
```

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
```

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

## Fehlerbehebung bei Migrationen

Wenn Migrationen fehlschlagen oder Tabellen fehlen:
1. Führen Sie das Setup‑Script aus:
   ```bash
   npm run setup:local
   ```
2. Prüfen Sie das Schema einer Tabelle:
   ```bash
   sqlite3 .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite ".schema sessions"
   ```
3. Bei inkonsistenten Wrangler‑State‑Datenbanken prüfen Sie beide Speicherorte (siehe oben) und führen Migrationen dort aus.

## Rollback / Reset

Um die lokale Datenbank zurückzusetzen:

```bash
rm .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite
rm .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite
npm run setup:local
```

## Empfehlungen

1. Versionieren Sie Migrationen streng und vermeiden Sie rückwirkende Änderungen an bereits deployten Migrationsnummern.
2. Erstellen Sie separate Seed‑Scripte für Testdaten (`scripts/seed-test-data.ts`).
3. Generieren Sie ein ER‑Diagramm aus den Migrations‑SQLs für die Entwickler‑Dokumentation.

## Referenzen

- Migrations‑Verzeichnis: [`/migrations`](migrations:1)
