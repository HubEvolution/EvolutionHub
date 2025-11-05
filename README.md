# Evolution Hub

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-111111?style=for-the-badge)](./LICENSE)
[![Status: Active](https://img.shields.io/badge/Status-Active-2ECC71?style=for-the-badge)](https://hub-evolution.com)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=ffffff&style=for-the-badge)](https://astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=ffffff&style=for-the-badge)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-FF7139?logo=cloudflare&logoColor=ffffff&style=for-the-badge)](https://workers.cloudflare.com/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=000000&style=for-the-badge)](https://react.dev/)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-4C8BF5?style=for-the-badge)](https://github.com/HubEvolution/EvolutionHub/issues)

[![Enhancer E2E Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml)
[![Prod Auth Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml)
[![Pricing Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml)

> Interaktive AI-Tool-Suite für Bild- und Video-Enhancement, Prompt-Optimierung, Web-Scraping und Voice-Transkription – aufgebaut auf Astro + Cloudflare Workers mit sicherer Authentifizierung, Quoten- und Job-Systemen.

## ✨ Tool Suite & Highlights

- **Image Enhancer** – Hybrid aus Cloudflare Workers AI (SD 1.5/SDXL img2img) und Replicate (Real-ESRGAN, CodeFormer, GFPGAN) mit planbasierten Quoten.
- **Video Enhancer** – KI-basiertes Upscaling und Qualitätsverbesserung mit stabilen Voreinstellungen.
- **Prompt Enhancer** – KI-gestützte Prompt-Optimierung inklusive Quota- und Rate-Limit-Governance.
- **Webscraper** – Strukturierte Extraktion mit SSRF-Schutz, Entitlements und API/GUI.
- **Voice Visualizer & Transcriptor** – Whisper-basierte Transkription mit SSE/Polling und Daily Caps.

Live-Tools: [hub-evolution.com/tools](https://hub-evolution.com/tools)

- Image Enhancer: [DE](https://hub-evolution.com/tools/imag-enhancer/app) · [EN](https://hub-evolution.com/en/tools/imag-enhancer/app)
- Video Enhancer: [DE](https://hub-evolution.com/tools/video-enhancer/app) · [EN](https://hub-evolution.com/en/tools/video-enhancer/app)
- Prompt Enhancer: [DE](https://hub-evolution.com/tools/prompt-enhancer/app) · [EN](https://hub-evolution.com/en/tools/prompt-enhancer/app)
- Webscraper: [DE](https://hub-evolution.com/tools/webscraper/app) · [EN](https://hub-evolution.com/en/tools/webscraper/app)
- Voice Visualizer: [DE](https://hub-evolution.com/tools/voice-visualizer/app) · [EN](https://hub-evolution.com/en/tools/voice-visualizer/app)

## 🧱 Architektur & Tech Stack

- Astro + React-Inseln mit Tailwind CSS.
- Cloudflare Workers mit Bindings für D1 (SQL), KV und R2 Storage.
- Authentifizierung über Stytch Magic Link, Sessions & CSRF-Schutz.
- Tests & QA: Vitest (Unit/Integration) und Playwright (E2E, Smokes).
- Observability: strukturierte Logs & Health-Checks (`npm run health-check`).

## 🚀 Schnellstart

1. Repository klonen & wechseln

   ```bash
   git clone <REPOSITORY_URL>
   cd evolution-hub
   ```

2. Abhängigkeiten installieren

   ```bash
   npm install
   ```

3. Lokale Ressourcen vorbereiten

   ```bash
   npm run setup:local
   cp .env.example .env
   ```

   → `.env` gemäß Kommentaren ausfüllen (Auth, AI-Provider, Origins etc.).

4. Entwicklung starten

   ```bash
   npm run dev
   ```

   Die lokale Worker-Instanz läuft typischerweise unter [http://127.0.0.1:8787](http://127.0.0.1:8787).

5. Optional: Browser automatisch öffnen

   ```bash
   npm run dev:open
   ```

## 🧰 Zentrale Skripte & Checks

| Command                               | Zweck                                          |
| ------------------------------------- | ---------------------------------------------- |
| `npm run lint`                        | ESLint auf `src/**` (strict, no-explicit-any). |
| `npm run format:check`                | Prettier-Konventionen validieren.              |
| `npm run test`                        | Vitest Unit-Suite.                             |
| `npm run test:integration`            | Vitest Integration (API/Services).             |
| `npm run test:e2e`                    | Playwright E2E gegen Worker-Dev.               |
| `npm run openapi:validate`            | OpenAPI-Schema prüfen.                         |
| `npm run health-check -- --url <URL>` | Health-Endpunkt skriptgesteuert testen.        |

## ⚙️ Konfiguration & Bindings

- `.env.example` dokumentiert lokale Flags (z. B. Debug Panel, Feature Flags, Provider Tokens).
- `wrangler.toml` verwaltet Bindings für D1, KV, R2, AI und Environment-spezifische Variablen.
- Security-Baseline: Allowed Origins, Same-Origin-Checks, Double-Submit-CSRF via Middleware.

## 🚢 CI/CD & Deployment

- GitHub Actions Smokes: Enhancer E2E, Prod Auth, Pricing (Badges s. oben).
- Deploy-Skripte: `npm run deploy:staging`, `npm run deploy:production`, `npm run deploy:testing` (Cloudflare API gesteuert).
- Alternativ über Actions UI („Deploy to Cloudflare“) mit Auswahl von staging/production.

## 🩺 Health & Monitoring

- Öffentlicher Endpoint: `GET /api/health` (prüft D1/KV/R2, loggt minimal).
- Interner Endpoint: `GET /api/health/auth` (erfordert `X-Internal-Health` Token).
- Skript `npm run health-check` unterstützt Retries & Logging.

## 📚 Dokumentation & Governance

- Vollständige Dokumentation unter `/docs` (Architektur, API, Rulesets, CI/CD).
- CONTRIBUTING und CODE_OF_CONDUCT regeln Beiträge & Community-Richtlinien.

## 🤝 Mitwirken & Kontakt

- Issues & Pull Requests willkommen: [github.com/HubEvolution/EvolutionHub](https://github.com/HubEvolution/EvolutionHub)
- Live-Demo: [https://hub-evolution.com](https://hub-evolution.com)
- Kontakt: GitHub [@HubEvolution](https://github.com/HubEvolution) · X [@hub_evolution](https://x.com/hub_evolution)
