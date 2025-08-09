# Evolution Hub - Technologie-Stack und Architektur

## Technologie-Stack

### Frontend
- **Astro v5.12.2**: Framework für serverseitiges Rendern mit optimiertem Output
- **React v18.2.0**: Für interaktive UI-Komponenten (Islands Architecture)
- **Tailwind CSS v3.4.17**: Utility-first CSS-Framework für responsive Design
- **AOS v2.3.1**: Animate On Scroll Library für Scroll-Animationen (CDN-basiert, integriert via AOSCoordinator.astro)
- **Lottie Web v5.13.0**: Für hochwertige SVG-Animationen
- **Heroicons v2.1.5-1**: Icon-Library für die Benutzeroberfläche

### Backend
- **Cloudflare Pages**: Hosting und SSR-Plattform
- **Cloudflare D1**: Serverless SQLite-Datenbank
- **Cloudflare R2**: Objektspeicher (für Benutzer-Avatare)
- **Cloudflare KV**: Key-Value-Store für Session-Management
- **Hono v4.8.5**: Minimalistischer, schneller Web-Framework
- **bcrypt-ts v7.1.0/bcryptjs v3.0.2**: Für sichere Passwort-Hashing

### Authentifizierung & Sicherheit
- **Jose v6.0.12**: Für JWT-Implementierung und -Verifikation
- **Cookie v1.0.2**: Cookie-Parser und -Generator
- **Neu implementierte Security-Features**:
  - Rate-Limiting-System für API-Endpunkte
  - Standardisierte Security-Headers
  - Zentrales Security-Audit-Logging

### Testing
- **Vitest v3.2.4**: Test-Runner für Unit- und Integrationstests
- **Playwright v1.54.1**: End-to-End-Testing-Framework
- **Testing Library**: Für komponentenbasierte Tests
- **MSW v2.10.4**: Mock Service Worker für API-Testing
- **@mswjs/data**: Für Mock-Datenbank-Operationen

### E-Mail & Benachrichtigungen
- **Resend v4.7.0**: E-Mail-API für transaktionale E-Mails
- **Toastr v2.1.4**: Für In-App-Benachrichtigungen

### Zahlungen
- **Stripe v18.3.0**: Payment Processing

## Architektur-Übersicht

### Verzeichnisstruktur
```
evolution-hub/
├── src/
│   ├── components/       # UI-Komponenten (Astro + React)
│   ├── content/          # Content Collections für Blog/Docs
│   ├── layouts/          # Layout-Templates
│   ├── lib/              # Shared Libraries und Utilities
│   │   ├── rate-limiter.ts   # Rate-Limiting-System
│   │   ├── security-headers.ts # Security-Headers-System
│   │   └── security-logger.ts  # Audit-Logging-System
│   ├── pages/            # Routen und API-Endpunkte
│   │   ├── api/          # Backend API
│   │   │   ├── auth/     # Authentifizierungs-Endpunkte
│   │   │   ├── user/     # Benutzer-bezogene APIs
│   │   │   ├── projects/ # Projekt-bezogene APIs
│   │   │   ├── billing/  # Zahlungs-APIs
│   │   │   └── dashboard/ # Dashboard-APIs
│   ├── server/           # Server-seitige Logik
│   │   └── utils/        # Server-Utilities
│   └── types/            # TypeScript-Typdefinitionen
├── public/               # Statische Assets
├── migrations/           # Datenbank-Migrationen
└── tests/                # End-to-End und Integrationstests
```

### API-Architektur
Die API ist RESTful gestaltet und in logische Gruppen unterteilt:

- **Authentication APIs** (`/api/auth/*`)
  - `login`: Benutzeranmeldung via Benutzername/E-Mail und Passwort
  - `register`: Neue Benutzer-Registrierung
  - `forgot-password`: Password-Reset anfordern
  - `reset-password`: Passwort mit Token zurücksetzen

- **User APIs** (`/api/user/*`)
  - `me`: Benutzerprofilinformationen abrufen
  - `profile`: Profilinformationen aktualisieren
  - `logout`: Session beenden
  - Weitere benutzerbezogene Endpoints

- **Project APIs** (`/api/projects/*`)
  - CRUD-Operationen für Benutzerprojekte

- **Dashboard APIs** (`/api/dashboard/*`)
  - Analytik, Statistiken und Dashboard-spezifische Daten

- **Billing APIs** (`/api/billing/*`)
  - Zahlungsinformationen, Abonnements und Rechnungen

### Datenmodell
Das Projekt verwendet eine SQLite-Datenbank (Cloudflare D1) mit folgenden Haupttabellen:

1. `users`: Benutzerkonten und Authentifizierungsdaten
2. `sessions`: Aktive Benutzersitzungen
3. `projects`: Benutzerprojekte und zugehörige Metadaten
4. `comments`: Kommentare zu Projekten oder Inhalten
5. `subscriptions`: Benutzerabonnements und Zahlungsdetails

### Frontend-Architektur
- **Islands Architecture** mit Astro und React
- **SSR-First Approach**: Server-seitiges Rendering für schnelles Initial Loading
- **Progressive Enhancement**: Statische Inhalte mit gezielter JavaScript-Interaktivität
- **Responsive Design** mit Tailwind CSS
- **Component-Based UI**: Wiederverwendbare UI-Komponenten

### Security-Konzepte
- **JWT-basierte Authentifizierung** mit sicheren HttpOnly-Cookies
- **Strikte Content-Security-Policy** und Security-Headers
- **Rate-Limiting** für alle API-Endpunkte
- **Zentrales Audit-Logging** für sicherheitsrelevante Ereignisse
- **Input-Validierung** und Whitelist-Filterung für alle API-Responses

### Testing-Strategie
- **Unit-Tests** für einzelne Funktionen und Utilities
- **Integrationstests** für API-Endpunkte und Datenbank-Interaktionen
- **End-to-End-Tests** für vollständige Benutzerflows mit Playwright
- **Mock-Services** für externe Abhängigkeiten und Datenbank

### CI/CD und Deployment
- **GitHub Actions** für automatisierte Tests
- **Cloudflare Pages** für Continuous Deployment
- **Preview-Deployments** für Pull Requests

## Features

### Implementierte Kernfunktionen
- **Benutzerauthentifizierung**: Login, Registrierung, Passwort-Reset
- **Benutzerprofil-Management**: Profil anzeigen und bearbeiten
- **Projektmanagement**: Projekte erstellen, anzeigen, bearbeiten und löschen
- **Dashboard**: Übersichtsseite mit relevanten Benutzerinformationen
- **Blog/Content-System**: Content-Management und Darstellung

### Sicherheitsfunktionen
- **Rate-Limiting**: Schutz vor Brute-Force und DoS-Angriffen
- **Security-Headers**: Standardisierte Headers für alle API-Antworten
- **Audit-Logging**: Zentrales Protokollieren sicherheitsrelevanter Ereignisse
- **Input-Validierung**: Strikte Validierung aller Benutzereingaben
- **Output-Filterung**: Whitelist-basierte Filterung sensibler Daten

### Neu implementierte Features
- **Verbesserte Authentifizierungssicherheit**: Typisierte und getestete Auth-Module
- **API-Security-Verbesserungen**: Rate-Limiting, Headers, Logging
- **Erweiterte Testabdeckung**: Unit-Tests für kritische Komponenten
- **Konsistente Fehlerbehandlung**: Standardisierte API-Fehlerantworten
