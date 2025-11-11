---
description: 'Header Scroll Animation – Show/Hide-Logik und Implementierungsdetails'
owner: 'Frontend Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: 'src/components/Header.astro, src/components/scripts/HeaderScroll.astro'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Header Scroll Animation

Diese Dokumentation beschreibt die performante Show/Hide-Animation des Headers beim Scrollen.

## Überblick

- Die Scroll-Logik ist in `src/components/scripts/HeaderScroll.astro` gekapselt.

- Die Integration erfolgt zentral in `src/components/Header.astro` am Dateiende über `<HeaderScroll />`.

- Der Effekt blendet den Header beim Scrollen nach unten verzögert aus und beim Scrollen nach oben sofort wieder ein.

## Relevante Dateien

- `src/components/scripts/HeaderScroll.astro` – Scroll-Logik mit `requestAnimationFrame`, Throttling und Cleanup.

- `src/components/Header.astro` – UI-Struktur, Sticky-Header, CSS-Klassen, Integration des Skripts.

## Funktionsweise

- Initial wird der Header sichtbar gemacht: Klasse `header-visible` gesetzt, `header-hidden` entfernt.

- Schwellenwerte:

  - `scrollThreshold = 80` – Oberhalb bleibt der Header immer sichtbar.

  - `scrollDeltaThreshold = 8` – Kleinere Bewegungen werden ignoriert.

- Event-Handling:

  - Scroll/Resize-Events sind passiv und werden via `requestAnimationFrame` gedrosselt.

  - Beim Scrollen nach unten wird nach 200ms Verzögerung ausgeblendet (bessere UX), nach oben sofort eingeblendet.

- Cleanup: Entfernt Listener und Timer über `window.headerScrollCleanup()`.

## CSS-Klassen

- `#site-header.header-visible` – Header eingeblendet.

- `#site-header.header-hidden` – Header ausgeblendet (TranslateY, Opacity reduziert, Pointer-Events off).

- Transitions sind in `Header.astro` definiert (Transform/Opacity, `will-change` für Performance).

## Integration

- Bereits global aktiv: `<HeaderScroll />` ist in `src/components/Header.astro` enthalten.

- Keine Seitenanpassung notwendig, solange `Header` im Layout (`BaseLayout.astro`) verwendet wird.

## Debugging & Tipps

- Header reagiert nicht: Stelle sicher, dass das Element `#site-header` vorhanden ist (siehe `Header.astro`).

- Ruckeln/Flackern: Prüfe, ob zusätzliche Scroll-Skripte Konflikte verursachen; Doppel-Logik wurde bewusst entfernt und zentralisiert.

- Barrierefreiheit: Der Header bleibt fokussierbar; Fokus-Stile sind im Header-CSS hinterlegt.
