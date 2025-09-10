# Setup Guide für Evolution Hub

## Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Projekt einrichten](#projekt-einrichten)
3. [Datenbankkonfiguration](#datenbankkonfiguration)
4. [Umgebungsvariablen](#umgebungsvariablen)
5. [Lokale Entwicklung](#lokale-entwicklung)
6. [Tests ausführen](#tests-ausführen)
   - [Testarten und -struktur](#testarten-und--struktur)
   - [Bekannte Testprobleme](#bekannte-testprobleme)
   - [Testabdeckung verbessern](#testabdeckung-verbessern)
7. [Bereitstellung](#bereitstellung)

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

2. Installieren Sie die Abhängigkeiten:

   ```bash
   npm install
   ```

3. Erstellen Sie eine `.env`-Datei aus dem Beispiel:

   ```bash
   cp .env.example .env
   ```

## Datenbankkonfiguration

Das Projekt verwendet Cloudflare D1 als Datenbank. Für die lokale Entwicklung benötigen Sie ein Cloudflare-Konto und müssen die Wrangler CLI installiert haben.

### Datenbankkonfiguration

### Automatische Einrichtung (empfohlen)

Verwenden Sie das Setup-Skript, um die lokale Entwicklungsumgebung automatisch einzurichten:

```bash
npm run setup:local
```

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

2. Erstellen Sie eine neue D1-Datenbank:

   ```bash
   npx wrangler d1 create evolution-hub-main-local
   ```

3. Führen Sie die Migrationen aus:

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
```

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
```

#### Wrangler Dev-Server (für Backend-Entwicklung)

```bash
npm run dev:worker
```

#### Remote-Entwicklung (mit Cloudflare-Ressourcen)

```bash
npm run dev:remote
```

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
```

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

2. **Login-API** (`src/pages/api/auth/login.test.ts`)
   - Vollständiges Testen aller Eingabevalidierungen
   - Überprüfung von Fehlerbedingungen (ungültige Anmeldedaten, fehlende Runtime)
   - Tests für erfolgreiche Anmeldung und Cookie-Setzung
   - Mocking der Astro APIContext, DB und bcrypt

3. **Register-API** (`src/pages/api/auth/register.test.ts`)
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
```

#### Teststruktur

- **E2E-Tests**: Verwenden das Page-Object-Pattern zur Abstraktion der UI-Interaktionen
- **Auth-Tests**: Testen Login-Formular, Fehlerbehandlung, erfolgreiche Anmeldung und OAuth-Flows
- **Dashboard-Tests**: Überprüfen Funktionalität nach erfolgreicher Anmeldung
- **Critical-Flow-Tests**: Testen kritische Benutzerflüsse durch die Anwendung

### Bekannte Testprobleme

#### Webserver-Timeout

E2E-Tests benötigen einen laufenden Webserver unter `http://localhost:4321`. Die Playwright-Konfiguration versucht, diesen automatisch mit `npm run dev` zu starten, was zu Timeouts führen kann. Lösung:

1. Starten Sie den Webserver manuell vor der Testausführung:

   ```bash
   # Terminal 1
   npm run build:watch
   
   # Terminal 2
   npm run dev
   
   # Terminal 3 (nach Serverstart)
   npm run test:e2e
   ```

#### Fehlende Integrationstests

Das Skript `test:integration` fehlt in der `package.json`. Um Integrationstests zu aktivieren:

1. Fügen Sie das Skript zur `package.json` hinzu:

   ```json
   "test:integration": "vitest run --config vitest.integration.config.ts"
   ```

2. Erstellen Sie eine Konfigurationsdatei `vitest.integration.config.ts` für Integrationstests.

#### Statische Testdaten

Die E2E-Tests verwenden statische Testdaten, die möglicherweise nicht in der Datenbank vorhanden sind. Lösung:

1. Implementieren Sie einen Test-Setup-Mechanismus, der Testbenutzer erstellt
2. Verwenden Sie eine separate Testdatenbank

### Testabdeckung verbessern

#### Weitere empfohlene Unit-Tests

Zusätzlich zu den bereits implementierten Tests werden folgende weitere Tests empfohlen:

1. **Weitere Auth-bezogene APIs**:
   - `/api/auth/forgot-password.ts`
   - `/api/auth/reset-password.ts`
   - `/api/auth/logout.ts`

2. **Komponenten-Tests**:
   - Login-Formular-Komponente
   - Registrierungs-Formular-Komponente
   - Validierungslogik in UI-Komponenten

3. **Datenbankinteraktionen**:
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
```

##### Externe Bibliotheken

```typescript
// bcrypt-ts mocken
vi.mock('bcrypt-ts', async () => ({
  compare: vi.fn().mockResolvedValue(true),  // oder false für fehlgeschlagenen Vergleich
  hash: vi.fn().mockResolvedValue('hashed_password')
}));
```

## Bereitstellung

Das Deployment erfolgt automatisch bei jedem `git push` auf den `main`-Branch über **Cloudflare Pages**.

### Manuelle Bereitstellung

Für eine manuelle Bereitstellung führen Sie folgende Schritte aus:

1. Bauen Sie das Projekt:

   ```bash
   npm run build
   ```

2. Deployen Sie mit Wrangler:

   ```bash
   npx wrangler pages deploy dist
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
```

## Bekannte API-Probleme & Verbesserungspotentiale

Bei der Implementierung und Testabdeckung der APIs wurden verschiedene Verbesserungspotentiale identifiziert, die mittel- bis langfristig behoben werden sollten.

### Auth-API-Probleme

#### 1. Inkonsistente Fehlerbehandlung

Die Authentication-APIs zeigen inkonsistentes Verhalten bei der Fehlerbehandlung:

- **Unspezifische Fehlermeldungen**: Fast alle Fehler werden als `UnknownError` zurückgegeben, auch wenn die spezifische Fehlerursache bekannt ist (z.B. ungültiges Token, abgelaufenes Token)
- **Beispiel**: In `reset-password.ts` sollten spezifische Fehlercodes wie `InvalidToken` oder `ExpiredToken` zurückgegeben werden

```typescript
// Aktuell
return context.redirect(`/reset-password?token=${token}&error=UnknownError`, 302);

// Besser
return context.redirect(`/reset-password?token=${token}&error=InvalidToken`, 302);
```

#### 2. Sicherheitsprobleme bei User-Enumeration

Eine Security Best Practice ist, keine Informationen preiszugeben, ob ein Benutzer existiert oder nicht:

- **Aktuelles Problem**: Die `forgot-password.ts` API gibt einen Fehler zurück, wenn keine E-Mail gefunden wurde, anstatt immer die gleiche Erfolgsmeldung anzuzeigen
- **Best Practice**: Immer die gleiche Erfolgsantwort zurückgeben, unabhängig davon, ob ein Benutzer gefunden wurde oder nicht

```typescript
// Aktuell
if (!existingUser) {
  return context.redirect('/forgot-password?error=UnknownError', 302);
}

// Besser (verhindert User Enumeration)
if (!existingUser) {
  // Bei nicht existierendem Benutzer trotzdem Erfolg anzeigen
  return context.redirect('/auth/password-reset-sent', 302);
}
```

#### 3. Inkonsistente Redirect-URLs

Die APIs verwenden unterschiedliche Pfadformate für Redirects:

- Mal mit führendem `/auth/` (z.B. `/auth/login`)
- Mal ohne führendes `/auth/` (z.B. `/login`)
- Mal mit Fehlerparametern (`?error=`), mal ohne

Die URL-Struktur sollte vereinheitlicht werden, vorzugsweise mit einem zentralen Routing-System.

#### 4. Probleme beim Email-Versand

Der E-Mail-Versand bei Passwort-Reset-Anfragen scheint nicht robust implementiert zu sein:

- **Problem**: Selbst bei korrekt konfiguriertem `resend`-API-Key gibt die `forgot-password.ts`-API häufig einen generischen Fehler zurück
- **Verbesserung**: Bessere Fehlerbehandlung und spezifischere Fehlermeldungen für E-Mail-Versandfehler

### API-Resilienz-Verbesserungen

#### 1. Konsistente try/catch-Blöcke

Die Fehlerbehandlung sollte in allen APIs konsistent sein:

```typescript
try {
  // API-Logik
} catch (error) {
  console.error('Spezifische API-Operation fehlgeschlagen:', error);
  return context.redirect('/pfad?error=SpezifischerErrorCode', 302);
}
```

#### 2. Spezifische Fehlermeldungen

Jede API sollte spezifische Fehlercodes zurückgeben, die dem Client helfen, das Problem zu verstehen:

- `InvalidInput`: Bei Validierungsfehlern
- `NotFound`: Bei nicht gefundenen Ressourcen
- `Forbidden`: Bei fehlenden Berechtigungen
- `ExpiredToken`: Bei abgelaufenen Tokens
- `InvalidToken`: Bei ungültigen Tokens

#### 3. Zentrales Fehlerhandling

Empfehlung: Ein zentrales Fehlerbehandlungsmodul implementieren:

```typescript
// src/lib/error-handler.ts
export function handleApiError(context: any, error: any, path: string): Response {
  console.error(`API error in ${path}:`, error);
  
  // Spezifische Fehlertypen erkennen und entsprechend behandeln
  if (error instanceof ValidationError) {
    return context.redirect(`${path}?error=ValidationError`, 302);
  }
  
  // Generischer Fallback
  return context.redirect(`${path}?error=UnknownError`, 302);
}
```

Diese Verbesserungen würden nicht nur die Codebasis robuster machen, sondern auch die Benutzererfahrung verbessern und die Sicherheit erhöhen.

## Implementierte Sicherheitsverbesserungen

Im Rahmen des Projekts wurden bereits folgende Sicherheitsverbesserungen implementiert:

### User-API Sicherheit

#### 1. Datenschutz bei User-Daten (me.ts API)

Die `/api/user/me` API wurde mit einem strikten Whitelist-Ansatz implementiert, um sensible Benutzerdaten zu schützen:

- **Vor der Verbesserung**: Alle Felder des User-Objekts wurden ungefiltert zurückgegeben, einschließlich sensibler Daten wie `password_hash` und `sessions`
- **Nach der Verbesserung**: Nur explizit erlaubte Felder werden zurückgegeben, sensible Daten sind ausgeschlossen

```typescript
// Implementierter Whitelist-Ansatz
const safeUser = {
  id: user.id,
  email: user.email,
  name: user.name,
  username: user.username,
  created_at: user.created_at,
};

return new Response(JSON.stringify(safeUser), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});
```

#### 2. Verbesserte Validierung bei Profilaktualisierungen (profile.ts API)

Die `/api/user/profile` API wurde mit folgenden Sicherheitsverbesserungen implementiert:

- **Strenge Datenvalidierung**: Prüfung auf Mindest-/Höchstlängen für Name (2-50 Zeichen) und Username (3-30 Zeichen)
- **Username-Format-Validierung**: Nur Buchstaben, Zahlen und Unterstriche erlaubt (RegEx-Muster)
- **Username-Kollisionsprüfung**: Verhindert Überschneidungen mit bestehenden Benutzernamen
- **Strukturierte JSON-Fehlerantworten**: Spezifische Fehlermeldungen statt generischer Texte
- **Konsistente Header**: Alle API-Antworten haben jetzt den korrekten Content-Type-Header

#### 3. Konsistentes Fehlerhandling

Alle User-APIs wurden mit einheitlichem Fehlerhandling implementiert:

- **JSON-strukturierte Fehler**: Alle Fehlerantworten folgen dem Format `{ "error": "Spezifische Fehlermeldung" }`
- **Aussagekräftige Statuscodes**: Verwendung von HTTP-Standards (400 für Validierungsfehler, 401 für Authentifizierungsfehler, 409 für Konflikte)
- **Detaillierte Logging**: Alle Fehler werden mit Kontext protokolliert

### Testbarkeit der Sicherheitsfeatures

Alle implementierten Sicherheitsfeatures wurden mit detaillierten Tests abgedeckt:

- **Whitelist-Tests**: Sicherstellen, dass sensible Daten herausgefiltert werden
- **Validierungstests**: Überprüfung der Eingabevalidierung für Name und Username
- **Kollisionstests**: Sicherstellen, dass Kollisionsprüfungen korrekt funktionieren
- **Fehlerbehandlungstests**: Überprüfung der API-Antworten bei verschiedenen Fehlerszenarien

## Implementierte Security Core-Features

Zur weiteren Verbesserung der Sicherheit wurden folgende zentrale Security-Features implementiert:

### 1. Rate-Limiting-System

Ein flexibles Rate-Limiting-System wurde implementiert, um die API vor Brute-Force- und DoS-Angriffen zu schützen.

#### Technische Details

- **Implementierung**: `src/lib/rate-limiter.ts`
- **Speicherung**: In-Memory-Store mit konfigurierbaren Zeitfenstern und Anfragelimits
- **Konfigurierbare Limiter**:
  - `standardApiLimiter`: 50 Anfragen/Minute für normale API-Endpunkte
  - `authLimiter`: 10 Anfragen/Minute für Authentifizierungs-Endpunkte
  - `sensitiveActionLimiter`: 5 Anfragen/Stunde für sicherheitskritische Aktionen

#### Verwendung im Code

```typescript
import { standardApiLimiter } from '@/lib/rate-limiter';

export async function POST(context: APIContext): Promise<Response> {
  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return rateLimitResponse; // Wenn Rate-Limit überschritten wurde
  }
  
  // Normale API-Logik...
}
```

#### Antwort bei überschrittenem Limit

Wenn ein Client das Rate-Limit überschreitet, erhält er eine strukturierte JSON-Antwort mit HTTP-Status 429:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

Dazu werden entsprechende HTTP-Header gesetzt, die dem Client helfen, sein Verhalten anzupassen:

```
Status: 429 Too Many Requests
Content-Type: application/json
Retry-After: 45
```

### 2. Security-Headers-System

Ein umfassendes System zur Anwendung von Sicherheits-HTTP-Headern wurde implementiert, um gängige Web-Sicherheitsrisiken zu minimieren.

#### Technische Details

- **Implementierung**: `src/lib/security-headers.ts`
- **Standardisierte Header-Sets**:
  - `standardSecurityHeaders`: Basis-Sicherheitsheader für alle Antworten
  - `apiSecurityHeaders`: Erweiterte Header speziell für API-Endpunkte
- **Implementierte Header**:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
  - Strict-Transport-Security
  - Permissions-Policy
  - Cross-Origin-Opener-Policy
  - Cross-Origin-Embedder-Policy

#### Verwendung im Code

```typescript
import { secureJsonResponse, secureErrorResponse } from '@/lib/security-headers';

// Erfolgsantwort mit Sicherheitsheadern
return secureJsonResponse({ message: 'Success', data: {...} }, 200);

// Fehlerantwort mit Sicherheitsheadern
return secureErrorResponse('Validation failed', 400);

// Bestehende Response mit Sicherheitsheadern anreichern
const originalResponse = new Response(...);
return applySecurityHeaders(originalResponse);
```

### 3. Security-Audit-Logging

Ein zentrales Security-Audit-Logging-System wurde implementiert, um sicherheitsrelevante Ereignisse einheitlich zu protokollieren und zu überwachen.

#### Technische Details

- **Implementierung**: `src/lib/security-logger.ts`
- **Event-Typen**:
  - AUTH_SUCCESS: Erfolgreiche Authentifizierung
  - AUTH_FAILURE: Fehlgeschlagene Authentifizierung
  - PASSWORD_RESET: Passwort-Reset-Aktionen
  - PROFILE_UPDATE: Profilaktualisierungen
  - PERMISSION_DENIED: Zugriffsverweigerungen
  - RATE_LIMIT_EXCEEDED: Überschrittene Rate-Limits
  - SUSPICIOUS_ACTIVITY: Verdächtige Aktivitäten
  - API_ERROR: API-Fehler mit Sicherheitsrelevanz

#### Verwendung im Code

```typescript
import { logProfileUpdate, logApiError, logPermissionDenied } from '@/lib/security-logger';

// Erfolgreiche Profilaktualisierung protokollieren
logProfileUpdate(userId, {
  oldUsername: oldUsername,
  newUsername: newUsername,
  // Weitere Details...
});

// API-Fehler protokollieren
logApiError('/api/user/profile', error, { userId, action: 'profile_update' });

// Zugriffsverweigerung protokollieren
logPermissionDenied(userId, '/api/restricted-resource', {
  reason: 'insufficient_permissions'
});
```

### Integration aller Security-Features

Die User-API `/api/user/profile` wurde als Beispiel-Implementation aktualisiert und integriert alle drei Security-Features:

```typescript
// POST /api/user/profile
export async function POST(context: APIContext): Promise<Response> {
  // 1. Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // Authentifizierung prüfen
  if (!locals.user) {
    // 2. Unautorisierte Zugriffe protokollieren
    logPermissionDenied('anonymous', '/api/user/profile', {
      message: 'Unauthenticated profile update attempt',
      ip: context.clientAddress
    });
    
    // 3. Sichere Fehlerantwort mit Security-Headern
    return secureErrorResponse('Not authenticated', 401);
  }
  
  // Weitere API-Logik...
}
```

### Empfehlungen für zukünftige Security-Verbesserungen

1. **Rate-Limiting-Persistenz**: Umstellung des In-Memory-Stores auf eine persistente Lösung (Redis, D1)
2. **Geolocation-basiertes Blocking**: Blockieren von verdächtigen IP-Ranges und Regionen
3. **Automatisierte Security-Scans**: Integration von OWASP ZAP oder ähnlichen Tools in die CI/CD-Pipeline
