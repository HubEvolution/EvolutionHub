---
description: 'Anleitung für lokale Entwicklung (Tooling, Wrangler, DB)'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-03'
codeRefs: 'README.md, docs/development/ci-cd.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Lokale Entwicklungsumgebung - Evolution Hub

Diese Anleitung beschreibt die Einrichtung und Verwendung der lokalen Entwicklungsumgebung für das Evolution Hub Projekt. Sie enthält detaillierte Informationen zu Tools, Workflows und Best Practices für die effiziente Entwicklung.

## Inhaltsverzeichnis

- Voraussetzungen
- Einrichtung
- Entwicklungsserver
- Datenbank-Setup
- Wrangler für Cloudflare-Entwicklung
- API-Dokumentation
- Debugging
- Häufige Probleme und Lösungen
- Entwicklungs-Workflows
- Performance-Optimierung

---

## Voraussetzungen

Bevor du mit der Entwicklung beginnst, stelle sicher, dass du folgende Tools installiert hast:

### Erforderliche Software

- **Node.js**: Version 20 (siehe Projekt-README)

  ```bash
  # Überprüfe die installierte Version
  node --version

  # Installiere Node.js mit nvm (empfohlen)
  nvm install 20
  nvm use 20
  ```

- **npm**: Version 8 oder höher (wird mit Node.js installiert)

  ```bash
  # Überprüfe die installierte Version
  npm --version

  # Aktualisiere npm
  npm install -g npm@latest
  ```

- **Git**: Aktuelle Version

  ```bash
  # Überprüfe die installierte Version
  git --version

  # Installiere Git auf macOS
  brew install git
  ```

- **Wrangler CLI**: Cloudflare Workers Command Line Interface

  ```bash
  # Installiere Wrangler global
  npm install -g wrangler

  # Überprüfe die Installation
  wrangler --version
  ```

### Empfohlene Tools

- **Visual Studio Code**: Mit folgenden Erweiterungen:
  - ESLint

  - Prettier

  - Tailwind CSS IntelliSense

  - Astro

  - TypeScript Vue Plugin

- **Postman** oder **Insomnia**: Zum Testen von API-Endpunkten

- **Browser-Entwicklertools**: Chrome DevTools oder Firefox Developer Edition

---

## Einrichtung

Folge diesen Schritten, um deine lokale Entwicklungsumgebung einzurichten:

### 1. Repository klonen

````bash

# Klone das Repository

git clone https://github.com/dein-username/evolution-hub.git

# Wechsle in das Projektverzeichnis

cd evolution-hub

```bash

### 2. Abhängigkeiten installieren

```bash
# Installiere alle Projektabhängigkeiten
npm install
````

### 3. Umgebungsvariablen konfigurieren

````bash

# Kopiere die Beispiel-Umgebungsvariablen

cp .env.example .env

# Bearbeite die .env-Datei mit deinen lokalen Konfigurationen

nano .env

```text

Wichtige Umgebungsvariablen:

```env
# .env Beispiel
NODE_ENV=development
JWT_SECRET=your-local-jwt-secret
D1_DATABASE=evolution-hub-local
````

### 4. Automatisches Setup (empfohlen)

````bash

# Erstellt lokale D1-Datenbank, führt Migrationen aus und richtet R2/KV für Dev ein

npm run setup:local

```bash

### 5. Datenbank-Migrationen manuell ausführen (optional)

```bash
# Führt alle Migrationen erneut aus
npm run db:migrate
````

---

## Entwicklungsserver

### Starten des Entwicklungsservers

Empfohlen ist ein Zwei-Terminal-Setup:

````bash

# Terminal 1 – beobachtet Builds für den Worker-Ausgabeordner

npm run build:watch

# Terminal 2 – startet Wrangler Dev (inklusive Build) auf Port 8787

npm run dev:worker

```bash

Alternativ kannst du `npm run dev` verwenden, was denselben Worker-Flow startet. Für reine Astro-UI-Iterationen ohne Cloudflare-Bindings steht `npm run dev:astro` bereit.

Der vollständige Stack ist unter `http://127.0.0.1:8787` erreichbar.

### Entwicklungsserver-Features

- **Hot Module Replacement (HMR)**: Änderungen werden sofort ohne vollständigen Reload angezeigt

- **Error Overlay**: Fehler werden im Browser angezeigt

- **Automatische TypeScript-Typprüfung**: Typfehler werden in der Konsole angezeigt

### Entwicklungsserver-Optionen

```bash
# Erzwinge das Development-Environment und nutze Remote-Ressourcen aus wrangler.toml
npm run dev:worker:dev

# Überspringe den Build-Schritt (nur wenn ein frisches dist/ bereits existiert)
npm run dev:worker:nobuild

# Astro-Only Server auf Port 4321 (Standard-Astro-Port) starten
npm run dev:astro -- --port 4321
````

---

## Datenbank-Setup

Evolution Hub verwendet Cloudflare D1 als Datenbank. Für die lokale Entwicklung kannst du entweder eine lokale SQLite-Datenbank oder eine D1-Instanz verwenden.

### Lokale D1-Datenbank

````bash

# Erstelle eine lokale D1-Datenbank

wrangler d1 create evolution-hub-local

# Aktualisiere die wrangler.toml mit der Datenbank-ID

# Füge folgende Zeile hinzu:

# [[d1_databases]]

# binding = "DB"

# database_name = "evolution-hub-local"

# database_id = "deine-datenbank-id"

```bash

### Migrationen

```bash
# Führe alle Migrationen aus
npm run db:migrate

# Erstelle eine neue Migration
npm run db:migration:create -- --name add_new_table

# Führe eine bestimmte Migration aus
npm run db:migrate -- --name 20230101000000_add_new_table
````

### Datenbank-Explorer

Wrangler bietet einen einfachen Datenbank-Explorer für D1:

````bash

# Starte den D1-Explorer

wrangler d1 execute evolution-hub-local --local

# Führe SQL-Abfragen aus

wrangler d1 execute evolution-hub-local --command "SELECT * FROM users" --local

```bash

---

## Wrangler für Cloudflare-Entwicklung

Wrangler ist das CLI-Tool für die Entwicklung mit Cloudflare Workers und D1.

### Wrangler-Konfiguration

Die Hauptkonfiguration befindet sich in der `wrangler.toml`-Datei und definiert Worker-Eintrittspunkt, `compatibility_date`, Assets sowie alle D1-, R2- und KV-Bindings für jede Umgebung (`wrangler.toml:5-124`).

### Lokale Entwicklung mit Wrangler

```bash
# Startet Wrangler inklusive Worker-Build aus dist/
npm run dev:worker

# Nutzt explizit das development-Environment (Secrets/Buckets gemäß wrangler.toml)
npm run dev:worker:dev
````

### D1-Operationen

````bash

# Führe SQL direkt aus

wrangler d1 execute evolution-hub-local --command "SELECT * FROM users" --local

# Importiere SQL-Datei

wrangler d1 execute evolution-hub-local --file ./schema.sql --local

```text

---

## API-Dokumentation

Evolution Hub verwendet OpenAPI/Swagger für die Dokumentation aller API-Endpunkte. Dies erleichtert das Verständnis, die Entwicklung und das Testen der APIs.

### OpenAPI-Spezifikation

Die OpenAPI-Spezifikation befindet sich im Verzeichnis `docs/api/openapi/`. Die Hauptdatei ist `docs/api/openapi.yaml`, die auf verschiedene Komponenten in Unterdateien verweist:

- `schemas.yaml`: Enthält alle Datenmodelle und Schemas

- `paths/`: Verzeichnis mit allen API-Endpunkt-Definitionen

  - `auth-login.yaml`: Login-Endpunkt

  - `auth-register.yaml`: Registrierungs-Endpunkt

  - `auth-logout.yaml`: Logout-Endpunkt

  - `auth-forgot-password.yaml`: Passwort-Vergessen-Endpunkt

  - `auth-reset-password.yaml`: Passwort-Zurücksetzen-Endpunkt

  - `user-me.yaml`: Benutzerprofilendpunkt

  - `user-profile.yaml`: Benutzerprofilaktualisierungsendpunkt

  - `projects.yaml`: Projektlisten-Endpunkt

  - `projects-id.yaml`: Projekt-Detail-Endpunkt

  - `projects-id-comments.yaml`: Projektkommentar-Endpunkt

  - `comments-id.yaml`: Kommentar-Detail-Endpunkt

  - `tools.yaml`: Tool-Listen-Endpunkt

  - `tools-id.yaml`: Tool-Detail-Endpunkt

### Verwendung der API-Dokumentation

#### Lokale Anzeige

Um die API-Dokumentation lokal anzuzeigen, kannst du den Swagger UI Docker-Container verwenden:

```bash
docker run -p 8080:8080 -e SWAGGER_JSON=/docs/openapi.yaml -v $(pwd)/docs/api:/docs swaggerapi/swagger-ui
````

Die Dokumentation ist dann unter `http://localhost:8080` verfügbar.

#### API-Entwicklung

Bei der Entwicklung neuer API-Endpunkte solltest du folgende Schritte befolgen:

1. **Spezifikation zuerst**: Definiere den neuen Endpunkt in der OpenAPI-Spezifikation, bevor du mit der Implementierung beginnst
1. **Schema-Validierung**: Verwende die definierten Schemas zur Validierung von Anfragen und Antworten
1. **Konsistente Fehlerbehandlung**: Folge den definierten Fehlerformaten in der Spezifikation
1. **Sicherheitsanforderungen**: Beachte die definierten Sicherheitsanforderungen für jeden Endpunkt

#### Testen mit der API-Dokumentation

Die OpenAPI-Spezifikation kann auch für automatisierte Tests verwendet werden:

````bash

# Installiere OpenAPI-Validator (falls noch nicht installiert)

npm install -g openapi-validator

# Validiere die API-Spezifikation

openapi-validator docs/api/openapi.yaml

```text

---

## Debugging

### Debugging des Frontends

1. **Browser DevTools**:

   - Öffne die DevTools (F12 oder Rechtsklick > Untersuchen)

   - Verwende den Elements-Tab für DOM-Inspektion

   - Verwende den Console-Tab für JavaScript-Fehler

   - Verwende den Network-Tab für API-Anfragen

1. **Astro Dev Tools**:

   - Installiere die Astro DevTools Browser-Erweiterung

   - Analysiere Astro-Komponenten und -Inseln

### Debugging des Backends

Evolution Hub verfügt über ein **Hybrid-Logging-System** für optimales Debugging in beiden Entwicklungsumgebungen:

#### 1. **Hybrid Debug Panel** (Empfohlen)

Das integrierte Debug Panel bietet Live-Log-Streaming für beide Umgebungen:

```bash
# Öffne das Debug Panel im Browser
http://localhost:4322/debug  # (Astro dev)
http://localhost:8787/debug  # (Wrangler dev)
````

**Features:**

- ✅ **Auto-Environment-Detection**: Automatische Verbindungsart-Erkennung

- ✅ **WebSocket-Streaming**: Real-time Logs für `npm run dev` (Astro)

- ✅ **SSE-Streaming**: Near real-time Logs für `npm run dev:wrangler` (Cloudflare)

- ✅ **Security-Event-Integration**: Alle API-Aktivitäten live sichtbar

- ✅ **Visual Connection-Status**: Connection-Mode-Badges (WEBSOCKET/SSE)

#### 2. **Traditionelle Logging-Methoden**

**Wrangler-Logs**:

````bash

# Zeige Logs an

wrangler tail

```bash

**Lokales Debugging**:

```bash
# Starte mit Debugging-Flags
NODE_OPTIONS="--inspect" npm run dev
````

**Konsolen-Debugging**:

- Füge `console.log()` oder `console.error()` in deinen Code ein

- Logs erscheinen sowohl in Terminal als auch im Debug Panel

### Debugging von Tests

````bash

# Führe Tests im Debug-Modus aus

npm run test:debug

# Führe einen bestimmten Test aus

npm run test -- -t "test name"

```bash

---

## Häufige Probleme und Lösungen

### 1. Wrangler-Authentifizierungsprobleme

**Problem**: Wrangler kann sich nicht bei Cloudflare authentifizieren.

**Lösung**:

```bash
# Authentifiziere dich bei Cloudflare
wrangler login

# Überprüfe den Authentifizierungsstatus
wrangler whoami
````

### 2. D1-Datenbankfehler

**Problem**: D1-Datenbankoperationen schlagen fehl.

**Lösung**:

````bash

# Überprüfe die Datenbank-ID in wrangler.toml

# Stelle sicher, dass die lokale Datenbank existiert

wrangler d1 list

# Erstelle die Datenbank neu, falls nötig

wrangler d1 create evolution-hub-local

```bash

### 3. TypeScript-Fehler

**Problem**: TypeScript-Compiler meldet Fehler.

**Lösung**:

```bash
# Überprüfe TypeScript-Fehler
npm run type-check

# Aktualisiere TypeScript-Definitionen
npm install --save-dev @types/node@latest
````

### 4. Astro-Build-Fehler

**Problem**: Astro-Build schlägt fehl.

**Lösung**:

````bash

# Lösche den Cache

rm -rf .astro/
rm -rf node_modules/.vite/

# Installiere Abhängigkeiten neu

npm ci

```bash

---

## Entwicklungs-Workflows

### Feature-Entwicklung

1. **Branch erstellen**:

   ```bash
   git checkout -b feature/neue-funktion
````

1. **Lokale Entwicklung**:
   - Implementiere die Funktion

   - Schreibe Tests

   - Führe Tests aus: `npm test`

   - Überprüfe Linting: `npm run lint`

1. **Commit und Push**:

   ```bash
   git add .
   git commit -m "feat: Neue Funktion implementiert"
   git push origin feature/neue-funktion
   ```

1. **Pull Request erstellen**:
   - Erstelle einen PR auf GitHub

   - Warte auf CI-Checks und Code Review

### Bugfix-Workflow

1. **Branch erstellen**:

   ```bash
   git checkout -b bugfix/fehler-beheben
   ```

1. **Fehler reproduzieren**:
   - Schreibe einen Test, der den Fehler reproduziert

   - Überprüfe, dass der Test fehlschlägt

1. **Fehler beheben**:
   - Implementiere die Fehlerbehebung

   - Stelle sicher, dass der Test erfolgreich ist

1. **Commit und Push**:

   ```bash
   git add .
   git commit -m "fix: Fehler in XYZ behoben"
   git push origin bugfix/fehler-beheben
   ```

---

## Performance-Optimierung

### Frontend-Optimierung

1. **Komponenten-Analyse**:
   - Verwende die Astro Dev Tools zur Analyse der Komponenten-Performance

   - Identifiziere unnötige Hydration

1. **Bundle-Analyse**:

   ```bash
   # Führe eine Bundle-Analyse durch
   npm run build -- --analyze
   ```

1. **Lazy Loading**:
   - Verwende `import()` für dynamisches Laden von Komponenten

   - Verwende das `client:visible`-Direktiv für verzögerte Hydration

### Backend-Optimierung

1. **Datenbank-Indizes**:
   - Füge Indizes für häufig abgefragte Felder hinzu

   - Analysiere langsame Abfragen

1. **Caching**:
   - Implementiere Caching für häufig abgerufene Daten

   - Verwende Cloudflare Cache-APIs

1. **Edge-Funktionen**:
   - Optimiere Code für Edge-Ausführung

   - Minimiere CPU-intensive Operationen

```text

```
