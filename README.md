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

# Evolution Hub

Entwickler‑Tool‑Suite mit AI‑Bild‑ und Video‑Verbesserung, Prompt‑Optimierung, Web‑Scraping und Transkription – gebaut auf Astro + Cloudflare Workers (D1/KV/R2), mit sicherer Magic‑Link‑Auth, Job‑System, Quoten/Limits und durchgängiger CI/CD.

## ✨ Features

- Tool‑Suite:
  - Image Enhancer: Real‑ESRGAN (2×/4×), GFPGAN/CodeFormer, Cloudflare Workers AI (SD 1.5/SDXL img2img), Hybrid‑Provider (Replicate + Workers AI).
  - Video Enhancer: KI‑basiertes Upscaling und Qualitätsverbesserung (Schärfe, Denoise, Klarheit) mit konsistenten Ergebnissen.
  - Prompt‑Enhancer: KI‑gestützte Text‑zu‑Prompt‑Optimierung.
  - Webscraper: Strukturierte Extraktion via API + UI.
  - Voice Transcriber: Whisper‑basierte Transkription mit Quoten/Limits.
- Sicherheit: Rate‑Limiting, Audit‑Logging, robuste API‑Guards.
- Internationalisierung: Deutsch und Englisch.

Siehe Live‑Tools‑Übersicht: https://hub-evolution.com/tools

## 🧱 Tech‑Stack

- Framework: Astro (mit React‑Komponenten)
- Styling: Tailwind CSS
- Backend: Cloudflare Workers
- Datenbanken & Storage: Cloudflare D1 (SQL), KV, R2
- Tests: Playwright (E2E), Vitest (Unit)
- Authentifizierung: Stytch Magic Link + Session‑Cookies (session_id, __Host-session, via HTTPS)

## 🚀 Getting Started

### Voraussetzungen
- Node.js 20.x oder höher
- npm
- (Optional) Cloudflare Wrangler für lokale/prod Deployments

### Installation
1. Repository klonen:
   git clone <repository-url>
   cd evolution-hub

2. Abhängigkeiten installieren:
   npm install

3. Lokale Datenbank einrichten:
   npm run setup:local

4. Umgebungsvariablen konfigurieren:
   cp .env.example .env
   # trage deine Tokens/Secrets gemäß „Env‑Variablen“ ein

### Entwicklung

Option A: Ein Terminal (empfohlen)
  npm run dev

Option B: Zwei Terminals
  # Terminal 1 (Build)
  npm run build:watch
  # Terminal 2 (Worker Dev)
  npm run dev

Die App ist unter der von Wrangler ausgegebenen Adresse erreichbar, z. B. http://127.0.0.1:8787

## 🔐 Env‑Variablen

Beispielwerte in .env.example; produktive Secrets in GitHub Actions hinterlegen.

- Cloudflare
  - CLOUDFLARE_API_TOKEN (Workers:Edit)
  - CLOUDFLARE_ACCOUNT_ID
  - Bindings für D1/KV/R2 über wrangler.toml

- Auth (Stytch)
  - STYTCH_PROJECT_ID
  - STYTCH_SECRET
  - STYTCH_ENV (test/live)

- AI‑Provider
  - REPLICATE_API_TOKEN (falls Replicate genutzt)
  - CF_ACCOUNT_ID / CF_API_TOKEN (Workers AI Zugriff)
  - Modell‑Presets für Image/Video Enhancer

- App
  - BASE_URL
  - SESSION_COOKIE_NAME, SESSION_SECRET
  - QUOTA_LIMITS_* (Optionen für Limits/Bursts)

## 🛠 Tools (Live)

- Tools‑Hub: https://hub-evolution.com/tools
- Video Enhancer: https://hub-evolution.com/tools/video-enhancer/app
- Image Enhancer: https://hub-evolution.com/en/tools/imag-enhancer/app

Weitere Produktseiten: Doku, FAQ, Pricing, Blog
- Docs: https://hub-evolution.com/en/docs
- FAQ:  https://hub-evolution.com/en/faq
- Pricing: https://hub-evolution.com/en/pricing
- Blog: https://hub-evolution.com/blog

## 📦 Deployment

Automatisches Deployment via GitHub Actions mit CI‑Gates.

### Via Git Tags (Production + Staging)
  # Tag erstellen und pushen
  git tag v1.7.1
  git push origin v1.7.1

Pipeline:
1) Pre‑Deploy Checks (Lint, Tests, Security Audit)
2) Deploy zu Staging
3) Health Check (Staging)
4) Deploy zu Production (manuelles Approval)
5) Health Check (Production)
6) GitHub Release erstellen

### Via GitHub Actions UI
- Actions → „Deploy to Cloudflare“ → „Run workflow“
- Environment wählen: staging oder production
- „Run workflow“

### Manuelles Deployment (Fallback)
  # 1) Worker build
  npm run build:worker
  # 2) Deploy
  npx wrangler deploy --env staging
  # oder
  npx wrangler deploy --env production
  # 3) Health Check
  npm run health-check -- --url https://staging.hub-evolution.com

### GitHub Secrets
Repository → Settings → Secrets and variables → Actions → New repository secret

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID

Environments:
- staging: keine Protection Rules
- production: Required reviewers: 1; Deployment branches: main + Tags v*

## 🩺 Health Check

Endpoint:
  curl https://hub-evolution.com/api/health

Beispiel‑Response:
{
  "success": true,
  "data": {
    "status": "ok",
    "services": { "d1": true, "kv": true, "r2": true },
    "duration": "45ms",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "version": "production"
  }
}

## 🔄 Rollback‑Strategie

Option 1: Cloudflare Rollback
  npx wrangler rollback --env production

Option 2: Vorherigen Tag deployen
  git checkout v1.7.0
  npx wrangler deploy --env production

## 🧪 Tests

- E2E: Playwright für zentrale User‑Flows und Smoke‑Checks
- Unit: Vitest für Komponenten/Services

Ausführen:
  npm run test:e2e
  npm run test

## 📚 Dokumentation

- Repository Guidelines
- API‑Dokumentation (inkl. Auth‑Flow, Rate Limits, Errors)
- Architektur‑Übersicht (Worker‑Entry, Router, Job‑System)
- Security‑Regeln (CORS, CSP, Cookies, Session‑Handling)
- UI‑Komponenten‑Leitfaden

Siehe /docs für Details.

## 🤝 Mitwirken

Beiträge willkommen! Bitte Pull Request erstellen oder ein Issue öffnen. Beachte Contributing und Code of Conduct.


## 🌐 Live‑Demo

https://hub-evolution.com

## 📞 Kontakt

- GitHub: https://github.com/HubEvolution
- X: @hub_evolution
