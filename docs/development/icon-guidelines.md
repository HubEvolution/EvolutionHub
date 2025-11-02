<!-- markdownlint-disable MD051 -->

# Icon-Nutzungsrichtlinie

Ziel: Einheitliche und barrierearme Icon-Nutzung in der UI. Emojis sind im UI‑Markup nicht erlaubt.

Geltungsbereich

- Gilt für alle UI-Komponenten und Seiten (Astro/React).

- Ausnahmen: Logs/Debug-Ausgaben und ggf. externe Inhalte (z. B. importierte Texte), sofern nicht UI-Markup.

Komponenten

- Astro-Komponente: src/components/ui/Icon.astro

- React-Komponente: src/components/ui/Icon.tsx

Accessibility (A11y)

- Semantische Icons: ariaLabel setzen (z. B. "Suchen", "Öffnen").

- Dekorative Icons: ariaLabel weglassen, Komponente setzt aria-hidden="true".

- Farbe über currentColor: per Tailwind text-... steuern.

Beispiele
Astro

```astro
---
// keine Imports notwendig bei lokalen Pfaden
---
<Icon name="rocket" class="w-5 h-5 text-emerald-500" ariaLabel="Zum Dashboard" />
<a class="inline-flex items-center gap-2">
  <Icon name="key" class="w-4 h-4" ariaLabel="Login" />
  Login
</a>

```text

React

```tsx
import Icon from '@/components/ui/Icon';

export function CTA() {
  return (
    <a className="inline-flex items-center gap-2">
      <Icon name="rocket" className="w-5 h-5 text-white" ariaLabel="Go to dashboard" />
      Go to dashboard
    </a>
  );
}
```

ToolCard Override

- ToolCard bietet einen benannten Slot "icon"; ansonsten wird iconKey übergeben und intern gerendert.

Verfügbare Icon-Namen

- celebration, rocket, chart, lightbulb, search, key, refresh, tool, palette, laptop, photo, noise, preset, batch, box, mail, gift, edit, target, book, plug, clipboard, check, bell, chat, statusDot, mouse

Richtlinien

- Keine Emojis im UI‑Markup verwenden.

- Für React className statt class verwenden.

- Farben via text-...; Größe via w-/h- Klassen.

- In Textknoten " <10ms " in JSX als <10ms schreiben (bereits im Code angepasst).

Tests/Qualität

- Lint: npm run lint. Für UI-spezifische Prüfung kann npx eslint 'src/pages/**/*.{astro,ts,tsx,jsx}' 'src/components/**/*.{ts,astro,tsx,jsx}' --ignore-pattern 'src/pages/api/**' verwendet werden.

- Build: npm run build.

Migration

- Bestehende Emojis durch Icon-Komponenten ersetzen.

- Tool-Listings iconKey statt Emoji verwenden.

- Debug/Logs bleiben unberührt.

Hinweise

- Bei neuen Icons: Icon.astro/Icon.tsx erweitern; Icons nutzen stroke/fill=currentColor, Fokus auf 24x24 ViewBox.

- In Mails (HTML) keine Komponenten verwenden; bei Bedarf Inline-SVGs einsetzen.
