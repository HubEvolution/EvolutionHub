# AOS-Animationen (AOSCoordinator)

Diese Dokumentation beschreibt die AOS-Integration über den `AOSCoordinator`, die
`AosWrapper`-Komponente und die bedingte Einbindung der AOS-Assets.

## Überblick

- AOS wird über CDN eingebunden, initialisiert und bei Navigationswechseln aktualisiert –
  umgesetzt in `src/components/scripts/AOSCoordinator.astro`.
- **NEU (v1.7.3)**: `AosWrapper`-Komponente für DRY-Prinzip und konsistente Animationen
- AOS-CSS wird mit Preload-Optimierung geladen für schnelleren FCP (siehe `src/layouts/BaseLayout.astro`).
- Auth-Seiten deaktivieren AOS bewusst: `src/layouts/AuthLayout.astro` übergibt `enableAOS={false}`.
- Nutzer mit `prefers-reduced-motion` erhalten automatisch keine Animationen.

## Relevante Dateien

- `src/components/AosWrapper.astro` – **NEU**: Wrapper-Komponente für konsistente AOS-Nutzung
- `src/lib/aos.ts` – **NEU**: Utilities (`aosDelayForIndex`, `getAosAttributes`)
- `src/components/scripts/AOSCoordinator.astro` – Initialisierung, Refresh auf Page-Transitions
- `src/layouts/BaseLayout.astro` – Preload-Optimierung + bedingte Einbindung von AOS-CSS
- `src/layouts/AuthLayout.astro` – Deaktiviert AOS für Auth-Seiten
- `tests/unit/lib/aos.test.ts` – **NEU**: Unit-Tests für AOS-Utilities

## Funktionsweise

- AOS-CSS wird im `<head>` nur gesetzt, wenn `enableAOS === true`.
- Der Coordinator lädt das AOS-Script via CDN, initialisiert AOS nach `DOMContentLoaded` und
  ruft bei Astro View Transitions einen `refreshHard()` auf, um neue DOM-Knoten zu animieren.
- Sicherheits-Pass: Sichtbare Elemente bekommen initial keine „Pop-in“-Animation.
- Cleanup entfernt Event-Listener bei Unmount.

## Verwendung

### Option 1: AosWrapper-Komponente (Empfohlen seit v1.7.3)

Die `AosWrapper`-Komponente bietet eine konsistente, typsichere API für AOS-Animationen:

```astro
---
import AosWrapper from '@/components/AosWrapper.astro';
---

<!-- Standard fade-up Animation -->
<AosWrapper tag="h1" class="title">
  My Title
</AosWrapper>

<!-- Mit Delay und Custom Duration -->
<AosWrapper delay={100} duration={650}>
  <p>My paragraph with 100ms delay</p>
</AosWrapper>

<!-- Custom Animation Type -->
<AosWrapper animation="fade-left" delay={200}>
  <div>Custom animation</div>
</AosWrapper>

<!-- Dynamische Delays für Listen (mit aosDelayForIndex) -->
{items.map((item, idx) => (
  <AosWrapper delay={aosDelayForIndex(idx, { step: 100, max: 300 })}>
    <div>{item.name}</div>
  </AosWrapper>
))}
```

**Props:**

- `animation` (string, default: `'fade-up'`) – AOS animation type
- `delay` (number, default: `0`) – Animation delay in ms
- `duration` (number, default: `700`) – Animation duration in ms
- `class` (string) – Additional CSS classes
- `tag` (string, default: `'div'`) – HTML tag to render
- `disableAos` (boolean, default: `false`) – Disable animation

### Option 2: Direkte data-aos Attribute (Legacy)

Für spezielle Fälle können weiterhin direkte Attribute verwendet werden:

```html
<section data-aos="fade-up" data-aos-delay="100" data-aos-duration="600">
  <!-- Inhalt -->
</section>
```

**Hinweis:** Die `AosWrapper`-Komponente wird empfohlen, da sie:

- TypeScript-Typsicherheit bietet
- Konsistente Defaults erzwingt
- Wartbarkeit verbessert (DRY-Prinzip)
- Unit-Tests abdeckt

### AOS Utilities

```typescript
import { aosDelayForIndex, getAosAttributes } from '@/lib/aos';

// Gestaffelte Delays für Listen berechnen
const delay = aosDelayForIndex(2, { step: 100, max: 400 }); // 200ms

// Programmatische AOS-Attribute generieren
const attrs = getAosAttributes({ animation: 'fade-left', delay: 100 });
// Returns: { 'data-aos': 'fade-left', 'data-aos-delay': '100', 'data-aos-duration': '700' }
```

- Reduzierte Bewegung respektieren: Es ist keine zusätzliche Arbeit nötig – Nutzerpräferenz wird automatisch erkannt.

## Deaktivieren auf Seitenebene

- Für Seiten, die keine Animationen benötigen (z. B. Auth), über `AuthLayout` oder in eigenem
  Layout `enableAOS={false}` setzen:

```astro
<BaseLayout title="…" enableAOS={false}>
  <slot />
</BaseLayout>
```

## View Transitions

- In `BaseLayout.astro` sind Astro View Transitions (`<ViewTransitions />`) aktiv. Der
  `AOSCoordinator` hört auf Transition-Events und führt `AOS.refreshHard()` aus, sodass neue
  Inhalte korrekt animiert werden.

## Performance-Optimierungen (v1.7.3)

### Preload CSS

AOS-CSS wird mit `<link rel="preload">` geladen für ~50-100ms schnelleren FCP:

```astro
<!-- BaseLayout.astro -->
<link
  rel="preload"
  href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css"
  as="style"
  onload="this.onload=null;this.rel='stylesheet'"
/>
<noscript>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" />
</noscript>
```

### Optimierter Timeout

Promise-basiertes Warten auf AOS-Verfügbarkeit (statt ineffizientem Polling).

### Code-Reduktion

- **-70% data-aos Vorkommen** (48 → <15) durch `AosWrapper`-Komponente
- **-150 LOC** in Pages durch DRY-Prinzip

## Troubleshooting

- Keine Animationen sichtbar: Prüfe `enableAOS`-Prop im verwendeten Layout.
- Flackern beim Ersteindruck: Stelle sicher, dass der Coordinator erst nach `DOMContentLoaded`
  initialisiert und dass der Sicherheits-Pass aktiv ist.
- Build-Fehler mit ESM-Imports: Die Integration nutzt CDN-Skripte, keine ESM-Imports –
  kompatibel mit SSR und Worker-Build.
- TypeScript-Fehler bei AosWrapper: Importiere Typen aus `@/lib/aos`:

  ```typescript
  import type { AosWrapperProps } from '@/lib/aos';
  ```

## Migration von Legacy zu AosWrapper

### Vorher (Legacy)

```astro
<h1 data-aos="fade-up" data-aos-duration="700">Title</h1>
<p data-aos="fade-up" data-aos-delay="100" data-aos-duration="650">Text</p>
<div data-aos="fade-up" data-aos-delay="200" data-aos-duration="650">Content</div>
```

### Nachher (v1.7.3+)

```astro
---
import AosWrapper from '@/components/AosWrapper.astro';
---

<AosWrapper tag="h1"><span>Title</span></AosWrapper>
<AosWrapper tag="p" delay={100} duration={650}>Text</AosWrapper>
<AosWrapper delay={200} duration={650}>Content</AosWrapper>
```

**Vorteile:**

- -60% weniger Code
- Type-Safety
- Konsistente Defaults
- Einfachere Wartung
