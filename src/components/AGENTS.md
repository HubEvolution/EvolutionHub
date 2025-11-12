# AGENTS.md (Components)

Geltung: Astro/React‑Komponenten unter `src/components`.

## UI‑Regeln

- Keine hardcodierten UI‑Texte; immer i18n‑Keys verwenden (`src/locales/*.json`).
- Accessibility: sinnvolle ARIA‑Attribute, Fokus‑Reihenfolge, Tastaturbedienbarkeit (siehe bestehende Comments‑Komponenten).
- Props streng typisieren; keine „breiten“ `any`.

## Performance

- Unnötige Re‑Renders vermeiden; Memoization dort, wo sinnvoll.
- Teure Berechnungen aus dem Render‑Pfad ziehen.

## Stil & Libraries

- Bestehende Styling‑/Utility‑Patterns beibehalten.
- Keine neuen UI‑Libraries ohne Freigabe.

## Tests

- Kritische UI‑Logik und Interaktionen testen (Unit/Integration), z. B. Keyboard‑Navigation, Fehlergrenzen.
