# UI-Komponenten (schlank, Utility-First)

Dieser Leitfaden dokumentiert die gemeinsamen UI-Bausteine und deren Verwendung im Projekt. Ziel ist ein konsistentes Look & Feel zwischen Image‑Enhancer und Prompt‑Enhancer – ohne zusätzliche Libraries.

## Komponenten

- **Button** (`src/components/ui/Button.tsx`)
  - Varianten: `primary`, `secondary`, `ghost`
  - Größen: `sm`, `md`
  - Inklusive Fokus‑Ringe, Disabled‑Zustände
  - Beispiel:

    ```tsx
    <Button variant="primary" size="md">Action</Button>
    <Button variant="secondary" size="sm">Secondary</Button>
    ```

- **Card** (`src/components/ui/Card.tsx`)
  - Wrapper mit `rounded-lg`, `shadow`, `bg-white dark:bg-gray-800`
  - Beispiel:

    ```tsx
    <Card className="p-6">Inhalt</Card>
    ```

- **Alert** (`src/components/ui/Alert.tsx`)
  - Varianten: `error`, `info`, `success`
  - A11y: `role="alert"`
  - Beispiel:

    ```tsx
    <Alert variant="error">Fehlermeldung</Alert>
    ```

- **UploadIcon** (`src/components/ui/icons/Upload.tsx`)
  - Kleines Inline‑SVG für Dropzonen
  - Beispiel:

    ```tsx
    <UploadIcon className="text-gray-500" />
    ```

## Prompt‑Enhancer (EnhancerForm)

- Datei: `src/components/tools/prompt-enhancer/EnhancerForm.tsx`
- Änderungen:
  - Card‑Wrapper statt Roh‑Div
  - Alerts über `Alert`
  - Dropzone mit `UploadIcon` und konsistentem Stil
  - Modus‑Toggle (`Creative/Professional/Concise`) als segmentierte Buttons mit `Button` (primary/secondary) und `aria-pressed`
  - `accept`‑Hint für Dateiauswahl ist gesetzt; Validierung bleibt serverseitig/Client‑Logik

### i18n‑Keys (Prompt‑Enhancer)

- `pages.tools.prompt-enhancer.form.files.urlImportLabel`
- `pages.tools.prompt-enhancer.form.files.urlImportPlaceholder`
- `common.loading`
- `common.import`

Hinweis: Die Komponente `EnhancerForm.tsx` nutzt diese Keys direkt über `getI18n()`. Fallback‑Strings wurden entfernt, nachdem die Keys in `src/locales/en.json` und `src/locales/de.json` ergänzt wurden.

## Tailwind‑Theme

- Datei: `tailwind.config.js`
- Tokens:
  - `colors.primary` (Blau), `colors.secondary`, `colors.gray` (slate)
  - `boxShadow.glass`
- Philosophie: Utility‑First bleibt. Tokens sind minimal und dienen als Leitplanken.

## A11y & Dark‑Mode

- Alerts haben `role="alert"`
- Fokus‑Ringe mittels `focus:ring-2 focus:ring-blue-500`
- Dark‑Mode über `dark:`‑Klassen (gleiche Muster wie im Image‑Enhancer)

## Tests

- Setup: `src/setupTests.ts` nutzt `@testing-library/jest-dom/vitest` und `cleanup()` nach jedem Test.
- Prompt‑Enhancer:
  - Unit/Integration (inkl. PDF) grün.
- Image‑Enhancer:
  - Gezielte Specs (`ModelControls`, `useCompareInteractions`) grün; Cleanup vermeidet doppelte Knoten.

## Richtlinien

- **Keine Logik in UI‑Atomen** – nur Darstellung/Markup.
- **Utility‑First** – Tailwind‑Klassen bewusst einsetzen; Tokens nur sparsam.
- **A11y zuerst** – Rollen, Labels, Fokus, Dark‑Mode immer berücksichtigen.

## Blog UI Konventionen (Astro)

- **Bilder in Blog-Komponenten**
  - Nutze konsequent Astros `<Image>`-Komponente in `src/components/BlogPost.astro` und `src/components/BlogCard.astro`.
  - Typisiere Frontmatter-Bilder als `ImageMetadata` (import aus `astro`) und prüfe Felder defensiv (`src`, `width`, `height`).
  - Alt-Texte strikt auf `string` normalisieren (z. B. `imageAltText`) und Captions nur rendern, wenn `typeof imageAlt === 'string'`.

- **Share-URLs**
  - Konstruiere die absolute URL mit `new URL(post.url, Astro.site?.origin || 'http://127.0.0.1:8787')`.
  - Titel vor dem Einbetten mit `encodeURIComponent(String(title))` kodieren.

- **CTA-Varianten**
  - `BlogCTA` akzeptiert Branding-Varianten: `'primary' | 'secondary' | 'subtle'` (`src/components/blog/BlogCTA.astro`).
  - `LeadMagnetCTA` erwartet Layout-Varianten: `'card' | 'inline' | 'banner'` (`src/components/blog/LeadMagnetCTA.astro`).
  - Mapping in `src/components/BlogPost.astro`: `primary → banner`, `secondary → inline`, `subtle → card` (Helper `mapLeadMagnetVariant`).
