# EvolutionHub Assets

Diese Dokumentation beschreibt die Organisation und Konventionen für alle Brand- und Design-Assets des EvolutionHub-Projekts.

**Letzte Aktualisierung:** 2025-11-11

## Verzeichnisstruktur

```
src/assets/
├── brand/
│   ├── logo/           # Logo-Varianten (SVG/PNG)
│   ├── colors/         # Farbdefinitionen (JSON + CSS)
│   └── typography/     # Schriftarten und Typografie-Assets
├── fonts/              # Web-Schriftarten (WOFF2, TTF, etc.)
├── images/             # Allgemeine Bilder und Grafiken
└── svg/                # SVG-Icons und Grafiken
```

## Logo-Konventionen

Alle Logo-Dateien folgen einem einheitlichen Benennungsschema:

### Primäre Logo-Varianten

- **`evolutionhub-logo.svg`** – Primäres Logo (Wortmarke + Symbol)
  - Für helle Hintergründe optimiert
  - Bevorzugte Variante für allgemeine Verwendung

- **`evolutionhub-logo-dark.svg`** – Logo für dunkle Hintergründe
  - Optimiert für Dark Mode und dunkle Flächen
  - Entspricht dem Design-System für `dark:` Varianten

- **`evolutionhub-logomark.svg`** – Reines Symbol/Bildmarke
  - Quadratisches Format, ohne Text
  - Für Favicons, App-Icons, Social Media Avatare

- **`evolutionhub-logo-horizontal.svg`** – Horizontale/breite Variante
  - Für Layouts mit horizontaler Ausrichtung (z.B. Footer, Banner)

### Archiv und Legacy-Assets

Falls temporär alte Versionen beibehalten werden müssen, nutze das Unterverzeichnis:

```
brand/logo/archive/
```

**Wichtig:** Keine Versionssuffixe wie `-v2`, `-v3` in aktiven Dateinamen verwenden. Stattdessen alte Versionen ins Archiv verschieben und neue Version mit dem funktionalen Namen versehen.

## Farbsystem

### Quelle: `brand/colors/colors.json`

Die zentrale Farbdefinition erfolgt in `colors.json` und deckt folgende Farbpaletten ab:

- **Primary (cyan)** – Hauptfarbe (cyan-basiert, Tailwind: `primary-*`)
- **Secondary (emerald)** – Sekundärfarbe (emerald-basiert, Tailwind: `secondary-*`)
- **Accent (orange)** – Akzentfarbe für Highlights und CTAs
- **Neutral (slate)** – Graustufen (0-1000) für Text, Hintergründe und Borders
- **Support** – Statusfarben (`success`, `warning`, `error`, `info`)

Alle Farben sind als Hex-Werte definiert mit Abstufungen von 50 bis 900 (bzw. 0/1000 für Neutral).

### CSS-Variablen: `brand/colors/colors.css`

Die Datei `colors.css` exportiert alle Farben als CSS Custom Properties im Format:

```css
--color-primary-500: #06B6D4;
--color-secondary-600: #059669;
--color-accent-400: #FB923C;
--color-neutral-800: #1F2937;
```

Zusätzlich werden semantische Aliase bereitgestellt:

```css
--color-bg: var(--color-neutral-0);
--color-text: var(--color-neutral-800);
--color-link: var(--color-primary-600);
--color-focus-ring: var(--color-accent-400);
```

### Import im Projekt

Die `colors.css` wird zentral in `src/styles/global.css` importiert:

```css
@import '@/assets/brand/colors/colors.css';
```

Der Alias `@/` wird zu `/src/` aufgelöst.

## Typografie

Schriftarten und typografische Definitionen werden unter `brand/typography/` abgelegt. Aktuelle Webfonts befinden sich bereits in `fonts/`.

## Verwendungsbeispiele

### In Astro-Komponenten

```astro
---
import logo from '@/assets/brand/logo/evolutionhub-logo.svg';
import colors from '@/assets/brand/colors/colors.json';
---

<img src={logo.src} alt="EvolutionHub" />
<div style={`color: ${colors.primary["600"]}`}>Primärfarbe</div>
```

### In TypeScript/JavaScript

```typescript
import colors from '@/assets/brand/colors/colors.json';

const primaryColor = colors.primary["500"]; // "#06B6D4"
```

### CSS Custom Properties

```css
.my-component {
  background-color: var(--color-primary-500);
  color: var(--color-neutral-0);
  border: 1px solid var(--color-border);
}
```

### Tailwind CSS

Die Farben sind bereits in `tailwind.config.js` integriert:

```html
<button class="bg-primary-500 text-white hover:bg-primary-600">
  Button
</button>
```

## Dateinamens-Konventionen

### Allgemeine Regeln

1. **Funktionale Namen statt Versionsnummern**
   - ✅ `evolutionhub-logo.svg`
   - ❌ `evolutionhub-logo-v2.svg`

2. **Kebab-Case für alle Dateinamen**
   - `evolutionhub-logo-horizontal.svg`
   - `icon-checkmark.svg`

3. **Semantische Suffixe für Varianten**
   - `-dark` für Dark Mode
   - `-horizontal` für horizontale Layouts
   - `-square` für quadratische Varianten

4. **Archivierung alter Versionen**
   - Bei Logo-Updates: alte Version nach `archive/` verschieben
   - Mit Datum versehen: `evolutionhub-logo-2024-12-31.svg`

### Bildformate

- **Logos:** Primär SVG, optional PNG für spezielle Anwendungen
- **Icons:** SVG (skalierbar, performance-optimiert)
- **Fotos/Grafiken:** WebP (mit JPEG/PNG Fallback)

## Dark Mode

Das Projekt unterstützt Dark Mode vollständig. Beachte bei Asset-Integration:

- Logo-Variante mit `-dark` Suffix für dunkle Hintergründe verwenden
- CSS Custom Properties nutzen (automatisch für Light/Dark konfiguriert)
- Tailwind Dark Mode Klassen: `dark:bg-gray-900`, `dark:text-white`, etc.

## Pflege und Updates

### Farben aktualisieren

1. `colors.json` bearbeiten (Hex-Werte anpassen)
2. `colors.css` regenerieren (oder manuell synchronisieren)
3. `tailwind.config.js` prüfen (falls nötig Tailwind-Theme erweitern)

### Logo aktualisieren

1. Neue Logo-Datei in `brand/logo/` platzieren
2. Alte Version nach `brand/logo/archive/` verschieben (mit Datum)
3. Alle Import-Referenzen prüfen (sollten über funktionale Namen automatisch aktualisieren)

### Tests

- Visuelle Regression Tests für Logo-Varianten (falls vorhanden)
- Farbkontrast-Tests für Accessibility (WCAG AA/AAA)
- Build-Prozess prüfen (Asset-Optimierung)

## Best Practices

1. **Konsistenz:** Immer die zentrale Farbdefinition (`colors.json`) verwenden
2. **Accessibility:** Farbkontraste für Text/Hintergrund beachten (min. 4.5:1)
3. **Performance:** SVG statt PNG für Logos und Icons bevorzugen
4. **Versionskontrolle:** Keine binären Assets (große PNGs) ohne Notwendigkeit committen
5. **Dokumentation:** Bei strukturellen Änderungen diese README aktualisieren

## Support und Fragen

Bei Fragen zur Asset-Struktur oder Konventionen wende dich an das Entwicklungsteam oder eröffne ein Issue im Repository.

---

**Repository:** github.com/EvolutionHub/EvolutionHub  
**Lizenz:** Siehe LICENSE im Root des Repositories
