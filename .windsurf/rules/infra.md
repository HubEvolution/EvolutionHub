# Infra (Workers/Router/Bindings) Rules

## Zweck

Saubere Worker‑Konfiguration, Bindings und Middleware‑Verhalten auf Edge‑Ebene.

## Muss

- `wrangler.toml` pro Environment vollständige Bindings (D1/KV/R2; optional `[ai] binding = "AI"`).
- Middleware setzt Security‑Header; `/r2-ai/**` bleibt öffentlich (nicht gate’n).
- CSRF/Origin‑Regeln aus API & Security gelten auch für Redirect‑Endpunkte (via `withRedirectMiddleware`).
- Assets‑Serving aus `dist/`; `.assetsignore` schließt `_worker.js` aus.

## Sollte

- DEV‑CSP in `astro.config.mjs` kompatibel zur Middleware‑CSP halten; PROD CSP nonce‑basiert ausschließlich, wenn `ENVIRONMENT === 'production'`.
- Cloudflare Rulesets/Cache‑Bypass Workflows dokumentieren und versionieren.

## Code‑Anker

- `astro.config.mjs`
- `wrangler.toml`
- `src/middleware.ts`

## Referenzen

- Global Rules (Security‑Header/CSP)
- Project Structure Rules (Assets/Build)

## Changelog

- 2025‑10‑31: Bindings + Assets‑Serving konkretisiert; `/r2-ai/**` öffentlich bekräftigt.
