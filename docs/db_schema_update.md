# Datenbank-Schema und Migrationen

## Aktuelles Schema

Evolution Hub verwendet eine SQLite-Datenbank mit Cloudflare D1, die folgende Tabellen enthält:

- `users` - Benutzerdaten und Authentifizierung
- `sessions` - Aktive Benutzersitzungen
- `projects` - Projektdaten
- `activities` - Benutzeraktivitäten
- `comments` - Kommentare
- `password_reset_tokens` - Tokens für Passwort-Reset
- `tasks` - Aufgaben
- `notifications` - Benachrichtigungen

## Migrations-Dateien

Die Datenbank-Migrationen sind in separaten SQL-Dateien im Verzeichnis `/migrations` definiert:

1. `0000_initial_schema.sql` - Grundlegendes Schema (users, projects, activities, comments)
2. `0001_add_sessions_table.sql` - Sessions-Tabelle
3. `0002_add_password_hash_to_users.sql` - Passwort-Hash-Feld für Benutzer
4. `0003_add_password_reset_tokens_table.sql` - Tabelle für Passwort-Reset-Tokens
5. `0004_add_tasks_table.sql` - Aufgaben-Tabelle
6. `0005_add_notifications_table.sql` - Benachrichtigungs-Tabelle

**Hinweis:** Die Migrationen wurden optimiert, um Redundanzen zu vermeiden. Die `sessions`-Tabelle ist jetzt nur noch in `0001_add_sessions_table.sql` definiert.

## Setup und Migration

Die Datenbank wird mit dem Setup-Script `scripts/setup-local-dev.ts` erstellt und migriert:

```bash
npm run setup:local
# oder
npx tsx scripts/setup-local-dev.ts
```

Dieses Script führt folgende Aktionen aus:

1. Erstellt die lokale D1-Datenbank (falls nicht vorhanden)
2. Führt alle Migrations-Dateien auf ALLE lokalen Datenbanken aus (inkl. Wrangler-spezifische Datenbanken)
3. Erstellt einen lokalen R2-Bucket (falls nicht vorhanden)
4. Erstellt einen lokalen KV-Namespace (falls nicht vorhanden)
5. Erstellt einen Test-Benutzer mit folgenden Anmeldedaten:
   - E-Mail: `test@example.com`
   - Passwort: `password123`

## Lokale Datenbank-Dateien

Die lokale SQLite-Datenbank wird an folgenden Speicherorten gespeichert:

1. Hauptdatenbank: `.wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite`
2. Wrangler-State-Datenbanken: `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`

**Wichtig:** Das Setup-Skript erkennt und aktualisiert automatisch alle Wrangler-Datenbanken an beiden Speicherorten, um Konsistenz zu gewährleisten.

## Fehlerbehebung bei Migrationen

Wenn Probleme mit Migrationen auftreten:

1. **Doppelte Spalten**: Die Migrationen wurden so optimiert, dass sie `IF NOT EXISTS` verwenden und Spalten nur hinzufügen, wenn sie noch nicht existieren.

2. **Fehlende Tabellen**: Wenn eine Tabelle fehlt (z.B. "no such table: sessions"), führe `npm run setup:local` aus, um alle Migrationen auf alle Datenbanken anzuwenden.

3. **Manuelle Überprüfung**: Du kannst den Zustand der Datenbank manuell überprüfen mit:
   ```bash
   sqlite3 .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite ".tables"
   ```

Diese Dateien bleiben zwischen Neustarts des Entwicklungsservers erhalten und müssen nur neu erstellt werden, wenn:

- Das Datenbank-Schema geändert wurde
- Die Datenbank beschädigt ist
- Eine vollständige Zurücksetzung gewünscht ist

## Fehlerbehebung

### Fehlende Tabellen

Wenn Fehler auftreten, die auf fehlende Tabellen hinweisen (z.B. "no such table: sessions"):

1. Führen Sie das Setup-Script aus:
   ```bash
   npx tsx scripts/setup-local-dev.ts
   ```

2. Prüfen Sie, ob die Tabelle in der Datenbank erstellt wurde:
   ```bash
   sqlite3 .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite ".schema sessions"
   ```

### Datenbank-Reset

Um die Datenbank vollständig zurückzusetzen:

1. Löschen Sie die SQLite-Dateien:
   ```bash
   rm .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite
   rm .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite
   ```

2. Führen Sie das Setup-Script erneut aus:
   ```bash
   npx tsx scripts/setup-local-dev.ts
   ```

## Empfehlungen für zukünftige Verbesserungen

1. **Bereinigung der Migrations-Dateien:** Die Redundanz in den Sessions-Tabellen-Definitionen sollte behoben werden
2. **Migrations-Versionierung:** Ein robusteres Versionierungssystem für Migrationen implementieren
3. **Datenbank-Seeding:** Separate Scripts für Testdaten und Produktion erstellen
4. **Schema-Dokumentation:** Ein automatisch generiertes ER-Diagramm für die Datenbank erstellen
