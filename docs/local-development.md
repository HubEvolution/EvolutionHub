# Lokale Entwicklungsumgebung für Evolution Hub

Diese Dokumentation beschreibt, wie Sie die lokale Entwicklungsumgebung für Evolution Hub einrichten und verwenden können.

## Übersicht

Evolution Hub verwendet Cloudflare-Bindings für:
- **D1**: SQL-Datenbank (`.wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite`)
- **R2**: Objektspeicher für Dateien (z.B. Avatare)
- **KV**: Key-Value-Speicher für Sessions

Für die lokale Entwicklung können Sie entweder mit lokalen Kopien dieser Ressourcen arbeiten oder direkt auf die Remote-Ressourcen zugreifen.

## Schnellstart

Wir haben ein interaktives Menü und ein Onboarding-Skript erstellt, um den Einstieg zu erleichtern:

```bash
# Interaktives Entwicklungsmenü starten
npm run menu

# ODER: Onboarding-Prozess für neue Entwickler starten
npm run onboarding
```

Das interaktive Menü bietet jetzt ein Untermenü für lokale Entwicklung mit folgenden Optionen:
- **UI-Entwicklung**: Startet den Astro Dev-Server
- **Cloudflare-Entwicklung**: Startet den Wrangler Dev-Server
- **Datenbank zurücksetzen & Migrationen anwenden**: Setzt die lokale Datenbank zurück

## Einrichtung der lokalen Entwicklungsumgebung

### 1. Automatische Einrichtung

Wir haben ein Setup-Skript erstellt, das die lokale Entwicklungsumgebung automatisch einrichtet:

```bash
# Einrichtung der lokalen Entwicklungsumgebung
npm run setup:local

# Alternativ
npm run db:setup
```

Dieses Skript führt folgende Aktionen aus:
- Erstellt eine lokale D1-Datenbank (falls nicht vorhanden)
- Führt alle Migrations-Dateien auf ALLE lokalen Datenbanken aus (inkl. Wrangler-spezifische Datenbanken)
- Erstellt einen lokalen R2-Bucket (falls nicht vorhanden)
- Erstellt einen lokalen KV-Namespace (falls nicht vorhanden)
- Erstellt einen Test-Benutzer für die lokale Entwicklung

**Wichtig**: Das Setup-Skript erkennt und aktualisiert automatisch alle Wrangler-Datenbanken in den Verzeichnissen:
- `.wrangler/d1/miniflare/databases/`
- `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`

### 2. Manuelle Einrichtung

Falls Sie die Umgebung manuell einrichten möchten:

```bash
# D1-Datenbank erstellen
npx wrangler d1 create evolution-hub-main-local

# Migrations-Dateien ausführen
npx wrangler d1 execute evolution-hub-main-local --file=./migrations/0000_initial_schema.sql
npx wrangler d1 execute evolution-hub-main-local --file=./migrations/0001_add_sessions_table.sql
# ... weitere Migrations-Dateien

# R2-Bucket erstellen
npx wrangler r2 bucket create evolution-hub-avatars-local

# KV-Namespace erstellen
npx wrangler kv:namespace create SESSION_LOCAL
```

## Lokale Entwicklung

### Entwicklungs-Modi

Evolution Hub bietet zwei verschiedene lokale Entwicklungs-Modi:

1. **Astro Dev-Server** (`npm run dev`): 
   - Schnelle UI-Entwicklung mit Hot-Reload
   - Keine vollständige Cloudflare-Bindings-Integration
   - Ideal für Frontend-Entwicklung

2. **Wrangler Dev-Server** (`npm run dev:wrangler`): 
   - Vollständige Cloudflare-Integration mit lokalen Bindings
   - Langsamer als der Astro Dev-Server
   - Ideal für Backend-Entwicklung und API-Tests

### Mit lokalen Ressourcen

Um mit lokalen Kopien der Cloudflare-Bindings zu entwickeln:

```bash
# Astro Dev-Server (für UI-Entwicklung)
npm run dev

# ODER: Wrangler Dev-Server (für Backend-Entwicklung)
npm run dev:wrangler
```

Diese Befehle starten den lokalen Entwicklungsserver mit den lokalen Ressourcen:
- Lokale D1-Datenbank
- Lokaler R2-Bucket
- Lokaler KV-Namespace

### Mit Remote-Ressourcen

Um mit den in Cloudflare gehosteten Ressourcen zu entwickeln:

```bash
npm run dev:remote
```

**Wichtig**: Bei Verwendung des `dev:remote`-Befehls werden alle Änderungen direkt auf den Produktionsressourcen vorgenommen. Verwenden Sie diesen Modus mit Vorsicht!

## Shell-Aliase für schnellen Zugriff

Für einen noch schnelleren Zugriff auf die wichtigsten Befehle können Sie die bereitgestellten Shell-Aliase verwenden:

```bash
# Fügen Sie diese Zeile zu Ihrer .bashrc oder .zshrc hinzu
source "/pfad/zu/evolution-hub/scripts/shell-aliases.sh"

# Danach können Sie folgende Befehle verwenden:
ehub                # Interaktives Menü starten
ehub-dev            # Lokalen Entwicklungsserver starten
ehub-remote         # Remote-Entwicklungsserver starten
ehub-setup          # Lokale Umgebung einrichten
ehub-onboarding     # Onboarding-Prozess starten
```

## Fehlerbehebung

### Problem: "no such table: sessions"

Wenn dieser Fehler auftritt:
1. Führe `npm run setup:local` aus, um sicherzustellen, dass alle Migrationen auf ALLE Datenbanken angewendet wurden
2. Überprüfe, ob die Tabelle existiert: `sqlite3 .wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite ".tables"`

### Problem: Ungestylt/fehlerhaftes UI im Wrangler-Modus

Wenn das UI im Wrangler-Modus nicht korrekt angezeigt wird:
1. Führe `npm run build` aus, um das Projekt neu zu bauen
2. Starte den Wrangler-Server neu: `npm run dev:wrangler`

### Problem: Datenbank-Fehler

Bei Problemen mit der Datenbank:
1. Setze die Datenbank zurück: `npm run setup:local`
2. Überprüfe die Migrationen auf Syntaxfehler

## Konfiguration

Die Konfiguration für die Cloudflare-Bindings befindet sich in der `wrangler.toml`-Datei:

```toml
# D1 Datenbank-Binding
[[d1_databases]]
binding = "DB"
database_name = "evolution-hub-main"
database_id = "cadc96d1-712a-4873-8f3d-da87a936f3be"
preview_database_id = "evolution-hub-main-local"

# R2 Bucket-Binding
[[r2_buckets]]
binding = "R2_AVATARS"
bucket_name = "evolution-hub-avatars"
preview_bucket_name = "evolution-hub-avatars-local"

# KV Namespace-Binding
[[kv_namespaces]]
binding = "SESSION"
id = "0a9b6b94e5664025a223d4d15ae13cd3"
preview_id = "SESSION_LOCAL"

# Umgebungsvariablen
[vars]
ENVIRONMENT = "development"
```

- Die `binding`-Werte müssen mit dem Code übereinstimmen (z.B. `context.locals.runtime.env.DB`)
- Die `preview_*`-Werte werden für die lokale Entwicklung verwendet
- Die anderen Werte werden für die Produktionsumgebung verwendet

## Zugriff auf Bindings im Code

### D1-Datenbank

```typescript
// In API-Routen
export async function GET({ locals }) {
  const db = locals.runtime.env.DB;
  const result = await db.prepare("SELECT * FROM users").all();
  return new Response(JSON.stringify(result));
}
```

### R2-Bucket

```typescript
// In API-Routen
export async function POST({ locals, request }) {
  const formData = await request.formData();
  const file = formData.get('avatar');
  
  if (file instanceof File) {
    const key = `avatars/${crypto.randomUUID()}`;
    await locals.runtime.env.R2_AVATARS.put(key, await file.arrayBuffer());
    return new Response(JSON.stringify({ key }));
  }
}
```

### KV-Namespace

```typescript
// In API-Routen
export async function GET({ locals, cookies }) {
  const sessionId = cookies.get('sessionId');
  if (sessionId) {
    const session = await locals.runtime.env.SESSION.get(sessionId);
    return new Response(session);
  }
}
```

### Umgebungserkennung

Sie können das `environment.ts`-Modul verwenden, um die aktuelle Umgebung zu erkennen:

```typescript
import { isLocalEnvironment, getEnvironmentDescription } from '../lib/env/environment';

export async function GET({ locals }) {
  const env = locals.runtime.env;
  const isLocal = isLocalEnvironment(env);
  const envDescription = getEnvironmentDescription(env);
  
  return new Response(`Umgebung: ${envDescription}, Lokal: ${isLocal}`);
}
```

## Umgebungsvariablen

Die Umgebungsvariablen können in der `.dev.vars`-Datei für die lokale Entwicklung definiert werden:

```
SESSION_SECRET=lokales-entwicklungsgeheimnis
```

In der Produktionsumgebung werden die Umgebungsvariablen in der Cloudflare-UI oder über GitHub Actions definiert.

## Weitere Dokumentation

- **Cheat-Sheet**: Eine Übersicht aller wichtigen Befehle finden Sie in der [Cheat-Sheet-Dokumentation](./cheat-sheet.md).
- **Datenbankschema**: Die Dokumentation des Datenbankschemas finden Sie in der [DB-Schema-Dokumentation](./db_schema.md).

## Fehlerbehebung

### Problem: Fehler beim Ausführen der TypeScript-Skripte

```
Typescript-Fehler: Unknown file extension ".ts"
```

Lösung: Stellen Sie sicher, dass `tsx` installiert ist:

```bash
npm install -D tsx
```

### Problem: Lokale Datenbank wird nicht gefunden

```
Error: D1 database "evolution-hub-main-local" not found
```

Lösung: Führen Sie das Setup-Skript aus:

```bash
npm run setup:local
```

### Problem: Fehler beim Zugriff auf R2-Bucket oder KV-Namespace

Lösung: Stellen Sie sicher, dass die IDs in `wrangler.toml` korrekt sind und die Ressourcen existieren.

### Problem: Änderungen an der Datenbank werden nicht übernommen

Lösung: Führen Sie die Migrations-Dateien erneut aus:

```bash
npx wrangler d1 execute evolution-hub-main-local --file=./migrations/your_migration.sql
```
