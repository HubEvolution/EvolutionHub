# Contributing to Evolution Hub

Vielen Dank für dein Interesse, zum Evolution Hub Projekt beizutragen! Dieser Leitfaden soll dir helfen, den Entwicklungsprozess zu verstehen und effektiv zum Projekt beizutragen.

## Inhaltsverzeichnis

1. [Erste Schritte](#erste-schritte)
2. [Entwicklungsworkflow](#entwicklungsworkflow)
3. [Branching-Strategie](#branching-strategie)
4. [Commit-Konventionen](#commit-konventionen)
5. [Pull-Request-Prozess](#pull-request-prozess)
6. [Code-Standards](#code-standards)
7. [Testing](#testing)
8. [Dokumentation](#dokumentation)
9. [CI/CD-Pipeline](#cicd-pipeline)
10. [Fehler melden und Feature-Anfragen](#fehler-melden-und-feature-anfragen)

---

## Erste Schritte

### Voraussetzungen

Bevor du mit der Entwicklung beginnst, stelle sicher, dass du folgende Tools installiert hast:

- Node.js (Version 18 oder höher)
- npm (Version 8 oder höher)
- Git
- Wrangler CLI (`npm install -g wrangler`)

### Setup

1. Forke das Repository auf GitHub
2. Klone dein geforktes Repository:
   ```bash
   git clone https://github.com/dein-username/evolution-hub.git
   cd evolution-hub
   ```
3. Installiere die Abhängigkeiten:
   ```bash
   npm install
   ```
4. Kopiere die Beispiel-Umgebungsvariablen:
   ```bash
   cp .env.example .env
   ```
5. Konfiguriere die lokale Entwicklungsumgebung (siehe [SETUP.md](SETUP.md) für Details)

### Lokale Entwicklung

Starte den Entwicklungsserver:

```bash
npm run dev
```

Die Anwendung ist dann unter `http://localhost:3000` verfügbar.

---

## Entwicklungsworkflow

Der Entwicklungsprozess für Evolution Hub folgt diesen Schritten:

1. **Issue auswählen oder erstellen**: Wähle ein bestehendes Issue aus oder erstelle ein neues, um deine Arbeit zu dokumentieren.
2. **Feature-Branch erstellen**: Erstelle einen neuen Branch basierend auf `main` für deine Änderungen.
3. **Implementieren und Testen**: Implementiere die Änderungen und schreibe Tests.
4. **Lokale Tests durchführen**: Führe alle Tests lokal aus, um sicherzustellen, dass deine Änderungen funktionieren.
5. **Code formatieren**: Führe Linting und Formatierung durch.
6. **Änderungen committen**: Committe deine Änderungen mit aussagekräftigen Commit-Nachrichten.
7. **Pull Request erstellen**: Erstelle einen Pull Request gegen den `main`-Branch.
8. **Code Review**: Reagiere auf Feedback aus dem Code Review.
9. **Merge**: Nach Genehmigung wird dein PR in den `main`-Branch gemergt.

---

## Branching-Strategie

Wir verwenden eine Feature-Branch-Strategie mit folgenden Branch-Typen:

- **main**: Produktionscode, immer stabil
- **feature/\***: Für neue Features (z.B. `feature/user-dashboard`)
- **bugfix/\***: Für Bugfixes (z.B. `bugfix/login-error`)
- **hotfix/\***: Für kritische Produktionsfixes (z.B. `hotfix/security-vulnerability`)
- **release/\***: Für Release-Vorbereitungen (z.B. `release/v1.2.0`)

### Branch-Benennung

Folge diesen Konventionen für Branch-Namen:

- Verwende Kleinbuchstaben und Bindestriche
- Beginne mit dem Branch-Typ (feature, bugfix, etc.)
- Füge eine kurze, beschreibende Bezeichnung hinzu
- Füge bei Bedarf die Issue-Nummer hinzu

Beispiele:
- `feature/user-authentication`
- `bugfix/form-validation-123` (für Issue #123)
- `hotfix/security-header-fix`

---

## Commit-Konventionen

Wir verwenden das [Conventional Commits](https://www.conventionalcommits.org/) Format für Commit-Nachrichten:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Typen

- **feat**: Ein neues Feature
- **fix**: Ein Bugfix
- **docs**: Nur Dokumentationsänderungen
- **style**: Änderungen, die nicht den Code beeinflussen (Formatierung, etc.)
- **refactor**: Code-Änderungen, die weder Features hinzufügen noch Bugs beheben
- **perf**: Änderungen zur Verbesserung der Performance
- **test**: Hinzufügen oder Korrigieren von Tests
- **chore**: Änderungen am Build-Prozess oder Hilfswerkzeugen

### Beispiele

```
feat(auth): Implementiere JWT-basierte Authentifizierung

Fügt JWT-Token-Generierung und -Validierung hinzu.
Implementiert sichere HttpOnly-Cookies für Token-Speicherung.

Closes #42
```

```
fix(api): Korrigiere Fehlerbehandlung in Login-API

Stellt sicher, dass alle Fehler korrekt erfasst und formatiert werden.

Fixes #123
```

---

## Pull-Request-Prozess

1. **PR erstellen**: Erstelle einen Pull Request gegen den `main`-Branch.
2. **PR-Beschreibung**: Fülle die PR-Vorlage aus mit:
   - Beschreibung der Änderungen
   - Verknüpfte Issues
   - Testabdeckung
   - Screenshots (falls relevant)
3. **CI-Checks**: Stelle sicher, dass alle CI-Checks erfolgreich sind.
4. **Code Review**: Mindestens ein Teammitglied muss den PR genehmigen.
5. **Änderungen**: Reagiere auf Feedback und pushe Änderungen in denselben Branch.
6. **Merge**: Nach Genehmigung und erfolgreichen CI-Checks kann der PR gemergt werden.

### PR-Vorlage

```markdown
## Beschreibung
[Beschreibe die Änderungen und den Kontext]

## Verknüpfte Issues
[Verlinke relevante Issues, z.B. "Closes #123"]

## Typ der Änderung
- [ ] Bugfix
- [ ] Feature
- [ ] Performance-Verbesserung
- [ ] Refactoring
- [ ] Dokumentation
- [ ] Andere (bitte spezifizieren)

## Wie wurde getestet?
[Beschreibe die Testmethoden]

## Checkliste
- [ ] Mein Code folgt den Coding-Standards des Projekts
- [ ] Ich habe Tests für meine Änderungen geschrieben
- [ ] Ich habe die Dokumentation aktualisiert
- [ ] Alle CI-Checks sind erfolgreich
- [ ] Coverage-Gates erfüllt (siehe `vitest.config.ts` Thresholds)

---

## Code-Standards

Wir folgen strikten Code-Standards, um die Codequalität und Konsistenz zu gewährleisten:

### Allgemeine Standards

- Verwende konsistente Einrückung (4 Spaces für Python, 2 Spaces für JavaScript)
- Folge den Namenskonventionen: camelCase für JavaScript, snake_case für Python
- Halte Funktionen und Methoden kurz und fokussiert (< 50 Zeilen)
- Vermeide tiefe Verschachtelung (maximal 3 Ebenen)
- Verwende aussagekräftige Variablen- und Funktionsnamen
- Begrenze die Zeilenlänge auf 80-100 Zeichen
- Halte einen konsistenten Codestil im gesamten Projekt ein

### TypeScript-spezifische Standards

- Verwende strikte Typisierung (`"strict": true` in tsconfig.json)
- Definiere explizite Rückgabetypen für Funktionen
- Verwende Interfaces für komplexe Datenstrukturen
- Vermeide `any` wo möglich
- Nutze Import-Aliase (@/components, @/lib) statt relativer Pfade

### React-spezifische Standards

- Verwende funktionale Komponenten mit Hooks
- Extrahiere wiederverwendbare Logik in Custom Hooks
- Halte Komponenten klein und fokussiert
- Verwende TypeScript-Props-Interfaces für Komponenten
- Folge dem Prinzip der unidirektionalen Datenflüsse

### Astro-spezifische Standards

- Platziere alle UI-Komponenten in /src/components/
- Verwende eine flache Komponentenstruktur ohne tiefe Verschachtelung
- Benenne Komponenten mit PascalCase
- Exportiere Komponenten als default export

---

## Testing

Tests sind ein wesentlicher Bestandteil unseres Entwicklungsprozesses:

### Test-Frameworks

- **Vitest**: Für Unit- und Integrationstests
- **Playwright**: Für End-to-End-Tests
- **MSW (Mock Service Worker)**: Für API-Mocking in Tests

### Test-Typen

1. **Unit-Tests**: Testen einzelner Funktionen und Komponenten
2. **Integrationstests**: Testen der Interaktion zwischen Komponenten
3. **E2E-Tests**: Testen der Anwendung aus Benutzerperspektive
4. **API-Tests**: Testen der API-Endpunkte

### Test-Konventionen

- Benenne Testdateien mit `.test.ts` oder `.spec.ts`
- Organisiere Tests in beschreibenden Blöcken mit `describe`
- Verwende aussagekräftige Testbeschreibungen mit `it` oder `test`
- Folge dem AAA-Prinzip (Arrange, Act, Assert)
- Mindestabdeckung (global): Branches ≥ 90%, Lines/Statements/Functions ≥ 95%
  - Die Gates werden in `vitest.config.ts` konfiguriert und schlagen den Build/Test bei Unterschreitung fehl.

### Tests ausführen

```bash
# Alle Tests ausführen
npm test

# Unit- und Integrationstests ausführen
npm run test:unit

# E2E-Tests ausführen
npm run test:e2e

# Testabdeckung generieren
npm run test:coverage
```

---

## Dokumentation

Gute Dokumentation ist entscheidend für die Wartbarkeit und Zugänglichkeit des Projekts:

### Code-Dokumentation

- Dokumentiere öffentliche APIs und Schnittstellen
- Verwende JSDoc-Kommentare für TypeScript-Funktionen
- Erkläre komplexe Algorithmen mit Inline-Kommentaren
- Halte die Dokumentation synchron mit Code-Änderungen

### Projekt-Dokumentation

- **README.md**: Projektübersicht, Funktionen, Schnellstart
- **SETUP.md**: Detaillierte Setup- und Installationsanleitung
- **CONTRIBUTING.md**: Dieser Leitfaden
- **SECURITY.md**: Sicherheitsrichtlinien und -features
- **docs/**: Detaillierte Dokumentation zu spezifischen Themen

### Dokumentationskonventionen

- Verwende Markdown für alle Dokumentationsdateien
- Strukturiere Dokumente mit klaren Überschriften und Abschnitten
- Füge Codebeispiele für komplexe Konzepte hinzu
- Halte die Dokumentation aktuell bei Code-Änderungen

---

## CI/CD-Pipeline

Wir verwenden GitHub Actions für unsere CI/CD-Pipeline:

### CI-Prozess

1. **Lint**: Überprüft den Code auf Stilprobleme
2. **Build**: Baut die Anwendung
3. **Test**: Führt alle Tests aus
4. **Security Scan**: Überprüft Abhängigkeiten auf Sicherheitslücken

### CD-Prozess

1. **Preview Deployment**: Jeder PR erhält ein Preview-Deployment
2. **Production Deployment**: Erfolgt automatisch nach Merge in den `main`-Branch

### Workflow-Dateien

Die Workflow-Konfigurationen befinden sich im Verzeichnis `.github/workflows/`:

- `ci.yml`: Continuous Integration Workflow
- `preview.yml`: Preview Deployment Workflow
- `deploy.yml`: Production Deployment Workflow
- `e2e-tests.yml`: E2E-Workflow inkl. Job "Unit + Coverage Gates"; E2E-Job hängt von Unit ab (`needs: unit`).

---

## Fehler melden und Feature-Anfragen

### Fehler melden

Wenn du einen Fehler findest, erstelle ein Issue mit folgenden Informationen:

1. Klarer, beschreibender Titel
2. Schritte zum Reproduzieren des Fehlers
3. Erwartetes Verhalten
4. Tatsächliches Verhalten
5. Screenshots oder Logs (falls relevant)
6. Umgebungsinformationen (Browser, Betriebssystem, etc.)

### Feature-Anfragen

Für Feature-Anfragen erstelle ein Issue mit:

1. Klarer, beschreibender Titel
2. Detaillierte Beschreibung des gewünschten Features
3. Anwendungsfälle und Vorteile
4. Mögliche Implementierungsansätze (optional)

---

## Kontakt

Bei Fragen oder Problemen kannst du:

- Ein Issue im GitHub-Repository erstellen
- Das Entwicklerteam über [Kontaktinformationen einfügen] kontaktieren

Vielen Dank für deinen Beitrag zum Evolution Hub Projekt!
