# Cascade Rules Coverage — Stand: 2025-10-03 19:01:32+02:00

## Regeln: Scope-Globs, Treffer, Activation, Priority

| Datei | Activation | Priority | Scope-Glob | Treffer |
|---|---|---|---|---:|
| api-and-security.md | always_on | n/a | `src/pages/api/**` | 68 |
| api-and-security.md | always_on | n/a | `src/pages/r2-ai/**` | 1 |
| api-and-security.md | always_on | n/a | `src/lib/api-middleware.ts` | 1 |
| api-and-security.md | always_on | n/a | `src/lib/rate-limiter.ts` | 1 |
| api-and-security.md | always_on | n/a | `src/lib/security/csrf.ts` | 1 |
| api-and-security.md | always_on | n/a | `src/middleware.ts` | 1 |
| project-structure.md | always_on | n/a | `src/pages/api/**` | 68 |
| project-structure.md | always_on | n/a | `src/pages/r2/**` | 1 |
| project-structure.md | always_on | n/a | `src/content/**` | 17 |
| project-structure.md | always_on | n/a | `src/locales/**` | 7 |
| project-structure.md | always_on | n/a | `src/styles/**` | 3 |
| project-structure.md | always_on | n/a | `scripts/**` | 37 |
| project-structure.md | always_on | n/a | `migrations/**` | 23 |
| project-structure.md | always_on | n/a | `tests/e2e/**` | 0 (NO MATCH) |
| project-structure.md | always_on | n/a | `test-suite-v2/**` | 79 |
| project-structure.md | always_on | n/a | `src/**/*.{test,spec}.{ts,tsx}` | 6 |
| project-structure.md | always_on | n/a | `tests/unit/**` | 20 |
| project-structure.md | always_on | n/a | `tests/integration/**` | 19 |
| project-structure.md | always_on | n/a | `dist/**` | 328 |
| project-structure.md | always_on | n/a | `public/**` | 58 |
| testing-and-ci.md | always_on | n/a | `src/**/*.{ts,tsx}` | 228 |
| testing-and-ci.md | always_on | n/a | `tests/unit/**` | 20 |
| testing-and-ci.md | always_on | n/a | `tests/integration/**` | 19 |
| testing-and-ci.md | always_on | n/a | `playwright-report/**` | 54 |
| tooling-and-style.md | always_on | n/a | `tsconfig.json` | 1 |
| tooling-and-style.md | always_on | n/a | `eslint.config.js` | 1 |
| tooling-and-style.md | always_on | n/a | `.prettierrc.json` | 1 |
| tooling-and-style.md | always_on | n/a | `AGENTS.md` | 1 |

Hinweis: Globs wurden aus den jeweiligen Regeltexten abgeleitet. 0-Treffer sind explizit markiert.

## Script-Check gegenüber global_rules.md

| Script (erwartet lt. global_rules.md) | In package.json |
|---|---|
| dev:worker | ja |
| dev:worker:dev | ja |
| dev:e2e | ja |
| dev:astro | ja |
| build | ja |
| preview | ja |
| build:worker | ja |
| test | ja |
| test:unit | ja |
| test:integration | ja |
| test:coverage | ja |
| test:e2e | ja |
| test:e2e:chromium | ja |
| test:e2e:firefox | ja |
| test:e2e:webkit | ja |
| test:e2e:mobile | ja |
| format | ja |
| format:check | ja |
| lint | ja |
| markdown linter (lint:md) | ja |
| markdown linter fix (lint:md:fix) | ja |
| docs generatoren (docs:*) | ja |

Quelle:
- Regeln: `.windsurf/rules/*.md`
- Skripte: `package.json`
- Referenz: `global_rules.md`
