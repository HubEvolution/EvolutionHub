ve![EvolutionHub Banner](./public/assets/svg/Banner.svg)

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Status: Aktiv](https://img.shields.io/badge/Status-Aktiv-brightgreen)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=fff)](https://astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=fff)](https://tailwindcss.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=fff)](https://pages.cloudflare.com/)
[![Cloudflare Status](https://img.shields.io/endpoint?url=https://cloudflare-status-badge.endpoint)](https://www.cloudflarestatus.com/)

Eine Full-Stack-Webanwendung, die eine Sammlung von Entwickler-Tools bereitstellt. Gebaut mit den neuesten Web-Technologien, um eine schnelle, moderne und skalierbare Plattform zu schaffen.

---

## <img src="public/assets/svg/features.svg" alt="Features Icon" height="20"> Features

- <img src="public/assets/svg/features.svg" alt="Tools Icon" height="15"> **Tool-Sammlung:** Zugriff auf eine wachsende Bibliothek von Online-Tools für Entwickler.
- <img src="public/assets/svg/features.svg" alt="Frontend Icon" height="15"> **Modernes Frontend:** Gebaut mit [Astro](https://astro.build/) für maximale Performance.
- <img src="public/assets/svg/style.svg" alt="Styling Icon" height="15"> **Styling:** [Tailwind CSS](https://tailwindcss.com/) für ein schnelles und konsistentes Design.
- <img src="public/assets/svg/deployment.svg" alt="Serverless Icon" height="15"> **Serverless-Backend:** Läuft auf [Cloudflare Pages](https://pages.cloudflare.com/) mit Cloudflare D1 als Datenbank.
- <img src="public/assets/svg/features.svg" alt="Auth Icon" height="15"> **Authentifizierung:** Sichere Authentifizierung mit E-Mail und Passwort, einschließlich Registrierung, Login und einer "Passwort vergessen"-Funktion.
- <img src="public/assets/svg/features.svg" alt="Profile Icon" height="15"> **Profilverwaltung:** Benutzer können ihr Profil bearbeiten, einschließlich Name, Passwort und Avatar-Upload.
- <img src="public/assets/svg/security.svg" alt="Security Icon" height="15"> **API-Sicherheit:** Umfassende Sicherheitsmaßnahmen für alle API-Endpunkte, einschließlich Rate-Limiting, Security-Headers und Audit-Logging.
- <img src="public/assets/svg/features.svg" alt="UI/UX Icon" height="15"> **UI/UX-Verbesserungen:** Ein modernes Benutzererlebnis durch ein Benachrichtigungssystem (Toasts), Lottie-Animationen und sanfte Scroll-Effekte.
- <img src="public/assets/svg/api.svg" alt="API Icon" height="15"> **API-Dokumentation:** Umfassende OpenAPI/Swagger-Spezifikation für alle API-Endpunkte.

---

## <img src="public/assets/svg/tech-stack.svg" alt="Tech Stack Icon" height="20"> Tech Stack

- **Framework:** [Astro](https://astro.build/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI-Komponenten:** [React](https://react.dev/) (innerhalb von Astro)
- **Komponenten-Architektur:** Hybrides System mit Astro- und React-Komponenten (siehe [Card-Komponenten-Dokumentation](./docs/frontend/card-components.md))
- **Hosting & Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/)
- **Datenbank:** [Cloudflare D1](https://developers.cloudflare.com/d1/)
- **Bild-Speicher:** [Cloudflare R2](https://developers.cloudflare.com/r2/)
- **Animationen:** [Lottie-web](https://airbnb.io/lottie/), [AOS (Animate On Scroll)](https://michalsnik.github.io/aos/)
- **Benachrichtigungen:** [Sonner](https://sonner.emilkowal.ski/) via typisiertem Wrapper `notify` (`src/lib/notify.ts`) und globalem `<Toaster />`-Island (`src/components/Toaster.tsx`)
- **Testing:** [Playwright](https://playwright.dev/) für E2E-Tests, [Vitest](https://vitest.dev/) für Unit-Tests
- **Sicherheit:** Rate-Limiting, Security-Headers, Audit-Logging, Input-Validierung

---

## <img src="public/assets/svg/getting-started.svg" alt="Getting Started Icon" height="20"> Getting Started

Folge diesen Schritten, um das Projekt lokal zu installieren und auszuführen.

### Voraussetzungen

- [Node.js](https://nodejs.org/) (Version 20.x oder höher)
- [npm](https://www.npmjs.com/) (wird mit Node.js installiert)

### Installation

1. Klone das Repository:
   ```bash
   git clone <repository-url>
   ```
2. Installiere die Abhängigkeiten:
   ```bash
   npm install
   ```
3. Führe das Setup-Script aus, um die lokale Datenbank zu erstellen und zu migrieren:
   ```bash
   npx tsx scripts/setup-local-dev.ts
   ```
   
   > **Hinweis:** Das Setup-Script erstellt einen Test-Benutzer mit den Anmeldedaten:
   > - E-Mail: `test@example.com`
   > - Passwort: `password123`
3. Erstelle eine `.env`-Datei aus dem Beispiel und fülle die notwendigen Umgebungsvariablen aus:
   ```bash
   cp .env.example .env
   ```

### Projekt starten

Für die lokale Entwicklung werden zwei Terminals benötigt.

**Terminal 1: Build-Prozess**
Führe den folgenden Befehl aus, um die Anwendung zu bauen und bei jeder Änderung automatisch neu zu bauen:
```bash
npm run build:watch
```

**Terminal 2: Entwicklungs-Server**
Führe den folgenden Befehl aus, um den `wrangler`-Server zu starten, der sich mit den Live-Ressourcen verbindet:
```bash
npm run dev
```

Das Projekt ist nun unter der von `wrangler` angegebenen Adresse erreichbar (z.B. `http://127.0.0.1:8787`).

#### Dev-Server (Wrangler) & Smoke-Checks

Führe nach dem Start ein paar schnelle Checks aus:

```bash
# Root -> Welcome-Redirect
curl -sS -D - -o /dev/null http://127.0.0.1:8787/

# Welcome-Seite (noindex, nofollow expected)
curl -sS -D - -o /dev/null http://127.0.0.1:8787/welcome
curl -sS -D - -o /dev/null http://127.0.0.1:8787/welcome/

# EN-Startseite
curl -sS -D - -o /dev/null http://127.0.0.1:8787/en/

# Assets (SVG/PNG) – korrekter Content-Type
curl -sS -D - -o /dev/null http://127.0.0.1:8787/assets/svg/logo.svg
curl -sS -D - -o /dev/null http://127.0.0.1:8787/favicons/favicon-32x32.png

# Web App Manifest – korrekter Content-Type
curl -sS -D - -o /dev/null http://127.0.0.1:8787/site.webmanifest
```

Erwartete Header u. a.:

- `Vary: Cookie, Accept-Language`
- `Content-Language: en|de`
- `X-Robots-Tag` auf `/welcome`
- `Content-Type: application/manifest+json` auf `/site.webmanifest`

---

## <img src="public/assets/svg/deployment.svg" alt="Deployment Icon" height="20"> Deployment

Das Deployment erfolgt automatisch bei jedem `git push` auf den `main`-Branch über **Cloudflare Pages**. Der Build-Prozess und die Bereitstellung werden vollständig von Cloudflare verwaltet.

---

## <img src="public/assets/svg/deployment.svg" alt="Cloudflare Management Icon" height="20"> Cloudflare Management (CLI)

Da dieses Projekt ohne `wrangler.toml` konfiguriert ist, werden einige Cloudflare-spezifische Aktionen über die Wrangler CLI ausgeführt.

### R2 Bucket erstellen

Um einen neuen R2-Bucket für den Bild-Upload zu erstellen, verwende den folgenden Befehl:

```bash
npx wrangler r2 bucket create <BUCKET_NAME>
```

> **Hinweis:** Nach dem Erstellen des Buckets muss dieser manuell im Cloudflare Dashboard an das Pages-Projekt gebunden werden, da keine `wrangler.toml` verwendet wird.

### D1 Datenbankmigration

Die lokale SQLite-Datenbank wird unter `.wrangler/d1/miniflare/databases/evolution-hub-main-local.sqlite` gespeichert und bleibt zwischen Neustarts des Entwicklungsservers erhalten. Das Setup-Script muss nur ausgeführt werden, wenn:

- Das Projekt zum ersten Mal eingerichtet wird
- Neue Migrations-Dateien hinzugefügt wurden
- Die Datenbank zurückgesetzt werden soll
- Probleme mit der Datenbank auftreten (z.B. fehlende Tabellen)

Um Migrationen auf der **remote** D1-Datenbank auszuführen, verwende diesen Befehl:

```bash
npx wrangler d1 migrations apply <DATABASE_NAME> --remote
```

---

## <img src="public/assets/svg/live-demo.svg" alt="Live Demo Icon" height="20"> Live-Demo

Eine Live-Version der Anwendung findest du hier: **[evolution-hub.pages.dev](https://hub-evolution.pages.dev)**

---

## <img src="public/assets/svg/social-media.svg" alt="Social Media Icon" height="20"> Social Media

- **GitHub:** [LucasBonnerue](https://github.com/LucasBonnerue)
- **X (ehemals Twitter):** [@LucasBonnerue](https://twitter.com/LucasBonnerue)

---

## <img src="public/assets/svg/credits.svg" alt="Credits Icon" height="20"> 3D-Illustrationen

- [Storyset](https://storyset.com/) für 3D-Illustrationen.
- [Lottiefiles](https://lottiefiles.com/) für animierte SVG-Icons.

---

## <img src="public/assets/svg/dark-mode.svg" alt="Dark Mode Icon" height="20"> Dark-Mode-Unterstützung

Diese README-Datei unterstützt dynamische SVG-Grafiken, die sich an den Dark Mode anpassen.

---

## <img src="public/assets/svg/style.svg" alt="Style Icon" height="20"> Futuristische Schriftarten und Stile

- **Schriftarten:** [Google Fonts](https://fonts.google.com/) für moderne Typografie.
- **SVG-Banner:** Dynamische, futuristische Banner.

---

## <img src="public/assets/svg/contribute.svg" alt="Contribute Icon" height="20"> Mitwirken

Beiträge sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue, um Ideen einzubringen.

---

## <img src="public/assets/svg/architecture.svg" alt="Architecture Icon" height="20"> Architektur und Komponenten

### Komponenten-Architektur

Evolution Hub verwendet ein hybrides Komponenten-System mit Astro und React:

- **Astro-Komponenten** (`.astro`): Für statische Seiten und Layouts
- **React-Komponenten** (`.jsx`): Für interaktive UI-Elemente

Besonders zu beachten ist das Card-Komponenten-Pattern:

- `Card.astro`: Für Verwendung in Astro-Dateien
- `CardReact.jsx`: Für Verwendung in React-Komponenten

Diese Trennung ist notwendig, da Astro-Komponenten nicht direkt in React verwendet werden können. Weitere Details finden Sie in der [Card-Komponenten-Dokumentation](./docs/frontend/card-components.md).

### Datenbank-Schema

Die Anwendung verwendet eine SQLite-Datenbank mit Cloudflare D1. Das Schema umfasst:

- Benutzer- und Authentifizierungstabellen (`users`, `sessions`, `password_reset_tokens`)
- Projekttabellen (`projects`, `tasks`)
- Interaktionstabellen (`comments`, `activities`, `notifications`)

Detaillierte Informationen zum Datenbankschema und zu Migrationen finden Sie in der [Datenbank-Dokumentation](./docs/db_schema_update.md).

## <img src="public/assets/svg/maintenance.svg" alt="Maintenance Icon" height="20"> Wartung und Aktualisierungen

### Durchgeführte Code-Cleanup-Maßnahmen

- **Import-Standardisierung:** Alle relativen Pfade zu Alias `@/lib` geändert, konsistente Import-Reihenfolge eingeführt, ungenutzte Imports entfernt
- **TypeScript-Typisierung:** Neue Interfaces erstellt: `User`, `Session`, `SessionRow`, `PasswordResetToken`, striktes Type-Checking für alle Authentifizierungs-APIs und Datenbankabfragen
- **Code-Formatierung:** Einheitliche Einrückungen (2 Leerzeichen), konsistente Kommentare, lesbare Struktur
- **Auth-Module bereinigt:**
  - `src/lib/auth-v2.ts`
  - `src/pages/api/auth/login.ts`
  - `src/pages/api/auth/register.ts`
  - `src/pages/api/auth/forgot-password.ts`
  - `src/pages/api/auth/reset-password.ts`
  - `src/middleware.ts`
- **Regelkonformität:** Globale Coding-Standards, Authentifizierungsregeln, Cloudflare-Patterns und Astro-spezifische Regeln wurden beachtet

### Dependency-Updates

- Alle Abhängigkeiten wurden auf die neuesten sicheren Versionen aktualisiert
- 108 neue Pakete hinzugefügt, 8 Pakete entfernt, 41 Pakete geändert
- 0 Sicherheitslücken gefunden

### Tests

- **E2E-Tests:** Playwright-Tests für Authentifizierungsflows, kritische Benutzerflows und Dashboard-Funktionalität
  - Page-Object-Modell für saubere Testabstraktion
  - Tests für Login, Registrierung, OAuth-Flows und Fehlerszenarien
- **Unit- und Integrationstests:**
  - Vitest-Framework für schnelles Testen
  - Testabdeckung für Core-Funktionen: **14.76%** Gesamtabdeckung 
  - Vollständige Testabdeckung (100%) für Auth-Modul, Login- und Register-API
  - Mocking-Framework für D1-Datenbankinteraktionen

> Hinweis (E2E & CSRF): Für POST-Requests in E2E-Tests ist ein same-origin `Origin`-Header erforderlich (Astro/Cloudflare CSRF-Schutz). Siehe Abschnitt „CSRF-Schutz in E2E-Tests“ in der CI/CD-Doku: [docs/development/ci-cd.md#csrf-schutz-in-e2e-tests-astrocloudflare-workers](./docs/development/ci-cd.md#csrf-schutz-in-e2e-tests-astrocloudflare-workers)

#### Test-Prioritäten

Für die Weiterentwicklung der Tests wurden folgende Prioritäten identifiziert:

1. **Höchste Priorität** (Sicherheitsrelevante Komponenten):
   - `src/server/utils/hashing.ts` (Passwort-Hashing)
   - `src/server/utils/jwt.ts` (Token-Management)

2. **Hohe Priorität** (Auth-Flow vervollständigen):
   - `src/pages/api/auth/forgot-password.ts`
   - `src/pages/api/auth/reset-password.ts`
   - `src/pages/api/user/logout.ts`

3. **Mittlere Priorität** (Kernfunktionalität):
   - User-APIs (Profile, Settings)
   - Projekt-Management-APIs
   - Dashboard-APIs

> **Hinweis:** Detaillierte Informationen zur Testausführung, bekannten Problemen, Coverage-Analyse und Verbesserungsvorschlägen finden sich in der [SETUP.md](./SETUP.md#tests-ausführen)

---

## <img src="public/assets/svg/security.svg" alt="Security Icon" height="20"> API-Sicherheit

Evolution Hub implementiert umfassende Sicherheitsmaßnahmen für alle API-Endpunkte:

### Implementierte Security-Features

- **Rate-Limiting:** Schutz vor Brute-Force- und DoS-Angriffen mit konfigurierbaren Zeitfenstern und Limits
- **Security-Headers:** Umfassende HTTP-Header zur Minimierung von Web-Sicherheitsrisiken
- **Audit-Logging:** Zentrales Logging-System für sicherheitsrelevante Ereignisse
- **Input-Validierung:** Strenge Validierung und Sanitisierung aller Benutzereingaben
- **Datenschutz:** Whitelist-Filterung sensibler Daten und sichere Passwort-Hashing-Verfahren

### Security-Features nach API-Kategorie

| API-Kategorie | Rate-Limiting | Security-Headers | Audit-Logging | Input-Validierung |
|---------------|--------------|------------------|---------------|-------------------|
| Auth-APIs | ✅ (10/min) | ✅ | ✅ | ✅ |
| User-APIs | ✅ (50/min) | ✅ | ✅ | ✅ |
| Projekt-APIs | ✅ (50/min) | ✅ | ✅ | ✅ |
| Dashboard-APIs | ✅ (50/min) | ✅ | ✅ | ✅ |
| Öffentliche APIs | ✅ (50/min) | ✅ | ✅ | ✅ |

> **Hinweis:** Eine detaillierte Dokumentation aller Sicherheitsmaßnahmen, einschließlich endpunktspezifischer Implementierungen und Best Practices, finden Sie in der [SECURITY.md](./SECURITY.md)
