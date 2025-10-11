# Frontend Documentation

Diese Dokumentation beschreibt die Frontend-Architektur, UI/UX-Design, Komponenten und Animationen von Evolution Hub.

## Übersicht

Evolution Hub nutzt einen modernen Frontend-Stack:

- **Framework**: Astro 5 mit React Islands
- **Styling**: Tailwind CSS 3
- **Animations**: AOS (Animate On Scroll), Lottie Web
- **Icons**: Heroicons via astro-heroicons
- **Architecture**: Islands-based mit selektivem Hydration

Siehe auch: [../architecture/adrs/0003-astro-frontend-architecture.md](../architecture/adrs/0003-astro-frontend-architecture.md)

## Design System

### Core Design Documentation

- **[Design System](./design-system.md)** — Vollständiges Design-System inkl. Farben, Typography, Spacing
- **[UI Components](./ui-components.md)** — Leitfaden für UI-Komponenten (Buttons, Forms, Cards, etc.)
- **[UI/UX Guidelines](./ui-ux.md)** — UX-Prinzipien und Best Practices

## Component Documentation

### Component Guides

- **[Components](./components.md)** — Übersicht über alle Komponenten und deren Verwendung
- **[Card Components](./card-components.md)** — Spezielle Dokumentation für Card-Komponenten

### Feature Components

- **[Coming Soon](./coming-soon.md)** — Coming-Soon-Seiten und -Features
- **[Entitlements UI Gating](./entitlements-ui-gating.md)** — Plan-basiertes UI-Gating (Free vs. Pro)
- **[Toast Notifications](./toast-notifications.md)** — Toast-Notification-System (Sonner)

## Animations

### Animation Systems

- **[AOS Coordinator](./aos-coordinator.md)** — Animate On Scroll Koordinator für Page-Transitions
- **[Header Scroll Animation](./header-scroll-animation.md)** — Scroll-basierte Header-Animationen

## Feature Upgrades

### Major UI Upgrades

- **[Image Enhancer UI Upgrade](./imag-enhancer-ui-upgrade.md)** — UI-Upgrade für AI Image Enhancer
  - Compare-Slider-Integration
  - Usage-Pill-Komponente
  - Plan-Anzeige und Gating

## Component Structure

```text
src/components/
├── ui/              # Basis-UI-Komponenten (Button, Input, etc.)
├── layout/          # Layout-Komponenten (Header, Footer, etc.)
├── tools/           # Tool-spezifische Komponenten
│   ├── imag-enhancer/
│   └── prompt-enhancer/
└── islands/         # React Islands (clientseitig hydratisiert)
```

## Styling Guidelines

### Tailwind CSS

- Nutze Utility-First-Approach
- Verwende `@apply` sparsam (nur für wiederverwendbare Patterns)
- Konsistente Spacing-Scale (`space-y-4`, `gap-6`, etc.)
- Responsive Design: Mobile-First (`sm:`, `md:`, `lg:`, `xl:`)

### CSS Custom Properties

Definiert in `src/styles/global.css`:

- `--color-primary-*`: Primärfarben
- `--color-background-*`: Hintergrundfarben
- `--spacing-*`: Spacing-Scale

## Accessibility

- Semantisches HTML
- ARIA-Labels für interaktive Elemente
- Keyboard-Navigation
- Focus-States

Siehe: [Testing Documentation](../testing/) für Accessibility-Tests

## Performance

- **Islands Architecture**: Minimale Client-Side JavaScript
- **Lazy Loading**: Bilder und Komponenten
- **Code Splitting**: Automatisch via Astro
- **Prefetching**: Kritische Routes

## Weitere Dokumentation

- **[Architecture Documentation](../architecture/)** — Technische Architektur
- **[Development Documentation](../development/)** — Entwicklungs-Workflows
- **[Testing Documentation](../testing/)** — Testing-Strategie inkl. Visual Regression

## Schnellreferenzen

### Komponenten-Entwicklung

```astro
---
// MyComponent.astro
import Button from '@/components/ui/Button.astro';
---

<div class="container mx-auto">
  <Button variant="primary">Click me</Button>
</div>
```

### React Islands

```tsx
// MyIsland.tsx
import { useState } from 'react';

export default function MyIsland() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

```astro
---
import MyIsland from '@/components/islands/MyIsland';
---

<MyIsland client:load />
<!-- oder: client:idle, client:visible -->
```
