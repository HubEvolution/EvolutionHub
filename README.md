# Evolution Hub (Portfolio)

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-111111?style=for-the-badge)](./LICENSE)
[![Status: Active](https://img.shields.io/badge/Status-Active-2ECC71?style=for-the-badge)](https://hub-evolution.com)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=ffffff&style=for-the-badge)](https://astro.build/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=000000&style=for-the-badge)](https://react.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-FF7139?logo=cloudflare&logoColor=ffffff&style=for-the-badge)](https://workers.cloudflare.com/)

[![Enhancer E2E Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/enhancer-e2e-smoke.yml)
[![Prod Auth Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/prod-auth-smoke.yml)
[![Pricing Smoke](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml/badge.svg?branch=main)](https://github.com/HubEvolution/EvolutionHub/actions/workflows/pricing-smoke.yml)

> Browser-native AI-Tool-Suite für Web-Analyse und Media-Enhancement (Astro + Cloudflare Workers) mit Authentifizierung, Quoten/Jobs, Tests und CI.

## Review in 3 Minuten (ohne Setup)

Dieses Projekt ist so gedacht, dass Reviewer nichts lokal starten müssen.

Öffne die Live-App: https://hub-evolution.com/tools

Öffne die WebEval-Demo: https://staging.hub-evolution.com/en/tools/web-eval/app

Wenn du einen kurzen, geführten Review-Flow willst (inkl. „Worauf achten?“): siehe [`docs/portfolio-review.md`](./docs/portfolio-review.md).

## Warum das als Bewerbungsprojekt taugt

Der Kernnachweis liegt nicht in „Idee“, sondern in nachprüfbarer Engineering-Umsetzung: Edge-Architektur, Security-Baseline, automatisierte Tests, CI-Smokes, Monitoring und dokumentierte API-Oberflächen.

## Evidence / Nachweise im Repository

Technische Belege sind bewusst öffentlich sichtbar:

- CI Workflows: [`/.github/workflows`](./.github/workflows)
- OpenAPI Spezifikation: [`openapi.yaml`](./openapi.yaml)
- Architektur & Referenzdokumente: [`/docs`](./docs)

## Architektur & Tech Stack (kurz)

Astro + React UI, Cloudflare Workers Runtime, Daten/Storage über Cloudflare Bindings (D1/KV/R2). Auth, Quoten/Entitlements und Job-Systeme sind Teil der Plattform.

## Entwicklung (optional)

Lokales Setup ist möglich, aber für Reviewer nicht erforderlich.

- Hinweise & Flags: `.env.example`
- Worker/Bindings: `wrangler.toml`

## Lizenz

Proprietär („All rights reserved“). Siehe [`LICENSE`](./LICENSE).
