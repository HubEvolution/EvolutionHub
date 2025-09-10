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
- `ai_jobs` - AI-Bildbearbeitungsaufträge (seit Migration `0008`)

In Migration `0007_add_email_verification.sql` wurden außerdem Spalten in `users` ergänzt:

- `email_verified` (INTEGER / boolean)
- `email_verified_at` (Unix timestamp)

In Migration `0009_update_ai_jobs_guest_ownership.sql` wurde die Gastbenutzer-Unterstützung für AI-Jobs hinzugefügt.

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
9. `0008_create_ai_jobs_table.sql` - AI-Jobs-Tabelle für asynchrone Bildbearbeitung
10. `0009_update_ai_jobs_guest_ownership.sql` - Gastbenutzer-Unterstützung für AI-Jobs

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

- `0008_create_ai_jobs_table.sql`:
  - Erstellt Tabelle `ai_jobs` für asynchrone AI-Bildbearbeitung
  - Felder: id, user_id, type, status, input_params, output_url, created_at, updated_at, completed_at, error_message
  - Indizes für Performance: idx_ai_jobs_user_id, idx_ai_jobs_status, idx_ai_jobs_created_at

- `0009_update_ai_jobs_guest_ownership.sql`:
  - Fügt Unterstützung für Gastbenutzer zu AI-Jobs hinzu
  - Neue Felder: owner_type, owner_id für flexiblere Besitzverhältnisse
  - Migration bestehender Daten für Abwärtskompatibilität

## AI-Jobs-Schema-Details

Die `ai_jobs`-Tabelle ist speziell für die KI-Bildbearbeitungsfunktionalität optimiert:

```sql
CREATE TABLE ai_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Nullable für Gastbenutzer
  owner_type TEXT DEFAULT 'user', -- 'user' oder 'guest'
  owner_id TEXT, -- User-ID oder Guest-Identifier
  type TEXT NOT NULL, -- 'enhance', 'generate', 'variation'
  status TEXT NOT NULL, -- 'queued', 'processing', 'completed', 'failed', 'cancelled'
  input_params TEXT, -- JSON mit Eingabeparametern
  output_url TEXT, -- URL zum verarbeiteten Bild in R2
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  error_message TEXT
);
```

### Indizes für optimale Performance

```sql
CREATE INDEX idx_ai_jobs_owner ON ai_jobs(owner_type, owner_id);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_ai_jobs_created_at ON ai_jobs(created_at);
CREATE INDEX idx_ai_jobs_type ON ai_jobs(type);
```

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
4. Überwachen Sie die Datenbank-Performance bei steigendem AI-Jobs-Volumen.

## Referenzen

- Migrations‑Verzeichnis: [`/migrations`](migrations:1)
- AI-Image-Service: [`src/lib/services/ai-image-service.ts`](src/lib/services/ai-image-service.ts:1)
- AI-Jobs-Service: [`src/lib/services/ai-jobs-service.ts`](src/lib/services/ai-jobs-service.ts:1)
