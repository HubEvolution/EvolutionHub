# Design-System-Dokumentation

Diese Dokumentation beschreibt das Design-System des Evolution Hub, einschließlich Farben, Typografie, Abstände und weiterer UI-Richtlinien. Das Design-System basiert auf Tailwind CSS und sorgt für ein konsistentes Erscheinungsbild in der gesamten Anwendung.

## Inhaltsverzeichnis

1. [Farbpalette](#farbpalette)
2. [Typografie](#typografie)
3. [Abstände und Größen](#abstände-und-größen)
4. [Schatten und Elevation](#schatten-und-elevation)
5. [Rundungen](#rundungen)
6. [Dark Mode](#dark-mode)
7. [Responsive Design](#responsive-design)
8. [Animationen und Übergänge](#animationen-und-übergänge)

---

## Farbpalette

Das Evolution Hub verwendet eine konsistente Farbpalette, die auf Emerald und Cyan als Primärfarben basiert.

### Primärfarben

| Name | Hex-Wert | Tailwind-Klasse | Verwendung |
|------|----------|-----------------|------------|
| Emerald 500 | `#10b981` | `bg-emerald-500` | Primäre Aktionen, Buttons, Links |
| Emerald 600 | `#059669` | `bg-emerald-600` | Hover-Zustand für primäre Aktionen |
| Cyan 500 | `#06b6d4` | `bg-cyan-500` | Akzente, Gradienten |
| Cyan 600 | `#0891b2` | `bg-cyan-600` | Hover-Zustand für Akzente |

### Graustufen

| Name | Hex-Wert | Tailwind-Klasse | Verwendung |
|------|----------|-----------------|------------|
| Gray 50 | `#f9fafb` | `bg-gray-50` | Hintergrund (Light Mode) |
| Gray 100 | `#f3f4f6` | `bg-gray-100` | Karten-Hintergrund (Light Mode) |
| Gray 200 | `#e5e7eb` | `bg-gray-200` | Trennlinien (Light Mode) |
| Gray 300 | `#d1d5db` | `bg-gray-300` | Deaktivierte Elemente (Light Mode) |
| Gray 700 | `#374151` | `bg-gray-700` | Text (Light Mode) |
| Gray 800 | `#1f2937` | `bg-gray-800` | Überschriften (Light Mode) |
| Gray 900 | `#111827` | `bg-gray-900` | Hintergrund (Dark Mode) |

### Statusfarben

| Name | Hex-Wert | Tailwind-Klasse | Verwendung |
|------|----------|-----------------|------------|
| Green 500 | `#22c55e` | `text-green-500` | Erfolg, abgeschlossene Aktionen |
| Red 500 | `#ef4444` | `text-red-500` | Fehler, Warnungen |
| Yellow 500 | `#eab308` | `text-yellow-500` | Hinweise, Warnungen |
| Blue 500 | `#3b82f6` | `text-blue-500` | Informationen |

### Farbverwendung

- **Primäre Aktionen**: Emerald 500 als Basisfarbe, Emerald 600 für Hover-Zustände
- **Gradienten**: Verlauf von Emerald 500 zu Cyan 500 für hervorgehobene Elemente
- **Text**: Gray 700 auf hellem Hintergrund, Gray 200 auf dunklem Hintergrund
- **Überschriften**: Gray 800 auf hellem Hintergrund, Gray 50 auf dunklem Hintergrund
- **Hintergründe**: Gray 50 oder White für Light Mode, Gray 900 für Dark Mode

---

## Typografie

Evolution Hub verwendet eine klare Typografie-Hierarchie für optimale Lesbarkeit und Konsistenz.

### Schriftfamilien

| Verwendung | Schriftfamilie | Tailwind-Klasse |
|------------|----------------|-----------------|
| Überschriften | Inter | `font-heading` |
| Fließtext | Inter | `font-sans` |
| Monospace | JetBrains Mono | `font-mono` |

### Schriftgrößen

| Name | Größe | Tailwind-Klasse | Verwendung |
|------|-------|-----------------|------------|
| xs | 0.75rem (12px) | `text-xs` | Kleingedrucktes, Fußnoten |
| sm | 0.875rem (14px) | `text-sm` | Sekundärer Text, Labels |
| base | 1rem (16px) | `text-base` | Standardtext |
| lg | 1.125rem (18px) | `text-lg` | Hervorgehobener Text |
| xl | 1.25rem (20px) | `text-xl` | Kleine Überschriften |
| 2xl | 1.5rem (24px) | `text-2xl` | Abschnittsüberschriften |
| 3xl | 1.875rem (30px) | `text-3xl` | Seitenüberschriften |
| 4xl | 2.25rem (36px) | `text-4xl` | Hauptüberschriften |

### Schriftstärken

| Name | Wert | Tailwind-Klasse | Verwendung |
|------|------|-----------------|------------|
| Normal | 400 | `font-normal` | Standardtext |
| Medium | 500 | `font-medium` | Leicht hervorgehobener Text |
| Semibold | 600 | `font-semibold` | Überschriften, wichtige Texte |
| Bold | 700 | `font-bold` | Starke Hervorhebung |

### Zeilenhöhe

| Name | Wert | Tailwind-Klasse | Verwendung |
|------|------|-----------------|------------|
| Tight | 1.25 | `leading-tight` | Überschriften |
| Normal | 1.5 | `leading-normal` | Standardtext |
| Relaxed | 1.625 | `leading-relaxed` | Längere Textabschnitte |
| Loose | 2 | `leading-loose` | Besonders lesefreundliche Abschnitte |

### Typografie-Beispiele

```html
<!-- Hauptüberschrift -->
<h1 class="text-4xl font-semibold text-gray-800 dark:text-gray-50 leading-tight">
  Evolution Hub
</h1>

<!-- Abschnittsüberschrift -->
<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100 leading-tight">
  Dashboard
</h2>

<!-- Standardtext -->
<p class="text-base text-gray-700 dark:text-gray-300 leading-normal">
  Willkommen im Evolution Hub. Hier findest du alle Tools und Ressourcen.
</p>

<!-- Hervorgehobener Text -->
<p class="text-lg font-medium text-gray-700 dark:text-gray-200">
  Wichtige Information
</p>

<!-- Kleingedrucktes -->
<p class="text-xs text-gray-500 dark:text-gray-400">
  Letzte Aktualisierung: 03.08.2025
</p>
```

---

## Abstände und Größen

Evolution Hub verwendet ein konsistentes Spacing-System basierend auf dem 4px-Grid von Tailwind CSS.

### Spacing-Skala

| Name | Wert | Tailwind-Klasse | Verwendung |
|------|------|-----------------|------------|
| px | 1px | `p-px`, `m-px` | Feine Ränder, Trennlinien |
| 0.5 | 0.125rem (2px) | `p-0.5`, `m-0.5` | Minimale Abstände |
| 1 | 0.25rem (4px) | `p-1`, `m-1` | Sehr kleine Abstände |
| 2 | 0.5rem (8px) | `p-2`, `m-2` | Kleine Abstände |
| 3 | 0.75rem (12px) | `p-3`, `m-3` | Kompakte Abstände |
| 4 | 1rem (16px) | `p-4`, `m-4` | Standardabstände |
| 6 | 1.5rem (24px) | `p-6`, `m-6` | Mittlere Abstände |
| 8 | 2rem (32px) | `p-8`, `m-8` | Große Abstände |
| 12 | 3rem (48px) | `p-12`, `m-12` | Sehr große Abstände |
| 16 | 4rem (64px) | `p-16`, `m-16` | Extra große Abstände |

### Container-Größen

| Größe | Wert | Tailwind-Klasse |
|-------|------|-----------------|
| XS | 20rem (320px) | `max-w-xs` |
| SM | 24rem (384px) | `max-w-sm` |
| MD | 28rem (448px) | `max-w-md` |
| LG | 32rem (512px) | `max-w-lg` |
| XL | 36rem (576px) | `max-w-xl` |
| 2XL | 42rem (672px) | `max-w-2xl` |
| 4XL | 56rem (896px) | `max-w-4xl` |
| 7XL | 80rem (1280px) | `max-w-7xl` |

### Abstandsrichtlinien

- **Zwischen Komponenten**: `my-6` (1.5rem) oder `my-8` (2rem)
- **Zwischen Abschnitten**: `my-12` (3rem) oder `my-16` (4rem)
- **Innenabstand in Karten**: `p-4` (1rem) für kleine Karten, `p-6` (1.5rem) für größere Karten
- **Innenabstand in Buttons**: `px-4 py-2` für mittlere Buttons
- **Seitenränder**: `px-4` auf mobilen Geräten, `px-6` oder mehr auf größeren Bildschirmen

---

## Schatten und Elevation

Schatten werden verwendet, um Tiefe und Hierarchie in der Benutzeroberfläche zu erzeugen.

### Schatten-Skala

| Name | Tailwind-Klasse | Verwendung |
|------|-----------------|------------|
| SM | `shadow-sm` | Subtile Erhebung, Karten im ruhenden Zustand |
| MD | `shadow` | Standardschatten, Karten im aktiven Zustand |
| LG | `shadow-lg` | Stärkere Erhebung, Modals, Dropdowns |
| XL | `shadow-xl` | Hohe Erhebung, wichtige UI-Elemente |
| 2XL | `shadow-2xl` | Maximale Erhebung, hervorgehobene Elemente |

### Schatten-Beispiele

```html
<!-- Karte im Ruhezustand -->
<div class="shadow-sm hover:shadow bg-white dark:bg-gray-800 transition-shadow duration-200">
  <!-- Karteninhalt -->
</div>

<!-- Modal oder Dialog -->
<div class="shadow-lg bg-white dark:bg-gray-800">
  <!-- Modalinhalt -->
</div>

<!-- Dropdown-Menü -->
<div class="shadow-lg bg-white dark:bg-gray-800">
  <!-- Menüeinträge -->
</div>
```

---

## Rundungen

Border-Radius wird konsistent angewendet, um die visuelle Identität zu stärken.

### Rundungs-Skala

| Name | Wert | Tailwind-Klasse | Verwendung |
|------|------|-----------------|------------|
| SM | 0.125rem (2px) | `rounded-sm` | Minimale Rundung |
| MD | 0.375rem (6px) | `rounded` | Standardrundung |
| LG | 0.5rem (8px) | `rounded-lg` | Karten, Buttons |
| XL | 0.75rem (12px) | `rounded-xl` | Hervorgehobene Elemente |
| Full | 9999px | `rounded-full` | Kreise, Pills, Avatare |

### Rundungs-Richtlinien

- **Buttons**: `rounded-lg` für rechteckige Buttons, `rounded-full` für Pills
- **Karten**: `rounded-lg` für alle Karten
- **Inputs**: `rounded-md` für Eingabefelder
- **Avatare**: `rounded-full` für kreisförmige Avatare
- **Badges**: `rounded-full` für Pills, `rounded` für kleine Badges

---

## Dark Mode

Evolution Hub unterstützt vollständig den Dark Mode mit angepassten Farben und Kontrasten.

### Dark-Mode-Implementierung

Die Anwendung verwendet Tailwind's Dark-Mode-Funktionalität mit der `dark:`-Variante. Der Dark Mode kann manuell umgeschaltet oder basierend auf den Systemeinstellungen automatisch aktiviert werden.

### Dark-Mode-Farbpalette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Hintergrund | `bg-gray-50` | `dark:bg-gray-900` |
| Karten | `bg-white` | `dark:bg-gray-800` |
| Text | `text-gray-700` | `dark:text-gray-300` |
| Überschriften | `text-gray-800` | `dark:text-gray-50` |
| Primärfarbe | `text-emerald-600` | `dark:text-emerald-400` |

### Dark-Mode-Beispiel

```html
<div class="bg-gray-50 dark:bg-gray-900">
  <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
    <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-50">
      Kartenüberschrift
    </h2>
    <p class="text-gray-700 dark:text-gray-300 mt-2">
      Karteninhalt mit automatischer Anpassung an den Dark Mode.
    </p>
    <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg mt-4">
      Aktion
    </button>
  </div>
</div>
```

---

## Responsive Design

Evolution Hub ist vollständig responsiv und passt sich verschiedenen Bildschirmgrößen an.

### Breakpoints

| Name | Wert | Tailwind-Klasse | Beschreibung |
|------|------|-----------------|-------------|
| SM | 640px | `sm:` | Kleine Tablets und große Smartphones |
| MD | 768px | `md:` | Tablets im Hochformat |
| LG | 1024px | `lg:` | Tablets im Querformat und kleine Desktops |
| XL | 1280px | `xl:` | Desktop-Bildschirme |
| 2XL | 1536px | `2xl:` | Große Desktop-Bildschirme |

### Responsive-Design-Richtlinien

- **Mobile-First-Ansatz**: Basis-Styles für mobile Geräte, dann Anpassungen für größere Bildschirme
- **Flexible Layouts**: Verwendung von Flexbox und Grid für anpassungsfähige Layouts
- **Responsive Typografie**: Anpassung der Schriftgrößen an verschiedene Bildschirmgrößen
- **Versteckte/Sichtbare Elemente**: Verwendung von `hidden` und `block` für verschiedene Breakpoints

### Responsive-Design-Beispiel

```html
<!-- Responsive Grid-Layout -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <!-- Karteninhalte -->
</div>

<!-- Responsive Navigation -->
<nav>
  <!-- Mobile Navigation (Burger-Menü) -->
  <div class="block md:hidden">
    <!-- Burger-Menü-Icon -->
  </div>
  
  <!-- Desktop Navigation -->
  <div class="hidden md:flex">
    <!-- Navigationslinks -->
  </div>
</nav>
```

---

## Animationen und Übergänge

Evolution Hub verwendet subtile Animationen und Übergänge, um das Benutzererlebnis zu verbessern.

### Übergangs-Dauern

| Name | Wert | Tailwind-Klasse | Verwendung |
|------|------|-----------------|------------|
| 75 | 75ms | `duration-75` | Sehr schnelle Übergänge |
| 100 | 100ms | `duration-100` | Schnelle Übergänge |
| 150 | 150ms | `duration-150` | Standardübergänge |
| 200 | 200ms | `duration-200` | Mittlere Übergänge |
| 300 | 300ms | `duration-300` | Langsame Übergänge |
| 500 | 500ms | `duration-500` | Sehr langsame Übergänge |

### Übergangs-Eigenschaften

| Eigenschaft | Tailwind-Klasse | Verwendung |
|-------------|-----------------|------------|
| All | `transition` | Standardübergang für mehrere Eigenschaften |
| Colors | `transition-colors` | Farbübergänge |
| Opacity | `transition-opacity` | Transparenzübergänge |
| Shadow | `transition-shadow` | Schattenübergänge |
| Transform | `transition-transform` | Transformationsübergänge |

### Timing-Funktionen

| Name | Tailwind-Klasse | Verwendung |
|------|-----------------|------------|
| Linear | `ease-linear` | Gleichmäßige Übergänge |
| In | `ease-in` | Langsamer Start, schnelles Ende |
| Out | `ease-out` | Schneller Start, langsames Ende |
| In-Out | `ease-in-out` | Langsamer Start und Ende, schnelle Mitte |

### Animations-Beispiele

```html
<!-- Hover-Übergang für Karten -->
<div class="transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg">
  <!-- Karteninhalt -->
</div>

<!-- Farbübergang für Buttons -->
<button class="bg-emerald-500 hover:bg-emerald-600 transition-colors duration-150">
  Button-Text
</button>

<!-- Fade-In-Animation -->
<div class="opacity-0 animate-fade-in">
  <!-- Inhalt, der eingeblendet wird -->
</div>
```

### Lottie-Animationen

Für komplexere Animationen verwendet Evolution Hub die Lottie-Bibliothek:

```jsx
import Lottie from 'lottie-web';
import { useRef, useEffect } from 'react';

export default function LoadingAnimation() {
  const container = useRef(null);
  
  useEffect(() => {
    const anim = Lottie.loadAnimation({
      container: container.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/assets/animations/loading.json'
    });
    
    return () => anim.destroy();
  }, []);
  
  return <div ref={container} className="w-24 h-24"></div>;
}
```

### AOS (Animate On Scroll)

AOS v2.3.4 wird für Scroll-Animationen verwendet und ist CDN-basiert integriert, um Kompatibilität mit Astro SSR und Cloudflare Pages sicherzustellen.

#### Integration & Architektur

- Dedizierte Koordinator-Komponente: `src/components/scripts/AOSCoordinator.astro`
- AOS-CSS wird im `<head>` nur geladen, wenn `enableAOS === true` (siehe `src/layouts/BaseLayout.astro`).
- Das AOS-Script wird vom Coordinator per CDN geladen und initialisiert; keine ESM-Imports.
- Respektiert automatisch `prefers-reduced-motion` (Animationen werden für Nutzer mit reduzierter Bewegung deaktiviert).
- Reagiert auf Astro View Transitions und ruft `AOS.refreshHard()` auf.
- Auth-Seiten deaktivieren AOS bewusst: `AuthLayout.astro` setzt `enableAOS={false}`.

Weitere Details: `docs/frontend/aos-coordinator.md`.

#### CDN-Einbindung

- CSS wird in `BaseLayout.astro` bedingt eingebunden:

```astro
{enableAOS && (
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" />
)}
```

- Das JS wird vom `AOSCoordinator` dynamisch über CDN geladen und initialisiert. Es gibt keinen direkten `<script src=…>`-Eintrag im Layout.

#### Verwendung in HTML

```html
<!-- Element, das beim Scrollen animiert wird -->
<div 
  data-aos="fade-up" 
  data-aos-duration="800" 
  data-aos-offset="200" 
  data-aos-easing="ease-in-out"
>
  <!-- Inhalt -->
</div>
```

#### Verfügbare Animationen

- **Fade**: `fade-up`, `fade-down`, `fade-left`, `fade-right`
- **Slide**: `slide-up`, `slide-down`, `slide-left`, `slide-right`
- **Zoom**: `zoom-in`, `zoom-out`
- **Flip**: `flip-left`, `flip-right`, `flip-up`, `flip-down`

#### Build-Kompatibilität

⚠️ **Wichtig**: AOS darf NICHT als NPM-Modul in Astro `<script>`-Blöcken importiert werden, da dies zu leeren JS-Chunks im Build führt. Die CDN-basierte Lösung gewährleistet Kompatibilität mit:

- Astro-Standardserver (`npm run dev`)
- Cloudflare Pages SSR (`npm run dev:wrangler`)
- Produktions-Builds
