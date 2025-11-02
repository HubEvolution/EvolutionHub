<!-- markdownlint-disable MD051 -->

# Setup Guide für Evolution Hub

## Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
1. [Projekt einrichten](#projekt-einrichten)
1. [Datenbankkonfiguration](#datenbankkonfiguration)
1. [Umgebungsvariablen](#umgebungsvariablen)
1. [Lokale Entwicklung](#lokale-entwicklung)
1. [Tests ausführen](#tests-ausfuhren)

   - [Testarten und -struktur](#testarten-und-struktur)

   - [Bekannte Testprobleme](#bekannte-testprobleme)

   - [Testabdeckung verbessern](#testabdeckung-verbessern)

1. [Bereitstellung](#bereitstellung)

## Voraussetzungen

Bevor Sie mit der Einrichtung beginnen, stellen Sie sicher, dass folgende Software installiert ist:

- [Node.js](https://nodejs.org/) (Version 20.x oder höher)

- [npm](https://www.npmjs.com/) (wird mit Node.js installiert)

- [Git](https://git-scm.com/)

## Projekt einrichten

1. Klonen Sie das Repository:

   ```bash
   git clone <repository-url>
   cd evolution-hub
   ```

1. Installieren Sie die Abhängigkeiten:

   ```bash
   npm install
   ```

1. Erstellen Sie eine `.env`-Datei aus dem Beispiel:

   ```bash
   cp .env.example .env
   ```

## Datenbankkonfiguration

Das Projekt verwendet Cloudflare D1 als Datenbank. Für die lokale Entwicklung benötigen Sie ein Cloudflare-Konto und müssen die Wrangler CLI installiert haben.

### Datenbankkonfiguration (2)

### Automatische Einrichtung (empfohlen)

Verwenden Sie das Setup-Skript, um die lokale Entwicklungsumgebung automatisch einzurichten:

```bash
npm run setup:local

```text

Dieses Skript führt folgende Aktionen aus:

- Erstellt eine lokale D1-Datenbank (falls nicht vorhanden)

- Führt alle Migrations-Dateien auf ALLE lokalen Datenbanken aus

- Erstellt einen lokalen R2-Bucket (falls nicht vorhanden)

- Erstellt einen lokalen KV-Namespace (falls nicht vorhanden)

- Erstellt einen Test-Benutzer für die lokale Entwicklung

### Manuelle Einrichtung

1. Installieren Sie die Wrangler CLI global (falls noch nicht geschehen):

   ```bash
   npm install -g wrangler
   ```

1. Erstellen Sie eine neue D1-Datenbank:

   ```bash
   npx wrangler d1 create evolution-hub-main-local
   ```

1. Führen Sie die Migrationen aus:

   ```bash
   npx wrangler d1 execute evolution-hub-main-local --local --file=./migrations/0000_initial_schema.sql
   npx wrangler d1 execute evolution-hub-main-local --local --file=./migrations/0001_add_sessions_table.sql
   # ... weitere Migrations-Dateien
   ```

## Umgebungsvariablen

Die `.env`-Datei enthält wichtige Konfigurationsvariablen für das Projekt. Passen Sie diese entsprechend Ihrer Umgebung an:

```env
# Die URL des lokal laufenden Cloudflare Workers, damit das Frontend weiß, wohin es Anfragen senden soll.
PUBLIC_WORKER_URL="http://localhost:8787"

# Auth.js v5 Configuration
# Generate a secret with: openssl rand -hex 32
AUTH_SECRET="4dbd7e194fb217782190c3507531816e58cde5ea900319b26166a8ba86f1e601"
AUTH_TRUST_HOST=false
```

Für die lokale Entwicklung können Sie den `AUTH_SECRET` mit folgendem Befehl generieren:

```bash
openssl rand -hex 32

```bash

## Lokale Entwicklung

Evolution Hub bietet zwei verschiedene lokale Entwicklungs-Modi:

### Option 1: Interaktives Menü (empfohlen)

Verwenden Sie das interaktive CLI-Menü, um schnell zwischen verschiedenen Entwicklungs-Modi zu wechseln:

```bash
npm run menu
```

  Wählen Sie "Lokale Entwicklung" und dann eine der folgenden Optionen:

- **UI-Entwicklung**: Startet den Astro Dev-Server (schnell, ideal für Frontend-Entwicklung)

- **Cloudflare-Entwicklung**: Startet den Wrangler Dev-Server (vollständige Cloudflare-Integration)

- **Datenbank zurücksetzen & Migrationen anwenden**: Setzt die lokale Datenbank zurück

### Option 2: Direkte Befehle

#### Astro Dev-Server (für UI-Entwicklung)

```bash
npm run dev:astro

```bash

#### Wrangler Dev-Server (für Backend-Entwicklung)

```bash
npm run dev:worker
```

#### Remote-Entwicklung (mit Cloudflare-Ressourcen)

```bash
npm run dev:remote

```text

**Wichtig**: Bei Verwendung des `dev:remote`-Befehls werden alle Änderungen direkt auf den Produktionsressourcen vorgenommen. Verwenden Sie diesen Modus mit Vorsicht!

Das Projekt ist nun unter der von `wrangler` angegebenen Adresse erreichbar (z.B. `http://localhost:8788`).

## Tests ausführen

Das Projekt verfügt über verschiedene Arten von Tests. Um Tests erfolgreich auszuführen, ist eine korrekte Umgebungseinrichtung entscheidend.

### Testarten und -struktur

#### Unit-Tests (Vitest)

Unit-Tests werden mit Vitest ausgeführt und sollten in der Dateistruktur `src/**/*.{test,spec}.{ts,tsx}` abgelegt werden.

```bash
# Unit-Tests ausführen
npm run test

# Unit-Tests mit Live-Aktualisierung ausführen
npm run test:watch

# Test-Coverage-Report generieren
npm run test:coverage
```

##### Aktuelle Test-Coverage (Stand: 30.07.2025)

Die aktuelle Test-Coverage des Projekts beträgt **14.76%** für alle Dateien. Die Coverage verteilt sich unterschiedlich auf verschiedene Projektbereiche:

```text
------------------------------|---------|----------|---------|---------|-------------------
File                          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
------------------------------|---------|----------|---------|---------|-------------------
All files                     |   14.76 |     87.5 |   77.77 |   14.76 |                   
------------------------------|---------|----------|---------|---------|-------------------

```text

Hervorstechende Coverage-Ergebnisse:

- **Vollständig getestete Module** (100% Coverage):

  - `src/lib/auth-v2.ts`

  - `src/pages/api/auth/login.ts`

  - `src/pages/api/auth/register.ts`

- **Kritische Bereiche ohne Tests** (0% Coverage):

  - `src/server/utils/hashing.ts` (Passwort-Hashing)

  - `src/server/utils/jwt.ts` (Token-Management)

  - `src/pages/api/auth/forgot-password.ts`

  - `src/pages/api/auth/reset-password.ts`

  - `src/pages/api/user/logout.ts`

##### Implementierte Unit-Tests

Folgende Unit-Tests wurden bereits implementiert und können als Referenz für weitere Tests dienen:

1. **Auth-Modul** (`src/lib/auth-v2.test.ts`)

   - Tests für `createSession`, `validateSession` und `invalidateSession`

   - Mocking der D1-Datenbank und zeitbezogener Funktionen

   - Überprüfung der Session-Lebensdauer und -Validierung

1. **Login-API** (`src/pages/api/auth/login.test.ts`)

   - Vollständiges Testen aller Eingabevalidierungen

   - Überprüfung von Fehlerbedingungen (ungültige Anmeldedaten, fehlende Runtime)

   - Tests für erfolgreiche Anmeldung und Cookie-Setzung

   - Mocking der Astro APIContext, DB und bcrypt

1. **Register-API** (`src/pages/api/auth/register.test.ts`)

   - Tests für Formularvalidierung aller Registrierungsfelder

   - Überprüfung der UNIQUE-Constraint-Fehlerbehandlung

   - Tests für erfolgreiche Registrierung und Cookie-Setzung

   - Mocking von crypto.randomUUID für deterministische Tests

##### D1-Datenbank-Mocking Beispiel

Für Unit-Tests, die mit der D1-Datenbank interagieren, wird folgendes Mocking-Pattern verwendet:

```typescript
// Mock für die D1-Datenbank
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  run: vi.fn().mockResolvedValue({ success: true }),
};

// In Tests verwenden
vi.mocked(mockDb.first)
  .mockResolvedValueOnce(/* ersten Aufruf mocken */)
  .mockResolvedValueOnce(/* zweiten Aufruf mocken */); 
```

#### E2E-Tests (Playwright)

E2E-Tests werden mit Playwright ausgeführt und befinden sich im Verzeichnis `tests/e2e/specs`:

```bash

# Alle E2E-Tests ausführen

npm run test:e2e

# Tests mit visueller UI ausführen

npm run test:e2e:ui

# Tests in bestimmten Browsern ausführen

npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
npm run test:e2e:mobile

# Test-Snapshots aktualisieren

npm run test:e2e:update-snapshots

# Test-Report anzeigen

npm run test:e2e:report

```text

#### Teststruktur

- **E2E-Tests**: Verwenden das Page-Object-Pattern zur Abstraktion der UI-Interaktionen

- **Auth-Tests**: Testen Login-Formular, Fehlerbehandlung, erfolgreiche Anmeldung und OAuth-Flows

- **Dashboard-Tests**: Überprüfen Funktionalität nach erfolgreicher Anmeldung

- **Critical-Flow-Tests**: Testen kritische Benutzerflüsse durch die Anwendung

### Bekannte Testprobleme

#### Webserver-Timeout

E2E-Tests benötigen einen laufenden Webserver unter `http://127.0.0.1:8787`. Die Playwright-Konfiguration startet Wrangler Dev automatisch (oder nutzt einen bereits laufenden Server), was zu Timeouts führen kann. Lösung:

1. Starten Sie den Webserver manuell vor der Testausführung:

   ```bash
   # Terminal 1
   npm run build:watch
   
   # Terminal 2
   npm run dev
   
   # Terminal 3 (nach Serverstart)
   npm run test:e2e --webserver=http://127.0.0.1:8787
   ```

{{ ... }}

Das Skript `test:integration` fehlt in der `package.json`. Um Integrationstests zu aktivieren:

1. Fügen Sie das Skript zur `package.json` hinzu:

   ```json
   "test:integration": "vitest run --config vitest.integration.config.ts"
   ```

1. Erstellen Sie eine Konfigurationsdatei `vitest.integration.config.ts` für Integrationstests.

#### Statische Testdaten

Die E2E-Tests verwenden statische Testdaten, die möglicherweise nicht in der Datenbank vorhanden sind. Lösung:

1. Implementieren Sie einen Test-Setup-Mechanismus, der Testbenutzer erstellt
1. Verwenden Sie eine separate Testdatenbank

### Testabdeckung verbessern

#### Weitere empfohlene Unit-Tests

Zusätzlich zu den bereits implementierten Tests werden folgende weitere Tests empfohlen:

1. **Weitere Auth-bezogene APIs**:

   - `/api/auth/forgot-password.ts`

   - `/api/auth/reset-password.ts`

   - `/api/auth/logout.ts`

1. **Komponenten-Tests**:

   - Login-Formular-Komponente

   - Registrierungs-Formular-Komponente

   - Validierungslogik in UI-Komponenten

1. **Datenbankinteraktionen**:

   - Komplexere Datenbankabfragen und -operationen

   - Fehlerbehandlung bei Datenbankausfällen

   - Performance-kritische Datenbankoperationen

#### Erweiterte Mocking-Strategien

Das Projekt verwendet bereits erfolgreich folgende Mocking-Strategien:

##### Cloudflare D1-Datenbank

```typescript
// Beispiel für D1-Database-Mock
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  all: vi.fn().mockResolvedValue({ results: [] }),
  first: vi.fn(),  // Mock für einzelne Datensätze
  run: vi.fn().mockResolvedValue({ success: true }),
};

// Direkt als Typcast verwenden
const result = await someFunction(mockDb as any);
```

##### Zeit- und UUID-bezogene Funktionen

```typescript
// Mock für Date.now()
vi.spyOn(Date, 'now').mockReturnValue(1627480800000); // Festes Datum

// Mock für crypto.randomUUID
const originalRandomUUID = crypto.randomUUID;
vi.stubGlobal('crypto', {
  ...crypto,
  randomUUID: vi.fn().mockReturnValue('test-uuid')
});

// Aufräumen nicht vergessen
afterAll(() => {
  crypto.randomUUID = originalRandomUUID;
  vi.restoreAllMocks();
});

```text

##### Externe Bibliotheken

```typescript
// bcrypt-ts mocken
vi.mock('bcrypt-ts', async () => ({
  compare: vi.fn().mockResolvedValue(true),  // oder false für fehlgeschlagenen Vergleich
  hash: vi.fn().mockResolvedValue('hashed_password')
}));
```

## Bereitstellung

Das Deployment erfolgt automatisch über **GitHub Actions** mit Tag-basiertem Workflow.

### Automatisches Deployment (Empfohlen)

```bash

# Tag erstellen und pushen

git tag v1.7.1 -m "Release v1.7.1"
git push origin v1.7.1

```bash

Dies startet automatisch:

1. Pre-Deploy Checks (Lint, Tests, Security)
1. Deploy zu Staging → Health Check
1. Deploy zu Production (nach manueller Approval) → Health Check
1. GitHub Release erstellen

Siehe [README.md Deployment-Sektion](../README.md#-deployment) für Details.

### Manuelles Deployment (Fallback)

Für eine manuelle Bereitstellung:

1. Bauen Sie das Projekt:

   ```bash
   npm run build:worker
   ```

1. Deployen Sie mit Wrangler:

   ```bash
   npx wrangler deploy --env staging
   # oder
   npx wrangler deploy --env production
   ```

1. Health Check ausführen:

   ```bash
   npm run health-check -- --url https://staging.hub-evolution.com
   ```

### Cloudflare Ressourcen

Für die Verwaltung von Cloudflare-Ressourcen können Sie die Wrangler CLI verwenden:

#### R2 Bucket erstellen

```bash
npx wrangler r2 bucket create evolution-hub-avatars
```

#### D1 Datenbankmigration (remote)

```bash
npx wrangler d1 migrations apply evolution-hub-main --remote

```text

---

## Weiterführende Dokumentation

Für detaillierte Informationen zu spezifischen Themen siehe:

### API-Dokumentation

- **[Bekannte API-Probleme & Verbesserungspotentiale](./api/known-issues.md)** — Identifizierte Verbesserungspotentiale in den APIs

### Sicherheit

- **[Implementierte Sicherheitsverbesserungen](./security/improvements.md)** — Details zu User-API Sicherheit, Rate-Limiting, Security-Headers und Audit-Logging

- **[Security-Richtlinien](./SECURITY.md)** — Allgemeine Sicherheitsrichtlinien

### Weitere Themen

- **[Lokale Entwicklung](./development/local-development.md)** — Detaillierte Anleitung zur lokalen Entwicklungsumgebung

- **[CI/CD-Pipeline](./development/ci-cd.md)** — Continuous Integration und Deployment

- **[Testing-Strategie](./testing/testing-strategy.md)** — Umfassende Teststrategie und -richtlinien

```text
