# Lokale Entwicklungsumgebung für Evolution Hub

Diese Dokumentation beschreibt, wie Sie die lokale Entwicklungsumgebung für Evolution Hub einrichten und verwenden können.

## Übersicht

Evolution Hub verwendet Cloudflare‑Bindings für:
- **D1**: SQL‑Datenbank (`.wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite`)
- **R2**: Objektspeicher für Dateien (z. B. Avatare)
- **KV**: Key‑Value‑Speicher für Sessions

Für die lokale Entwicklung können Sie entweder mit lokalen Kopien dieser Ressourcen arbeiten oder direkt auf die Remote‑Ressourcen zugreifen.

## Schnellstart

Wir haben ein interaktives Menü und ein Onboarding‑Skript erstellt, um den Einstieg zu erleichtern:

```bash
# Interaktives Entwicklungsmenü starten
npm run menu

# ODER: Onboarding‑Prozess für neue Entwickler starten
npm run onboarding
```

Das interaktive Menü bietet ein Untermenü für lokale Entwicklung mit folgenden Optionen:
- **UI‑Entwicklung**: Startet den Astro Dev‑Server
- **Cloudflare/Worker‑Entwicklung**: Startet den Wrangler Dev‑Server (vollständige Bindings)
- **Datenbank zurücksetzen & Migrationen anwenden**: Setzt die lokale Datenbank zurück

## Einrichtung der lokalen Entwicklungsumgebung

### 1. Automatische Einrichtung

Verwenden Sie das Setup‑Skript:

```bash
# Einrichtung der lokalen Entwicklungsumgebung
npm run setup:local

# oder
npx tsx scripts/setup-local-dev.ts
```

Das Script führt u. a. aus:
- Erstellt eine lokale D1‑Datenbank (falls nicht vorhanden)
- Führt alle Migrationen aus (`/migrations`)
- Erstellt lokale R2‑Buckets und KV‑Namespaces (preview IDs)
- Erstellt einen Testbenutzer (E‑Mail: `test@example.com`, Passwort: `password123`)
- Liest Konfigurationen aus [`wrangler.toml`](wrangler.toml:1) (DB‑/R2‑Bindings, preview IDs)

### 2. Manuelle Einrichtung

```bash
# Wrangler CLI installieren (falls nötig)
npm install -g wrangler

# Lokale D1‑Datenbank erstellen (Wrangler)
npx wrangler d1 create evolution-hub-main-local

# Migrationen anwenden (Beispiel)
npx wrangler d1 execute evolution-hub-main-local --file=./migrations/0000_initial_schema.sql
```

## Entwicklungs‑Modi (empfohlen)

Es gibt zwei gebräuchliche Modi:

1. UI‑Entwicklung (Schnell, Hot‑Reload)
   - Nutzt den lokalen Astro‑Dev‑Server
   - Kommando: `npm run dev:astro` (siehe [`package.json`](package.json:11))
   - Ideal für Komponenten‑ und Styling‑Arbeit

2. Full Worker / Wrangler‑Entwicklung (vollständige Cloudflare‑Bindings)
   - Nutzt Cloudflare Wrangler (lokale Bindings, D1/R2/KV)
   - Empfohlenes Kommando: `npm run dev` (dies führt `npm run dev:worker` aus — siehe [`package.json`](package.json:6))
   - Wenn Sie den Build‑Schritt überspringen möchten (schneller Start), verwenden Sie: `npm run dev:worker:nobuild` (führt direkt `wrangler dev` aus)
   - Hinweis: `npm run dev` führt standardmäßig einen Worker‑Build aus (bei Bedarf mit `npm run build:worker`) und startet dann Wrangler Dev.

### Mit lokalen Ressourcen

```bash
# Astro Dev (UI)
npm run dev:astro

# ODER: Worker Dev (vollständige Bindings)
npm run dev   # mapped to dev:worker in package.json
# oder (no build)
npm run dev:worker:nobuild
```

Diese Befehle starten Server mit lokalen Ressourcen:
- Lokale D1‑Datenbank
- Lokaler R2‑Bucket
- Lokaler KV‑Namespace

### Mit Remote‑Ressourcen

Wenn Sie direkt gegen Cloudflare‑Remote‑Ressourcen entwickeln, verwenden Sie Wrangler mit dem `--remote`‑Flag:

```bash
# Direkt mit Wrangler (Remote)
wrangler dev --remote
```

Hinweis: Es existiert in `package.json` derzeit kein `dev:remote`‑Script. Verwenden Sie daher `wrangler dev --remote` oder passen Sie Ihr eigenes Skript an.

## Shell‑Aliase für schnellen Zugriff

```bash
source "/pfad/zu/evolution-hub/scripts/shell-aliases.sh"
ehub                # Interaktives Menü (menu)
ehub-dev            # Lokalen Entwicklungsserver starten (Alias)
ehub-remote         # Remote‑Entwicklungsserver starten (Alias → wrangler --remote)
ehub-setup          # Lokale Umgebung einrichten
```

## Fehlerbehebung (häufig)

### Problem: "no such table: sessions"
1. Führen Sie `npm run setup:local` aus (oder `npx tsx scripts/setup-local-dev.ts`)
2. Prüfen Sie das Schema:
   ```bash
   sqlite3 .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite ".tables"
   ```

### Problem: UI ist im Wrangler‑Modus fehlerhaft / ungestylt
1. Bauen Sie den Worker‑Build neu (falls benötigt):
   ```bash
   npm run build:worker
   ```
2. Starten Sie Wrangler Dev (kein zusätzlicher Build):
   ```bash
   npm run dev:worker:nobuild
   ```

### Problem: Datenbank‑Fehler / Migration nicht angewendet
1. Setzen Sie die DB zurück und führen Sie das Setup erneut:
   ```bash
   rm .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite
   npm run setup:local
   ```

## Konfiguration

Die Cloudflare‑Bindings und Preview‑IDs werden in [`wrangler.toml`](wrangler.toml:1) konfiguriert. Das Setup‑Script liest diese Datei zur Ermittlung der `preview_database_id`, `preview_bucket_name` und `preview_id` für lokale Ressourcen.

## Hinweise für CI / Playwright

- Die Playwright‑Konfiguration verwendet standardmäßig `use.baseURL` und `webServer.command` für das Starten eines lokalen Servers; stellen Sie sicher, dass `npm run dev:astro` oder `npm run dev` entsprechend Ihrer Test‑Konfiguration ausgeführt werden kann.

## Weitere Dokumentation

- Cheat‑Sheet: [`docs/cheat-sheet.md`](docs/cheat-sheet.md:1)
- DB‑Migrations: [`docs/db_schema_update.md`](docs/db_schema_update.md:1)
