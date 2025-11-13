---
trigger: always_on
---

# Infra (Workers/Router/Bindings) Rules

## Zweck

Saubere Worker‑Konfiguration, Bindings und Middleware‑Verhalten auf Edge‑Ebene.

## Muss

- [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0) pro Environment vollständige Bindings (D1/KV/R2; optional `[ai] binding = "AI"`).
- Middleware setzt Security‑Header; `/r2-ai/**` bleibt öffentlich erreichbar. Ergebnisse unter `results/<ownerType>/<ownerId>/*` sind owner‑gegated; `uploads/*` bleibt öffentlich (Provider‑Fetch).
- CSRF/Origin‑Regeln aus API & Security gelten auch für Redirect‑Endpunkte (via `withRedirectMiddleware`).
- Assets‑Serving aus `dist/`; `.assetsignore` schließt `_worker.js` aus.

## Sollte

- DEV‑CSP in `astro.config.mjs` kompatibel zur Middleware‑CSP halten; PROD CSP nonce‑basiert ausschließlich, wenn `ENVIRONMENT === 'production'`.
- Cloudflare Rulesets/Cache‑Bypass Workflows dokumentieren und versionieren.

## Code‑Anker

- `astro.config.mjs`
- [wrangler.toml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/wrangler.toml:0:0-0:0)
- [src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0)

## Referenzen

- Global Rules (Security‑Header/CSP)
- Project Structure Rules (Assets/Build)

## Changelog

- 2025‑11‑13: R2‑AI Policy präzisiert: Route öffentlich erreichbar; `uploads/*` öffentlich; `results/*` owner‑gegated.
- 2025‑10‑31: Bindings + Assets‑Serving konkretisiert; `/r2-ai/**` öffentlich bekräftigt.