---
description: 'Komponenten- und Asset-Audit für die futuristische Landingpage'
owner: 'Frontend Team'
priority: 'low'
lastSync: '2025-11-06'
codeRefs: 'src/components/**, public/assets/**, docs/AUDIT.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Evolution Hub - Component & Asset Audit

**Datum:** 2025-10-02
**Branch:** feature/futuristic-landing-2025-10
**Zweck:** Inventar für futuristische Landingpage (Parallel-Route `/new`)

---

## 1. Wiederverwendbare Komponenten

### ✅ Navbar/Header

- **Pfad:** `src/components/Header.astro`

- **Features:** Glassmorphism, Logo, Navigation, Theme-Toggle, Language-Switcher (DE/EN)

- **Verwendung:** Kann direkt in BaseLayout wiederverwendet werden

- **Status:** Kompatibel

### ✅ Footer

- **Pfad:** `src/components/Footer.astro`

- **Features:** Glass-Footer, Quick Links, Tools, Rechtliches, Social Icons

- **Props:** `hideNewsletter`, `locale`

- **Verwendung:** Direkt wiederverwendbar via `<Footer locale="de" />`

- **Status:** Kompatibel

### ✅ Icon System

- **Pfad:** `src/components/ui/Icon.astro`

- **Features:** Heroicons + Custom SVG Support

- **Props:** `name`, `class`, `ariaLabel`

- **Verwendung:** `<Icon name="sparkles" class="w-12 h-12" />`

- **Status:** Kompatibel

### ✅ Theme Toggle

- **Pfad:** `src/components/ThemeToggle.astro`

- **Features:** Dark/Light Mode Toggle mit `class="dark"`

- **Verwendung:** Bereits in Header integriert

- **Status:** Kompatibel

### ✅ Testimonial Carousel

- **Pfad:** `src/components/TestimonialCarousel.astro`

- **Features:** Auto-rotating carousel, touch-gestures

- **Props:** `testimonials[]`, `interval`

- **Verwendung:** Falls Testimonials benötigt werden

- **Status:** Optional (nicht in initialer Version)

### ✅ Typewriter Animation

- **Pfad:** `src/components/scripts/TypewriterComponent.astro`

- **Features:** Typewriter effect, reduced-motion support

- **Props:** `elementId`, `texts[]`, `defaultDelay`

- **Verwendung:** Optional für Hero-Text

- **Status:** Optional (Neural Mesh ist Fokus)

---

## 2. Globale Styles & Utilities

### ✅ Tailwind CSS

- **Config:** `tailwind.config.js`

- **Theme:**
  - Primary: Cyan (#06B6D4)

  - Secondary: Emerald (#10B981)

  - Gray: Slate

- **Custom Utilities:**
  - `.glass` - Glassmorphism effect

  - `.glass-header` - Transparent header

  - `.glass-footer` - Blurred footer

  - `.card` - Card component

  - `.text-accent-gradient` / `.bg-accent-gradient` - Unified gradient accents basierend auf Monogramm-Farben

### ✅ Global CSS

- **Pfad:** `src/styles/global.css`

- **Features:**
  - Tailwind Layers (base, components, utilities)

  - Animations: `fadeIn`, `blobMove`, `typewriter`

  - `prefers-reduced-motion` Support

  - Dark Mode via `.dark` class

  - Custom Scrollbar

  - Focus Styles (WCAG)

### 🆕 Neue Styles (zu erstellen)

- **Pfad:** `src/styles/future-tokens.css`

- **Inhalt:**
  - CSS Custom Properties für Neon-Farben

  - `.glass-future` - Enhanced glassmorphism

  - `.text-gradient-future` - Neon gradients

  - Dark/Light Mode spezifische Tokens

  > Hinweis: Die experimentellen Button-Klassen wurden entfernt; Marketing-Buttons greifen künftig auf die gemeinsamen Button-Komponenten zurück.

---

## 3. Routing & i18n

### ✅ Routing-Schema

- **Root:** `/` → redirects zu `/de/` (Middleware)

- **Deutsch:** `/de/*`

- **Englisch:** `/en/*`

- **Locale Detection:** `src/lib/i18n.ts` + `src/lib/locale-path.ts`

### 🆕 Neue Routes (zu erstellen)

- `src/pages/new/index.astro` - DE Version (Hauptroute)

- `src/pages/en/new/index.astro` - EN Version

### ✅ i18n System

- **Translations:** `src/locales/de.json`, `src/locales/en.json`

- **Helpers:** `getI18n()`, `getI18nArray()`, `localizePath()`

- **Verwendung:** `t('pages.new.hero.title')`

---

## 4. Assets (vorhanden)

### ✅ Logos

- `public/assets/svg/evolutionhub-logo.svg` - Main Logo (Light)

- `public/assets/svg/evolutionhub-logo-dark.svg` - Dark Logo

- `public/assets/svg/logo.svg` - Alternative Logo

### ✅ Icons

- `public/assets/icons/android-chrome-192x192.svg`

- `public/assets/icons/apple-touch-icon.svg`

- `public/favicons/*` - Favicon Set

### ✅ Bilder

- `public/images/generic-avatar.svg`

- `public/images/lead-magnets/*` - Lead Magnet Assets

### ❌ Fehlende Assets (zu erstellen)

#### Tech Partner Logos (Minimalistisch)

- `public/logos/cloudflare-icon.svg` - Orange Cloud Icon

- `public/logos/github-icon.svg` - Cat Silhouette Icon

- `public/logos/stytch-icon.svg` - Shield "S" Icon

- `public/logos/stripe-icon.svg` - Wave "S" Icon

#### Before/After Placeholders

- `public/images/future/before-placeholder.jpg` - 800x600 Gray Placeholder

- `public/images/future/after-placeholder.jpg` - 800x600 Gradient Placeholder

---

## 5. Scripts & Animationen

### ✅ Bestehende Scripts

- `src/scripts/blog-post-enhancements.ts`

- `src/scripts/settings.ts`

- `src/components/scripts/HeaderScroll.astro` - Scroll Effects

- `src/components/scripts/TypewriterComponent.astro` - Typewriter

- `src/components/scripts/AOSCoordinator.astro` - AOS Integration

### 🆕 Neue Scripts (zu erstellen)

#### Neural Mesh Canvas

- **Pfad:** `src/scripts/neural-mesh.ts`

- **Features:**
  - Canvas 2D Neural Network Visualization

  - **Dark Mode:** Dunkles Netz (gray-900) + Neon-Akzente (cyan/magenta/emerald)

  - **Light Mode:** Helle Linien (white/gray-200) + Soft Gradients (pastell)

  - Responsive via ResizeObserver

  - Pausiert bei `document.hidden` oder `prefers-reduced-motion`

  - requestAnimationFrame Loop

  - Performance: nur transform/opacity, keine Layout-Shifts

#### Entrance Orchestrator

- **Pfad:** `src/scripts/orchestrate-entrance.ts`

- **Features:**
  - Web Animations API (WAAPI)

  - IntersectionObserver (threshold: 0.1)

  - Stagger-Delay via `data-stagger="100"` (ms)

  - Attributes: `data-animate`, `data-stagger`

  - Respektiert `prefers-reduced-motion` (sofort sichtbar)

  - Cleanup bei disconnect

---

## 6. Performance & Build

### ✅ Build Setup

- **Framework:** Astro 5.13 + Cloudflare Workers

- **Adapter:** `@astrojs/cloudflare` (mode: 'directory')

- **Image Service:** Sharp (webp, avif, png, jpeg)

- **CSS/JS Caching:** 1 Jahr (immutable)

### ✅ Performance Baseline

- **Animations:** Web Animations API bereits im Einsatz (AOS)

- **Intersection Observer:** Bereits verwendet

- **Dark Mode:** CSS-basiert (.dark class)

- **prefers-reduced-motion:** Global in global.css

### 🎯 Performance Targets (Neue Landingpage)

- **LCP:** < 2.5s (Mobile, Slow 4G)

- **CLS:** < 0.03 (keine Layout-Shifts durch Canvas)

- **FID/INP:** < 100ms

- **a11y:** ≥ 90 (axe-core)

- **Contrast:** WCAG AA (4.5:1 für Text)

---

## 7. Kompatibilität & Constraints

### ✅ Browser Support

- **Modern Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

- **Canvas 2D:** Universell unterstützt

- **Web Animations API:** Polyfill nicht nötig (graceful degradation)

- **IntersectionObserver:** Universell unterstützt

### ✅ Accessibility

- Canvas: `aria-hidden="true"` (rein dekorativ)

- Keyboard Navigation: Tab, Enter, Esc

- Screen Reader: Semantic HTML, ARIA Labels

- Kontrast: WCAG AA minimum (4.5:1)

### ⚠️ Constraints (CLAUDE.md)

- **Keine Secrets** im Code

- **Keine `cd`** Befehle

- **Diffs > 300 Zeilen** → Plan + Review

- **API/Schema-Änderungen** → Confirmation

- **Conventional Commits** obligatorisch

- **Tests** müssen grün sein

---

## 8. Nächste Schritte

### Phase 1: Styles & Tokens ✅

1. `src/styles/future-tokens.css` erstellen
1. CSS Custom Properties (Neon-Farben)
1. Button Styles (`.btn-neon-primary`, `.btn-glass-outline`)
1. Glassmorphism (`.glass-future`)

### Phase 2: Scripts ✅

1. `src/scripts/neural-mesh.ts` (Canvas)
1. `src/scripts/orchestrate-entrance.ts` (WAAPI + IO)

### Phase 3: Assets ✅

1. Tech Partner Logos (SVG, minimalistisch)
1. Before/After Placeholders (JPG, 800x600)

### Phase 4: Pages ✅

1. `src/pages/new/index.astro` (DE)
1. `src/pages/en/new/index.astro` (EN)

### Phase 5: QA ✅

1. Build Test (`npm run build`)
1. Lighthouse Mobile (LCP, CLS, a11y)
1. axe-core Audit
1. Manual Testing (Dark/Light, Reduced Motion)

### Phase 6: Documentation ✅

1. `docs/REPORT.md` (Performance Metrics)
1. Screenshots (DE/EN, Dark/Light)
1. PR Description (Migration Plan)

---

## 9. Risiken & Mitigations

| Risiko                                 | Wahrscheinlichkeit | Impact | Mitigation                                                      |
| -------------------------------------- | ------------------ | ------ | --------------------------------------------------------------- |
| Canvas Performance auf Low-End Devices | Medium             | Medium | requestAnimationFrame throttling, particle count limits         |
| Layout Shift durch Canvas              | Low                | High   | Position: absolute, z-index: -10, keine height/width Änderungen |
| i18n Translations fehlen               | Low                | Low    | Fallback zu bestehenden Keys, dann Manual Translation           |
| Build Errors (Astro/Cloudflare)        | Low                | High   | Inkrementelle Tests nach jedem Script                           |
| Accessibility Violations               | Medium             | Medium | Regelmäßige axe-core Checks, Kontrast-Checker                   |

---

## 10. Changelog

| Datum      | Änderung               | Author      |
| ---------- | ---------------------- | ----------- |
| 2025-10-02 | Initial Audit erstellt | Claude Code |

---

**Status:** ✅ Audit abgeschlossen
**Nächster Schritt:** Styles & Tokens erstellen (`future-tokens.css`)
