<!-- markdownlint-disable MD051 -->

# Typewriter-Animation

## Übersicht

Die Typewriter-Animation zeigt im Hero-Bereich rotierende Texte im Schreibmaschinen‑Stil. Die aktuelle Implementierung verwendet eine wiederverwendbare Astro‑Komponente und zusätzlich eine Low‑Level‑Utility im lib‑Ordner.

## Implementierung

- Component (empfohlen): [`src/components/scripts/TypewriterComponent.astro`](src/components/scripts/TypewriterComponent.astro:1) — diese Komponente wird in den Startseiten verwendet und erwartet Props `elementId`, `texts` und `defaultDelay`.

- Reusable helper (optional): [`src/lib/typewriter.ts`](src/lib/typewriter.ts:7) — eine TypeScript‑Funktion `runTypewriter(elementId, texts, speed)` für direkte DOM‑Nutzung.

- JS‑Fallback: [`src/lib/typewriter.js`](src/lib/typewriter.js:1) — flexiblere Version, die auch einen `textsProvider` (Funktion) akzeptiert.

## Verwendung auf der Startseite

Die Startseiten importieren und nutzen die Komponente so:

```astro
---
import TypewriterComponent from '@/components/scripts/TypewriterComponent.astro';
const heroTypewriterTexts = getI18nArray(locale)('pages.home.hero.typewriter');
const heroTypewriterItems = heroTypewriterTexts.map((text) => ({ text }));
---
<span id="hero-typewriter"></span>
<TypewriterComponent elementId="hero-typewriter" texts={heroTypewriterItems} defaultDelay={120} />

```json

Beispiele im Projekt:

- [`src/pages/de/index.astro`](src/pages/de/index.astro:29)

- [`src/pages/en/index.astro`](src/pages/en/index.astro:43)

## Parameter (Component)

- `elementId` (string): ID des Ziel‑Elements (z. B. `"hero-typewriter"`).

- `texts` (Array<{ text: string; delay?: number }>): Array von Textobjekten. `delay` ist optional und überschreibt `defaultDelay` für das jeweilige Element.

- `defaultDelay` (number): Basisgeschwindigkeit in Millisekunden (z. B. `120`).

## Alternative: Direktes runTypewriter

Wenn Sie die Low‑Level‑Funktion bevorzugen, können Sie [`src/lib/typewriter.ts`](src/lib/typewriter.ts:7) importieren:

```ts
import { runTypewriter } from '@/lib/typewriter';
runTypewriter('hero-typewriter', ['First text', 'Zweiter Text'], 120);
```

Hinweis: [`src/lib/typewriter.js`](src/lib/typewriter.js:1) unterstützt als `textsProvider` auch eine Funktion, die Texte asynchron liefert.

## Barrierefreiheit

- Die Implementierung respektiert die CSS‑Media‑Query `prefers-reduced-motion` und deaktiviert die Animation, wenn Nutzer reduzierte Bewegung bevorzugen.

- Achten Sie auf ausreichende Kontraste und ARIA‑Attribute für das umgebende Markup.

## Lokalisierung / Texte pflegen

- Die Hero‑Texte werden aus den Locale‑Dateien geladen (z. B. in `src/locales/de.json` und `src/locales/en.json`) und über Hilfsfunktionen wie [`src/utils/i18n.ts`](src/utils/i18n.ts:1) bereitgestellt.

- Beim Anlegen neuer Texte achten Sie auf vergleichbare Länge in verschiedenen Sprachen, damit Layout‑Verschiebungen minimiert werden.

## Hinweise & Troubleshooting

- Wenn die Animation nicht startet, prüfen Sie, ob das Element mit der angegebenen `elementId` im DOM existiert.

- Bei serverseitigem Rendering (SSR) sicherstellen, dass die Komponente clientseitig initialisiert wird (z. B. `client:load` oder `client:idle` bei Astro‑Islands).

## Änderung gegenüber alter Dokumentation

Frühere Versionen der Dokumentation beschrieben einen direkten Aufruf `runTypewriter('typewriter', [...], 100)` in [`src/pages/index.astro`](src/pages/index.astro:6). Das ist nicht mehr korrekt: die Startseiten nutzen die `TypewriterComponent` und die eigentliche Initialisierung erfolgt in den jeweiligen lokalisierten Index‑Seiten.
