# Evolution Hub

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Status: Aktiv](https://img.shields.io/badge/Status-Aktiv-brightgreen)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=fff)](https://astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=fff)](https://tailwindcss.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=fff)](https://workers.cloudflare.com/)

Evolution Hub ist eine moderne Full-Stack-Webanwendung, die eine Sammlung von Entwickler-Tools bereitstellt. Gebaut mit den neuesten Web-Technologien für maximale Performance und Benutzerfreundlichkeit.

## ✨ Features

- **Tool-Sammlung:** Zugriff auf eine wachsende Bibliothek von Online-Tools für Entwickler
- **AI-Bildbearbeitung:** KI-gestützte Bildverbesserung mit Modellen wie Real-ESRGAN und GFPGAN
- **Authentifizierung:** Stytch Magic Link (E-Mail). Registrierung implizit beim ersten erfolgreichen Callback. Kein Passwort/Reset mehr.
- **Job-System:** Asynchrones Management für langlaufende AI-Operationen
- **API-Sicherheit:** Umfassende Sicherheitsmaßnahmen mit Rate-Limiting und Audit-Logging
- **Mehrsprachig:** Unterstützung für Deutsch und Englisch

## 🛠 Tech Stack

- **Framework:** [Astro](https://astro.build/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **Datenbank:** [Cloudflare D1](https://developers.cloudflare.com/d1/)
- **Speicher:** [Cloudflare R2](https://developers.cloudflare.com/r2/)
- **Testing:** Playwright (E2E), Vitest (Unit)
- **Authentifizierung:** Stytch Magic Link + Session-Cookies (`__Host-session`)

## 🚀 Getting Started

### Voraussetzungen

- Node.js (Version 20.x oder höher)
- npm

### Installation

1. Repository klonen:

   ```bash
   git clone <repository-url>
   cd evolution-hub
   ```

2. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

3. Lokale Datenbank einrichten:

   ```bash
   npx tsx scripts/setup-local-dev.ts
   ```

4. Umgebungsvariablen konfigurieren:

   ```bash
   cp .env.example .env
   ```

### Entwicklung

Zwei Terminals benötigt:

#### Terminal 1: Build-Prozess

```bash
npm run build:watch
```

#### Terminal 2: Entwicklungs-Server

```bash
npm run dev
```

Die Anwendung ist dann unter der von Wrangler angegebenen Adresse verfügbar (z.B. `http://127.0.0.1:8787`).

## 📦 Deployment

Das Deployment erfolgt manuell über die Cloudflare Wrangler CLI in verschiedene Umgebungen:

- **Testing**: `npx wrangler deploy --env testing` (ci.hub-evolution.com)
- **Staging**: `npx wrangler deploy --env staging` (staging.hub-evolution.com)
- **Production**: `npx wrangler deploy --env production` (hub-evolution.com)

Für detaillierte Anweisungen siehe [docs/local-development.md](docs/local-development.md).

## 🧪 Tests

- **E2E-Tests:** Playwright für Benutzerflows
- **Unit-Tests:** Vitest für Komponenten und Services

Tests ausführen:

```bash
npm run test:e2e
npm run test
```

## 📚 Dokumentation

- [API-Dokumentation](./docs/api/)
- [API Quickstart](./docs/api/README.md)
- [Architektur](./docs/architecture/)
- [Sicherheit](./docs/security/)

## 🤝 Mitwirken

Beiträge sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

## 🌐 Live-Demo

[hub-evolution.com](https://hub-evolution.com)

## 📞 Kontakt

- **GitHub:** [LucasBonnerue](https://github.com/LucasBonnerue)
- **X:** [@LucasBonnerue](https://twitter.com/LucasBonnerue)
