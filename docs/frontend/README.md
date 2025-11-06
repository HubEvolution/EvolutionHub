---
description: 'UI/UX-Design, Komponenten, Animationen und Design System für Evolution Hub'
owner: 'Frontend Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/components, src/styles, src/layouts'
testRefs: 'tests/unit/components, test-suite-v2/src/e2e'
---

<!-- markdownlint-disable MD051 -->

# Frontend Documentation

**Scope** — Diese Kategorie dokumentiert das Frontend-Design-System, UI-Komponenten, Animationen und Feature-Upgrades für Evolution Hub. Umfasst Astro-Komponenten, React Islands, Styling und UX-Prinzipien. Zielgruppe sind Frontend-Entwickler und Designer. Nicht enthalten: Backend-Architektur (→ Architecture-Kategorie) oder Testing-Strategien (→ Testing-Kategorie).

## Primärdokumente

- **[Design System](./design-system.md)** — Zentrale Quelle für Design-Tokens, Farben, Typografie und Spacing

- **[UI Components](./ui-components.md)** — Leitfaden für UI-Bausteine (Buttons, Forms, Layouts, Navigation)

- **[UI/UX Guidelines](./ui-ux.md)** — UX-Prinzipien, Accessibility und Interaction-Patterns

## Sekundär-/Spezialdokumente

- **[Components Overview](./components.md)** — Überblick über Astro-/React-Komponenten und deren Struktur

- **[Card Components](./card-components.md)** — Detaildoku zu Kartenvarianten und Visual Hierarchy

- **[Entitlements UI Gating](./entitlements-ui-gating.md)** — Plan-/Quota-basiertes Gating im Frontend

- **[Coming Soon Pages](./coming-soon.md)** — Patterns für Teaser- und Warteseiten

- **[Toast Notifications](./toast-notifications.md)** — Sonner-basierte Benachrichtigungen inkl. Theming

- **[Image Enhancer UI Upgrade](./imag-enhancer-ui-upgrade.md)** — Glassmorphism, Compare-Tools & Feature-Gating

## Design System

### Core Design Documentation

- **[Farben](./design-system.md)** — Farbpalette und Anwendungsrichtlinien

- **[Typografie](./design-system.md)** — Schriftfamilien, Größen, Line Heights

- **[Abstände & Größen](./design-system.md)** — Spacing-Scale und Layout-Grids

### Component Documentation

#### Component Guides

- **[Form Components](./ui-components.md)** — Input-Felder, Buttons, Validation-States

- **[Layout Components](./ui-components.md)** — Container, Grid, Flexbox-Patterns

- **[Navigation Components](./ui-components.md)** — Header, Footer, Breadcrumbs

#### Feature Components

- **[Card Components](./card-components.md)** — Kartenvarianten, Metrics-Badges, Placeholder-States

- **[Entitlements UI Gating](./entitlements-ui-gating.md)** — Feature-Toggles nach Plan/Quota

- **[Coming Soon Pages](./coming-soon.md)** — Struktur & Animationen für Pre-Launch-Seiten

- **[Toast Notifications](./toast-notifications.md)** — UX-Patterns für Feedback-Komponenten

- **[Image Enhancer UI Upgrade](./imag-enhancer-ui-upgrade.md)** — Split-Slider, Zoom, Lupe & Usage-Pill

## Animations

### Animation Systems

- **[AOS Coordinator](./aos-coordinator.md)** — Scroll-basierte Animationen & Intersection Observer

- **[Header Scroll Animation](./header-scroll-animation.md)** — Sticky Header, Shadow & Scale-Verhalten

## Cross-Referenzen

- **[Development](../development/)** — Frontend-Tooling und Build-Prozesse

- **[Architecture](../architecture/)** — Frontend-Architekturentscheidungen (Astro, React Islands)

- **[Testing](../testing/)** — Frontend-Tests und Accessibility-Testing

- **[Security](../security/)** — CSP und Security-Headers für Frontend-Assets

## Ownership & Maintenance

**Owner:** Frontend Team (Lead: UI/UX Lead)
**Update-Frequenz:** Bei Design-System-Änderungen oder neuen Komponenten
**Review-Prozess:** Design-Review + Accessibility-Check
**Eskalation:** Bei Design-Konflikten → Product Designer

## Standards & Konventionen

- **CSS-Methodology:** Utility-First mit Tailwind CSS

- **Component-Naming:** PascalCase für Komponenten, camelCase für Utilities

- **Accessibility:** WCAG 2.1 AA-Standard, regelmäßige a11y-Audits

- **Responsive:** Mobile-First, Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

- **Animationen:** Reduced-Motion-Fallbacks, Performance-optimierte Lottie-Dateien

## Bekannte Lücken

- **TODO:** Vollständige Storybook-Dokumentation für alle Komponenten

- **TODO:** Design-System-Token-Automation

- **TODO:** Performance-Metriken für Frontend-Assets

## Übersicht

Evolution Hub nutzt einen modernen Frontend-Stack:

- **Framework**: Astro 5 mit React Islands

- **Styling**: Tailwind CSS 3

- **Animations**: AOS (Animate On Scroll), Lottie Web

- **Icons**: Heroicons via astro-heroicons

- **Architecture**: Islands-based mit selektivem Hydration

Siehe auch: [../architecture/adrs/0003-astro-frontend-architecture.md](../architecture/adrs/0003-astro-frontend-architecture.md)

## Design System (2)

### Core Design Documentation (2)

- **[Design System](./design-system.md)** — Vollständiges Design-System inkl. Farben, Typography, Spacing

- **[UI Components](./ui-components.md)** — Leitfaden für UI-Komponenten (Buttons, Forms, Cards, etc.)

- **[UI/UX Guidelines](./ui-ux.md)** — UX-Prinzipien und Best Practices

## Component Documentation (2)

### Component Guides (2)

- **[Components](./components.md)** — Übersicht über alle Komponenten und deren Verwendung

- **[Card Components](./card-components.md)** — Spezielle Dokumentation für Card-Komponenten

### Feature Components (2)

- **[Coming Soon](./coming-soon.md)** — Coming-Soon-Seiten und -Features

- **[Entitlements UI Gating](./entitlements-ui-gating.md)** — Plan-basiertes UI-Gating (Free vs. Pro)

- **[Toast Notifications](./toast-notifications.md)** — Toast-Notification-System (Sonner)

## Animations (2)

### Animation Systems (2)

- **[AOS Coordinator](./aos-coordinator.md)** — Animate On Scroll Koordinator für Page-Transitions

- **[Header Scroll Animation](./header-scroll-animation.md)** — Scroll-basierte Header-Animationen

## Feature Upgrades (2)

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

```text

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

```text

```astro
---
import MyIsland from '@/components/islands/MyIsland';
---

<MyIsland client:load />
<!-- oder: client:idle, client:visible -->
```
