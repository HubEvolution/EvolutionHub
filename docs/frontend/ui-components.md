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
