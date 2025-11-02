<!-- markdownlint-disable MD051 -->

# Project Structure Rules

## Zweck

Klare Struktur für Laufzeitcode, Assets und Tests; eindeutige Pfade für Server/Proxy‑Routen.

## Muss

- `src/` ist Runtime‑Root.

  - UI: `src/components`, `src/pages`, `src/layouts`.

  - Shared: `src/lib`, `src/config`, `src/utils`.

- Server‑Handler: `src/pages/api/**`.

- R2‑Proxy: `src/pages/r2/**` und `src/pages/r2-ai/**` (müssen öffentlich/ungated bleiben).

- Inhalte unter `src/content/`, Locales `src/locales/`, Styles `src/styles/`.

- Tests: Vitest neben Quellen (`src/**/*.{test,spec}`) oder unter `tests/unit`, `tests/integration`.

- E2E: `tests/e2e/specs` (root) und `test-suite-v2/src/e2e` (v2).

- Build‑Artefakte: `dist/`; Wrangler dient aus `dist` und ignoriert `_worker.js` via `.assetsignore`.

- Aliase: `@/*` verwenden (kein `~/*`).

## Sollte

- Worker‑Build: `ASTRO_DEPLOY_TARGET=worker` kopiert Assets nach `dist/assets` und erzeugt `.assetsignore`.

## Code‑Anker

- `astro.config.mjs`

- `wrangler.toml`

- `package.json` (build scripts)

- `tsconfig.json`

## Changelog

- 2025‑10‑31: Struktur und R2‑Routen präzisiert; Aliase bestätigt.
