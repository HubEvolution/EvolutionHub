# Evolution Hub

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](https://opensource.org/licenses/MIT)  
![Status: Aktiv](https://img.shields.io/badge/Status-Aktiv-brightgreen)  
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=fff)](https://astro.build/)  
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=fff)](https://tailwindcss.com/)  
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=fff)](https://workers.cloudflare.com/)  

[![Enhancer E2E Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml)  
[![Prod Auth Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml)  
[![Pricing Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml)  

---

## Vision

Evolution Hub ist ein Open-Source SaaS-Framework, das moderne AI-gestützte Developer- und Productivity-Tools bündelt.  
Ziel: Komplexe Workflows in wenigen Klicks vereinfachen – von Bildverbesserung über Prompt-Optimierung bis hin zu Web-Scraping.

---

## Features

- Tool-Sammlung: Zugriff auf eine wachsende Bibliothek von Online-Tools  
- AI-Bildbearbeitung: KI-gestützte Bildverbesserung mit Real-ESRGAN und GFPGAN  
- Prompt-Optimierung: Automatische Verbesserung von Prompts für LLMs (GPT, Claude, LLaMA)  
- Authentifizierung: Stytch Magic Link (passwortlos)  
- Job-System: Asynchrones Management für langlaufende AI-Operationen  
- API-Sicherheit: Rate-Limiting, Audit-Logging  
- Mehrsprachig: Deutsch und Englisch

---

## Aktuelle und geplante Tools

### Image Enhancer
KI-gestützte Bildverbesserung (Upscaling, Face Restoration, Noise Reduction).  
Demo-Screenshot: https://hub-evolution.com/assets/enhancer-demo.png

### Prompt Enhancer
Optimiert Prompts für AI-Modelle – präziser, kreativer, konsistenter.  
Demo-Screenshot: https://hub-evolution.com/assets/prompt-demo.png

### Leads Generator (geplant)
Schnelles Generieren und Exportieren von qualifizierten Leads für SaaS- und B2B-Usecases.

### Webscraper (geplant)
Einfache Extraktion von Web-Inhalten mit Filter- und API-Schnittstelle.  
- JSON/CSV-Export  
- Optionale AI-Analyse der gescrapten Inhalte

---

## Screenshots und Demos

- Image Enhancer Preview: https://hub-evolution.com/assets/enhancer-demo.png  
- Prompt Enhancer Preview: https://hub-evolution.com/assets/prompt-demo.png

---

## Tech Stack

- Framework: https://astro.build/  
- Styling: https://tailwindcss.com/  
- Backend: https://workers.cloudflare.com/  
- Datenbank: https://developers.cloudflare.com/d1/  
- Speicher: https://developers.cloudflare.com/r2/  
- Testing: Playwright (E2E), Vitest (Unit)  
- Auth: Stytch Magic Link + Cookies

---

## Environment Variables

| Variable               | Beschreibung                         | Erforderlich |
|-----------------------|--------------------------------------|--------------|
| STYTCH_PROJECT_ID     | Stytch Project ID                    | Ja |
| STYTCH_SECRET         | Stytch Secret Key                    | Ja |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare Account ID                | Ja |
| CLOUDFLARE_API_TOKEN  | Cloudflare API Token (Workers Edit)  | Ja |
| DB_URL                | D1 Datenbank Connection              | Ja |
| R2_BUCKET_NAME        | Cloudflare R2 Bucket Name            | Nein |

Vorlage: `.env.example`

---

## Getting Started

### Voraussetzungen
- Node.js (>= 20.x)  
- npm

### Installation

```bash
git clone https://github.com/HubEvolution/EvolutionHub.git
cd evolution-hub
npm install
npx tsx scripts/setup-local-dev.ts
cp .env.example .env
```

### Lokale Entwicklung

```bash
# Terminal 1
npm run build:watch

# Terminal 2
npm run dev
```

Die App läuft unter: `http://127.0.0.1:8787`

---

## Deployment

Automatisch via GitHub Actions (empfohlen) oder manuell mit Wrangler.  
Siehe CI/CD-Dokumentation: ./docs/development/ci-cd.md

Secrets müssen in GitHub hinterlegt sein (siehe Tabelle in deiner bisherigen README).

---

## Tests

```bash
npm run test        # Unit
npm run test:e2e    # E2E
```

---

## Roadmap

- Prompt Enhancer – Custom-Modelle und Export  
- Leads Generator – MVP Release  
- Webscraper – API- und CLI-Version  
- Public API für Dritt-Integrationen

---

## Contributing

Beiträge sind willkommen:  
1. Fork und Clone  
2. Branch erstellen (z. B. `feature/my-tool`)  
3. Tests ausführen (`npm run test`)  
4. Pull Request gegen `main`

Siehe Contributing Guide: ./docs/development/contributing.md

---

## Dokumentation

- API Docs: ./docs/api/  
- Architektur: ./docs/architecture/  
- Sicherheit: ./docs/security/  
- UI-Guide: ./docs/frontend/ui-components.md

---

## Live-Demo

https://hub-evolution.com

---

## Kontakt

- GitHub: https://github.com/LucasBonnerue  
- X (Twitter): https://twitter.com/LucasBonnerue

---

## Lizenz

MIT License. Siehe LICENSE.
