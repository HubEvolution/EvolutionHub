---
trigger: always_on
scope: feature
extends:
  - project-structure.md
  - tooling-and-style.md
priority: medium
---

# Content Rules

## Zweck

Konsistente, sichere Pflege von Content Collections (Astro Content), i18n‑Locales und Seiten, die Content konsumieren – ohne PII/Secrets und ohne Strukturdrift.

## Muss

- Content‑Quelle & Struktur
  - Content Collections liegen unter `src/content/**` und werden über `src/content/config.ts` konfiguriert.
  - Typen/Shapes sind zentral definiert (z. B. in `src/content/types.ts`, sofern verwendet).
  - Keine Ad‑hoc Content‑Strukturen außerhalb der Collection‑Konfiguration.

- i18n
  - UI‑Texte sind über Locale‑Files gepflegt (`src/locales/en.json`, `src/locales/de.json`), keine Hardcodes in UI‑kritischen Seiten.
  - Neue Keys müssen in beiden Locales ergänzt werden.

- Security & Privacy
  - Keine Secrets/PII im Content (auch nicht versehentlich in Markdown/JSON/YAML/Frontmatter).
  - Keine Tracking‑/Analytics‑Einbettungen in Content ohne Consent‑Gating (siehe Cookies & Consent Rules).

## Sollte

- Content‑Änderungen, die Routing/SEO betreffen (Slugs, Canonicals, Indexierung), mit passenden Checks begleiten (Links/Build/Smoke).
- Größere Content‑Umbauten (neue Collection/Schema) zusätzlich dokumentieren (`docs/content.md` bzw. passende Docs‑Kategorie).

## Nicht

- Keine sensiblen Daten im Repo‑Content (API‑Keys, Tokens, private Emails, interne URLs).
- Keine Schema‑Breaking Changes an Content Collections ohne gleichzeitige Anpassung der Konsumenten (Pages/Components) und Tests/Checks.

## Checkliste

- [ ] Content liegt unter `src/content/**` und ist in `src/content/config.ts` abgedeckt.
- [ ] Keine Secrets/PII im Content/Frontmatter.
- [ ] i18n‑Keys in `en.json` und `de.json` synchron.
- [ ] Bei SEO/Routing‑Änderungen: Link‑/Build‑Checks grün.

## Code‑Anker

- `src/content/config.ts`
- `src/content/types.ts`
- `src/locales/en.json`
- `src/locales/de.json`
- `docs/content.md`

## CI/Gates

- `npm run lint`
- `npm run test`
- Optional bei größeren Content/SEO‑Änderungen:
  - `npm run docs:links` (falls Docs/Links betroffen)
  - E2E Smoke (falls Seiten/Routing kritisch betroffen)

## Referenzen

- [.windsurf/rules/project-structure.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/project-structure.md:0:0-0:0)
- [.windsurf/rules/tooling-and-style.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/tooling-and-style.md:0:0-0:0)
- [.windsurf/rules/cookies-and-consent.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/cookies-and-consent.md:0:0-0:0)

## Changelog

- 2025-12-16: Content Rules auf Standardformat erweitert (Structure/i18n/Privacy/Checks).
