# Evolution Hub

> Das modulare AI-Produktivitäts-Toolkit, das deine SaaS-Workflows automatisiert und für Teams skalierbar macht.

[![Build Status](https://img.shields.io/github/actions/workflow/status/HubEvolution/EvolutionHub/enhancer-e2e-smoke.yml?label=build)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml)
[![Test Status](https://img.shields.io/github/actions/workflow/status/HubEvolution/EvolutionHub/pricing-smoke.yml?label=tests)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml)
![Coverage](https://img.shields.io/badge/coverage-vitest%20reports-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Kernfeatures

- **Geführte AI-Flows** – Kombiniere Prompt-Optimierung, Bildverbesserung und Automationen ohne komplexes Setup.
- **Cloudflare-native Plattform** – Workers, D1 und R2 sorgen für globale Verfügbarkeit und niedrige Latenzen.
- **Self-Serve Abrechnung** – Integrierte Stripe-Workflows für Trial, Billing und Upgrades.
- **Team Collaboration** – Rollenbasierte Zugriffe mit passwortloser Stytch-Authentifizierung.
- **Observability & Governance** – Rate-Limiting, Audit-Logging und konfigurierbare Webhooks.

## Quickstart

### Installation

```bash
git clone https://github.com/HubEvolution/EvolutionHub.git
cd EvolutionHub
npm install
cp .env.example .env
```

### Lokale Entwicklung

```bash
npm run dev
```

Der lokale Worker läuft standardmäßig unter `http://127.0.0.1:8787`.

### Build

```bash
npm run build
```

### Deploy (Preview)

```bash
npm run build
wrangler deploy
```

## Environment-Variablen

| Variable               | Beschreibung                                  | Erforderlich |
| ---------------------- | --------------------------------------------- | ------------ |
| STYTCH_PROJECT_ID      | Projekt-ID für die Stytch Magic-Link-Auth     | Ja           |
| STYTCH_SECRET          | Secret-Key für Stytch                         | Ja           |
| CLOUDFLARE_ACCOUNT_ID  | Cloudflare-Account für Workers/D1/R2          | Ja           |
| CLOUDFLARE_API_TOKEN   | API-Token mit Workers- und D1-Rechten         | Ja           |
| DB_URL                 | Verbindung zur Cloudflare D1 Datenbank        | Ja           |
| R2_BUCKET_NAME         | Optionaler Bucket für Medien-Assets           | Nein         |

Nutze `.env.example` als Vorlage und ergänze lokale oder Produktionswerte mit Umlauten wie Ä, Ö, Ü und dem ß, falls nötig.

## Cloudflare Deployment

1. **Secrets setzen** – Für jede Umgebung:
   ```bash
   wrangler secret put STYTCH_PROJECT_ID --env production
   wrangler secret put STYTCH_SECRET --env production
   wrangler secret put CLOUDFLARE_API_TOKEN --env production
   ```
2. **Deploy ausführen** – Nach erfolgreichem Build:
   ```bash
   wrangler publish
   ```
3. **Rollback** – Bei Bedarf eine vorherige Version aktivieren:
   ```bash
   wrangler versions list
   wrangler versions rollback <version-id>
   ```

Weitere Details zu speziellen Deploy-Varianten findest du in `docs/deployment/cloudflare.md`.

## Screenshots & GIFs

_Füge hier aktuelle UI-Screenshots oder kurze GIF-Demos ein (Platzhalter)._ 

## Weitere Ressourcen

- [Architekturübersicht](./docs/architecture/README.md)
- [API-Referenz](./docs/api/)
- [Routing-Übersicht](./routes.md)

