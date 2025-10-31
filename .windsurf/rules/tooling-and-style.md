---
trigger: always_on
---

# Tooling & Style Rules

## Zweck

Konsistente Tooling‑Konfiguration und Typ‑Strenge für verlässliches Refactoring und CI‑Stabilität.

## Muss

- TypeScript strict per `tsconfig.json` (ESNext, JSX runtime, Aliase `@/*`).
- ESLint: `no-explicit-any=error` in `src/**`; in `tests/**` bleibt es Warnung.
- Prettier: 2 spaces, single quotes, width 100, `semi: true`, Astro‑Plugin.
- `noUnusedLocals`/`noUnusedParameters` respektieren; Bundler‑Modulauflösung aktiv.

## Sollte

- React Hooks Rules einhalten; `no-console` nur dort, wo gezielt ausgerollt.
- Intentional empty `catch` nur mit Kommentar.
- Naming: Components/Stores PascalCase; Utilities camelCase.

## Validierungsstil

- Keine if/else‑Feldprüfung; stattdessen Zod‑Schemas aus `src/lib/validation/schemas/*`.
- In Routen: `z` und `formatZodError` aus `@/lib/validation` importieren (Aggregator).
- Keine Generics auf untypisierten DB‑Calls (z. B. nicht `.first<T>()` ohne Typquelle).

## Artefakte

- `.prettierignore`, `.markdownlint.jsonc`, `.lintstagedrc.json`, `eslint.config.dev.js` vorhanden halten.

## Code‑Anker

- `eslint.config.js`
- `.prettierrc.json`
- `tsconfig.json`

## CI/Gates

- `npm run lint`
- `npm run format:check`

## Changelog

- 2025‑10‑31: `no-explicit-any=error` in `src/**` festgelegt; Tests warnend.
