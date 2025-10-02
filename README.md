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

## ð Vision

**Evolution Hub** ist ein Open-Source SaaS-Framework, das moderne **AI-gestÃ¼tzte Developer- und Productivity-Tools** bÃ¼ndelt.  
Ziel: Komplexe Workflows in wenigen Klicks vereinfachen â von **Bildverbesserung** Ã¼ber **Prompt-Optimierung** bis hin zu **Web-Scraping**.  

> *âEin Hub, viele Tools â schnell, sicher und skalierbar.â*

---

## â¨ Features

- **Tool-Sammlung:** Zugriff auf eine wachsende Bibliothek von Online-Tools  
- **AI-Bildbearbeitung:** KI-gestÃ¼tzte Bildverbesserung mit Real-ESRGAN und GFPGAN  
- **Prompt-Optimierung:** Automatische Verbesserung von Prompts fÃ¼r LLMs (GPT, Claude, LLaMA)  
- **Authentifizierung:** Stytch Magic Link (passwortlos)  
- **Job-System:** Asynchrones Management fÃ¼r langlaufende AI-Operationen  
- **API-Sicherheit:** Rate-Limiting, Audit-Logging  
- **Mehrsprachig:** Deutsch & Englisch  

---

## ð® Aktuelle & Geplante Tools

### Image Enhancer
KI-gestÃ¼tzte Bildverbesserung (Upscaling, Face Restoration, Noise Reduction).  
ð [Demo Screenshot](https://hub-evolution.com/assets/enhancer-demo.png)

### Prompt Enhancer
Optimiert Prompts fÃ¼r AI-Modelle â prÃ¤ziser, kreativer, konsistenter.  
ð [Demo Screenshot](https://hub-evolution.com/assets/prompt-demo.png)

### Leads Generator *(geplant)*
Schnelles Generieren & Exportieren von qualifizierten Leads fÃ¼r SaaS- und B2B-Usecases.

### Webscraper *(geplant)*
Einfache Extraktion von Web-Inhalten mit Filter- und API-Schnittstelle.  
- JSON/CSV-Export  
- Optionale AI-Analyse der gescrapten Inhalte  

---

## ð¼ Screenshots & Demos

- [Image Enhancer Preview](https://hub-evolution.com/assets/enhancer-demo.png)  
- [Prompt Enhancer Preview](https://hub-evolution.com/assets/prompt-demo.png)  

---

## ð  Tech Stack

- **Framework:** [Astro](https://astro.build/)  
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)  
- **Backend:** [Cloudflare Workers](https://workers.cloudflare.com/)  
- **Datenbank:** [Cloudflare D1](https://developers.cloudflare.com/d1/)  
- **Speicher:** [Cloudflare R2](https://developers.cloudflare.com/r2/)  
- **Testing:** Playwright (E2E), Vitest (Unit)  
- **Auth:** Stytch Magic Link + Cookies  

---

## ð Environment Variables

| Variable                | Beschreibung                        | Default/Optional |
|--------------------------|-------------------------------------|------------------|
| `STYTCH_PROJECT_ID`      | Stytch Project ID                   | Pflicht |
| `STYTCH_SECRET`          | Stytch Secret Key                   | Pflicht |
| `CLOUDFLARE_ACCOUNT_ID`  | Cloudflare Account ID               | Pflicht |
| `CLOUDFLARE_API_TOKEN`   | Cloudflare API Token (Workers Edit) | Pflicht |
| `DB_URL`                 | D1 Datenbank Connection             | Pflicht |
| `R2_BUCKET_NAME`         | Cloudflare R2 Bucket Name           | Optional |

ð Vorlage: `.env.example`

---

## ð Getting Started

### Voraussetzungen
- Node.js (â¥ 20.x)  
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

App lÃ¤uft unter: `http://127.0.0.1:8787`

---

## ð¦ Deployment

Automatisch via GitHub Actions (empfohlen) oder manuell mit Wrangler.  
ð Siehe [CI/CD Docs](./docs/development/ci-cd.md)

Secrets mÃ¼ssen in GitHub hinterlegt sein (siehe Tabelle in deiner alten README).

---

## ð§ª Tests

```bash
npm run test        # Unit
npm run test:e2e    # E2E
```

---

## ðº Roadmap

- [ ] Prompt Enhancer â Custom Modelle & Export  
- [ ] Leads Generator â MVP Release  
- [ ] Webscraper â API & CLI Version  
- [ ] Public API fÃ¼r Dritt-Integrationen  

---

## ð¤ Contributing

BeitrÃ¤ge sind willkommen:  
1. Fork & Clone  
2. Branch (`feature/my-tool`)  
3. Tests (`npm run test`)  
4. PR gegen `main`  

ð Siehe [Contributing Guide](./docs/development/contributing.md)

---

## ð Dokumentation

- [API Docs](./docs/api/)  
- [Architektur](./docs/architecture/)  
- [Sicherheit](./docs/security/)  
- [UI-Guide](./docs/frontend/ui-components.md)  

---

## ð Live-Demo

ð [hub-evolution.com](https://hub-evolution.com)

---

## ð Kontakt

- **GitHub:** [LucasBonnerue](https://github.com/LucasBonnerue)  
- **X (Twitter):** [@LucasBonnerue](https://twitter.com/LucasBonnerue)  

---

## ð Lizenz

MIT License. Siehe [LICENSE](./LICENSE).
