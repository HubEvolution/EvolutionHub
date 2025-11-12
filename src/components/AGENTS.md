# AGENTS.md (Components)

Geltung: Astro/React‑Komponenten unter `src/components`.

## UI‑Regeln

- Keine hardcodierten UI‑Texte; immer i18n‑Keys verwenden (`src/locales/*.json`).
- Accessibility: sinnvolle ARIA‑Attribute, Fokus‑Reihenfolge, Tastaturbedienbarkeit (siehe bestehende Comments‑Komponenten).
- Props streng typisieren; keine „breiten“ `any`.
- Astro: `Astro.props` strikt typisieren; keine React‑spezifischen Attribute auf HTML (z. B. kein `key`).

## Performance

- Unnötige Re‑Renders vermeiden; Memoization dort, wo sinnvoll.
- Teure Berechnungen aus dem Render‑Pfad ziehen.

## Stil & Libraries

- Bestehende Styling‑/Utility‑Patterns beibehalten.
- Keine neuen UI‑Libraries ohne Freigabe.
- Imports am Dateianfang; Alias ausschließlich `@/*` (kein `~/*`).
- Lint/Format gemäß `.windsurf/rules/tooling-and-style.md` (u. a. eslint‑plugin‑astro, Prettier).

## Tests

- Kritische UI‑Logik und Interaktionen testen (Unit/Integration), z. B. Keyboard‑Navigation, Fehlergrenzen.
