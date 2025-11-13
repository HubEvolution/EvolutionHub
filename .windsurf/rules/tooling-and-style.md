---
trigger: always_on
---

# Tooling & Style Rules

## Zweck

Konsistente Tooling‑Konfiguration und Typ‑Strenge für verlässliches Refactoring und CI‑Stabilität.

## Muss

- TypeScript strict per `tsconfig.json` (ESNext, JSX runtime, Aliase `@/*`).
- ESLint:
  - `@typescript-eslint/no-explicit-any`
    - in `src/**/*.{ts,tsx}`: error
    - in `src/**/*.astro` und `tests/**`: warn
    - `.d.ts`‑Shims/Provider‑Decls: ausgenommen (Override vorhanden)
  - `noUnusedLocals`/`noUnusedParameters` respektieren (TS‑Compileroptionen).
  - Astro‑Linting aktivieren:
    - eslint-plugin-astro und empfohlene Konfiguration (`plugin:astro/recommended`).
    - Parser für `.astro` Dateien korrekt konfiguriert.
- Prettier:
  - 2 spaces, single quotes, width 100, `semi: true`.
  - Astro‑Plugin aktiv.
  - `.prettierignore` enthält u. a.:
    - `dist/`
    - `reports/`
    - `playwright-report/`
    - `test-suite-v2/reports/`
    - `tests/performance/README.md` ← hinzugefügt, um unnötige Format‑Diffs zu vermeiden.
- Imports immer am Dateianfang; keine Imports mitten im File.
- Aliase: ausschließlich `@/*` (kein `~/*`).

## Astro Typisierung (wichtig)

- `Astro.props` strikt typisieren:
  - Frontmatter: `interface Props { ... }`
  - Nutzung: `const { ... } = Astro.props as Props`
  - Keine `any`‑Props; bei Unklarheit gezielte Union/Optionals.
- `Astro.locals` basiert auf [App.Locals](cci:2://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/env.d.ts:25:2-146:3) aus [src/env.d.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/env.d.ts:0:0-0:0). Keine lokalen, abweichenden Typen definieren.
- Frontmatter‑Variablen strikt typisieren (keine impliziten `any`).
- Keine React‑spezifischen Attribute in Astro (z. B. `key` auf HTML‑Elementen).
- Redirect‑Wrapper vermeiden, wenn sie nur weiterleiten – besser direkt redirecten und ungenutzte Variablen entfernen.

## Validierungsstil

- Zentrale Zod‑Schemas unter `src/lib/validation/schemas/*`.
- In Routen via Aggregator importieren (`@/lib/validation`), `safeParse` + `formatZodError`.
- Keine manuelle Feldprüfung per `if/else` anstelle von Zod.

## API‑Handler‑Typisierung

- API‑Handler mit `APIContext` typisieren. Kontextuelle Typisierung via `withApiMiddleware`/`withAuthApiMiddleware` ist zulässig; explizite Annotation empfohlen.

## Should

- React Hooks Rules einhalten; `no-console` nur dort, wo gezielt ausgerollt.
- Intentional empty `catch` nur mit Kurzkommentar.

## Artefakte

- `.prettierignore`, `.markdownlint.jsonc`, `.lintstagedrc.json`, `eslint.config.dev.js` gepflegt halten.

## CI/Gates

- `npm run lint`
- `npm run format:check`

## Changelog

- 2025‑11‑12: Astro‑Linting präzisiert (plugin‑astro), `.prettierignore` um `tests/performance/README.md` erweitert, Astro.locals‑Leitlinie verankert.
- 2025‑10‑31: `no-explicit-any=error` in `src/**` festgelegt; Tests warnend.
