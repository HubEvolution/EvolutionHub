---
description: 'UI/UX-Design, Komponenten, Animationen und Design System für Evolution Hub'
owner: 'Frontend Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'src/components, src/styles, src/layouts'
testRefs: 'tests/unit/components, test-suite-v2/src/e2e'
---

# Frontend Documentation

**Scope** — Diese Kategorie dokumentiert das Frontend-Design-System, UI-Komponenten, Animationen und Feature-Upgrades für Evolution Hub. Umfasst Astro-Komponenten, React Islands, Styling und UX-Prinzipien. Zielgruppe sind Frontend-Entwickler und Designer. Nicht enthalten: Backend-Architektur (→ Architecture-Kategorie) oder Testing-Strategien (→ Testing-Kategorie).

## Primärdokumente

- **[Design System](./design-system.md)** — **Hauptdokument** für Design-Tokens, Farben, Typography und Spacing
- **[UI Components](./ui-components.md)** — Komponenten-Leitfaden (Buttons, Forms, Cards, Layouts)
- **[UI/UX Guidelines](./ui-ux.md)** — UX-Prinzipien, Accessibility und Best Practices

## Sekundär-/Spezialdokumente

- **[Animation System](./animation-system.md)** — Animations-Framework (AOS, Header-Scroll, Lottie)
- **[Responsive Design](./responsive-design.md)** — Mobile-First-Ansatz und Breakpoints
- **[Accessibility Guidelines](./a11y-guidelines.md)** — WCAG-Konformität und Screen-Reader-Optimierung

## Design System

### Core Design Documentation

- **[Colors & Typography](./design-system.md#colors)** — Farbpalette und Schriftarten
- **[Spacing System](./design-system.md#spacing)** — Konsistentes Spacing und Layout-Grids
- **[Component Tokens](./design-system.md#tokens)** — Design-Token-Definitionen

### Component Documentation

#### Component Guides

- **[Form Components](./ui-components.md#forms)** — Input-Felder, Buttons, Validation-States
- **[Layout Components](./ui-components.md#layouts)** — Container, Grid, Flexbox-Patterns
- **[Navigation Components](./ui-components.md#navigation)** — Header, Footer, Breadcrumbs

#### Feature Components

- **[Image Enhancer UI](./imag-enhancer-ui.md)** — Spezifische UI-Komponenten für AI Image Enhancer
- **[Auth Components](./auth-components.md)** — Login/Registration-Forms und Flows
- **[Dashboard Components](./dashboard-components.md)** — User Dashboard und Cards

## Animations

### Animation Systems

- **[AOS Integration](./animation-system.md#aos)** — Animate on Scroll für Content-Animationen
- **[Header Scroll](./animation-system.md#header)** — Header-Verhalten bei Scroll
- **[Lottie Icons](./animation-system.md#lottie)** — Animierte Icons und Micro-Interactions

### Feature Upgrades

- **[Image Enhancer UI Upgrade](./imag-enhancer-ui-upgrade.md)** — UI-Verbesserungen und neue Features
- **[Landing Page Animations](./landing-page-animations.md)** — Hero- und Feature-Animationen

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

- [TODO] Vollständige Storybook-Dokumentation für alle Komponenten
- [TODO] Design-System-Token-Automation
- [TODO] Performance-Metriken für Frontend-Assets

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
