# Evolution Hub

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Status: Aktiv](https://img.shields.io/badge/Status-Aktiv-brightgreen)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=fff)](https://astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=fff)](https://tailwindcss.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=fff)](https://workers.cloudflare.com/)
![React](https://img.shields.io/badge/react-%2361DAFB.svg?style=for-the-badge&logo=react&logoColor=black)
![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=for-the-badge)

<!-- CI Badges -->

[![Enhancer E2E Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml)
[![Prod Auth Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml)
[![Pricing Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml)

Evolution Hub ist eine moderne Full-Stack-Webanwendung, die eine Sammlung von Entwickler-Tools bereitstellt. Gebaut mit den neuesten Web-Technologien für maximale Performance und Benutzerfreundlichkeit.

## ✨ Features

- **Tool-Sammlung:** Zugriff auf eine wachsende Bibliothek von Online-Tools für Entwickler
- **AI-Bildverbesserung:** Hybrid-Provider (Replicate + Cloudflare Workers AI). Unterstützt u. a. Real-ESRGAN (2x/4x), GFPGAN/CodeFormer (Gesichts-Restore) sowie CF-Modelle (SD 1.5/SDXL img2img)
- **Prompt-Enhancer:** KI-gestützte Text-zu-Prompt-Optimierung für bessere AI-Ergebnisse
- **Webscraper:** Extrahiert strukturierte Inhalte aus Webseiten (API + UI)
- **Voice Visualizer (Transkriptor):** Audio-Transkription (Whisper), Quoten/Limits, sichere APIs
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
- **Authentifizierung:** Stytch Magic Link + Session-Cookies (transitional: `session_id` + `__Host-session` bei HTTPS)

## 🧭 CI at a glance

Eine ausführliche Beschreibung befindet sich in `docs/development/ci-cd.md`. Wichtige Workflows:

- Enhancer E2E Smoke: schneller UI-Smoke nur für den Image Enhancer, Chromium-only, mit Browser-Caching und Preflight-Diagnostik.
- Prod Auth Smoke: produktionsnaher Magic-Link Smoke gegen hub-evolution.com, HTTP-basiert (ohne Browser-Download), mit Preflight POST.
- Pricing Smoke: schneller Smoke der Pricing-Seite (gegen `TEST_BASE_URL` oder Fallback), Chromium-only, mit Browser-Caching und Preflight.

Weitere Details und Trigger-Kommandos siehe: [`docs/development/ci-cd.md`](./docs/development/ci-cd.md)

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
   npm run setup:local
   ```

4. Umgebungsvariablen konfigurieren:

   ```bash
   cp .env.example .env
   ```

### Entwicklung

Du kannst mit einem oder zwei Terminals arbeiten:

#### Option A: Ein Terminal (empfohlen)

```bash
npm run dev
```

#### Option B: Zwei Terminals

Terminal 1 (Build):

```bash
npm run build:watch
```

Terminal 2 (Worker Dev):

```bash
npm run dev
```

Die Anwendung ist dann unter der von Wrangler angegebenen Adresse verfügbar (z. B. `http://127.0.0.1:8787`).

## 📦 Deployment

### Automatisches Deployment (Empfohlen)

Das Projekt nutzt GitHub Actions für automatisierte Deployments mit vollständigen CI-Gates:

#### Via Git Tags (Production + Staging)

```bash
# Tag erstellen und pushen
git tag v1.7.1
git push origin v1.7.1
```

Dies startet automatisch:

1. Pre-Deploy Checks (Lint, Tests, Security Audit)
2. Deploy zu Staging
3. Health Check (Staging)
4. Deploy zu Production (erfordert manuelle Approval)
5. Health Check (Production)
6. GitHub Release erstellen

#### Via GitHub Actions UI (Staging oder Production)

1. Gehe zu **Actions** → **Deploy to Cloudflare**
2. Klicke **Run workflow**
3. Wähle Environment: `staging` oder `production`
4. Klicke **Run workflow**

### Manuelles Deployment (Fallback)

Falls GitHub Actions nicht verfügbar ist:

```bash
# 1. Build erstellen
npm run build:worker

# 2. Deploy zu gewünschtem Environment
npx wrangler deploy --env staging
# oder
npx wrangler deploy --env production

# 3. Health Check ausführen
npm run health-check -- --url https://staging.hub-evolution.com
```

### Benötigte GitHub Secrets

Für automatisches Deployment müssen folgende Secrets in GitHub hinterlegt werden:

**\*Repository Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name             | Beschreibung                                  | Wo zu finden                                                  |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API Token mit Workers:Edit-Rechten | Cloudflare Dashboard → My Profile → API Tokens → Create Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account-ID                         | Cloudflare Dashboard (Account Details)                        |

**GitHub Environments einrichten** →
**Settings** → **Environments** → **New environment**:

- **staging**: Keine Protection Rules
- **production**:
  - ✅ Required reviewers: 1
  - ✅ Deployment branches: `main` + Tags `v*`

### Health Check Endpoint

Das Deployment prüft automatisch die Verfügbarkeit aller Services:

```bash
curl https://hub-evolution.com/api/health
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "services": {
      "d1": true,
      "kv": true,
      "r2": true
    },
    "duration": "45ms",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "version": "production"
  }
}
```

### Rollback-Strategie

Bei fehlgeschlagenem Deployment:

```bash
# Option 1: Cloudflare Rollback (automatisch gespeichert)
npx wrangler rollback --env production

# Option 2: Vorherigen Tag deployen
git checkout v1.7.0
npx wrangler deploy --env production
```

Für detaillierte Anweisungen siehe [docs/development/local-development.md](docs/development/local-development.md).

## 🧪 Tests

- **E2E-Tests:** Playwright für Benutzerflows
- **Unit-Tests:** Vitest für Komponenten und Services

Tests ausführen:

```bash
npm run test:e2e
npm run test
```

## 📚 Dokumentation

- [Repository Guidelines](./AGENTS.md)
- [API-Dokumentation](./docs/api/)
- [API Quickstart](./docs/api/README.md)
- [Architektur](./docs/architecture/)
- [API & Security Regeln](./.windsurf/rules/api-and-security.md)
- [UI-Komponenten Leitfaden](./docs/frontend/ui-components.md)

## 🤝 Mitwirken

Beiträge sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

## 🌐 Live-Demo

[hub-evolution.com](https://hub-evolution.com)

## 📞 Kontakt

- **GitHub:** [LucasBonnerue](https://github.com/LucasBonnerue)
- **X:** [@LucasBonnerue](https://twitter.com/LucasBonnerue)
