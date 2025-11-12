# Brand & Asset Struktur

Diese Struktur bündelt zentrale Brand-Ressourcen (Farben, Logo, Typografie) an einem Ort und erleichtert konsistente Nutzung in TypeScript/React/Astro.

## Struktur

```markdown
assets/
brand/
logo/ # Logos (Dateinamen-Konvention siehe unten)
colors/ # Farbdefinitionen (JSON + CSS Variablen)
typography/ # Schrift-Token / Skalen (später)
images/ # Allgemeine, nicht-brand-spezifische Bilder
```

Leere Ordner enthalten eine `.gitkeep`, damit die Struktur versioniert bleibt.

## Dateinamen & Versionierung

- Logos: `logo-main.png`, `logo-secondary.png` für primäre/sekundäre Varianten.
- Neue Revisionen: `logo-v2.png` (ältere Hauptversion ggf. entfernen; nur 1–2 aktive Versionen halten).
- Konsistenz: Kleinbuchstaben, kebab-case, keine Leerzeichen.
- Falls Vektor: `logo-main.svg` bevorzugen (Performance & Skalierung).

## Farben

- Quelle: `brand/colors/colors.json` (wird in Build-Prozessen oder Komponenten importiert)
- CSS-Variablen: `brand/colors/colors.css` bindet JSON-Werte an `:root`.
- Zusätzliche semantische Aliase (`--color-text`, `--color-bg`, etc.) vereinfachen Anpassungen ohne alle Shades zu ändern.

## Import-Beispiele

TypeScript / React:

```ts
import colors from '@/assets/brand/colors/colors.json';

function Button() {
  return <button style={{ backgroundColor: colors.primary['600'] }}>Click</button>;
}
```

CSS (global):

```css
@import '@/assets/brand/colors/colors.css';
```

Astro Component:

```astro
---
import colors from '@/assets/brand/colors/colors.json';
---

<button style={`background:${colors.primary['600']};color:${colors.neutral['0']}`}>Start</button>
```

## Pflege & Änderungen

1. Neue Farbpalette zuerst in `colors.json` aktualisieren.
2. Anschließend passende CSS-Variablen in `colors.css` ergänzen oder entfernen.
3. Bei Breaking Changes (z.B. Austausch Primärpalette) optional eine `colors-v2.json` temporär nutzen und nach Migration wieder vereinheitlichen.
4. Nur aktive Logo-Versionen halten (Altdateien löschen, um Verwirrung zu vermeiden).

## Nächste Erweiterungen (optional)

- Typografie: scale.json (Font-Sizes, Line-Heights, Font-Families)
- Motion-Tokens: duration.json, easing.json
- Theming (Dark Mode): `colors-dark.json` + `:root[data-theme="dark"]` Overrides.

## Lizenz / Nutzung

Interne Assets – nicht ohne Freigabe extern verwenden. Bei Export für Partner immer aktuelle Version aus diesem Ordner nutzen.

---

Letzte Aktualisierung: 2025-11-11
