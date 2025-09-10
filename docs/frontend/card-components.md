# Card-Komponenten in Evolution Hub

## Überblick

Evolution Hub verwendet aktuell:

1. Spezialisierte Astro-Karten (z. B. `BlogCard.astro`, `dashboard/StatsCard.astro`, `tools/ToolCard.astro`)
2. `CardReact.jsx` für React-Komponenten

Hinweis: Es gibt derzeit KEINE generische `Card.astro`-Basiskomponente. Die Astro-Seiten nutzen spezialisierte Karten, während interaktive React-Teile `CardReact.jsx` verwenden. Diese Trennung ist notwendig, da Astro-Komponenten nicht direkt in React-Komponenten verwendet werden können.

## Verwendungsrichtlinien

### Spezialisierte Astro-Karten

Verwende die jeweils passende spezialisierte Karte in Astro:

```astro
---
import BlogCard from '@/components/BlogCard.astro';
import StatsCard from '@/components/dashboard/StatsCard.astro';
import ToolCard from '@/components/tools/ToolCard.astro';
---

<BlogCard post={post} featured={index === 0} />
<StatsCard title="Aktive Projekte" value={12} icon="project" />
<ToolCard tool={tool} />
```

Richtlinien:

- Nutze `BlogCard.astro` für Blog-Listen/-Teaser.
- Nutze `StatsCard.astro` für Kennzahlen im Dashboard.
- Nutze `ToolCard.astro` für Tool-/Kataloglisten.

### CardReact.jsx

```jsx
// Import
import CardReact from '@/components/ui/CardReact';

// Korrekte Verwendung in React-Komponenten
function MyComponent() {
  return (
    <CardReact>
      <h2>Titel</h2>
      <p>Inhalt</p>
    </CardReact>
  );
}
```

**Empfohlene Verwendung:**

- In allen React-Komponenten (`.jsx`, `.tsx`)
- In dynamischen Kontexten (innerhalb von `.map()`, bedingtem Rendering)
- Für interaktive UI-Elemente

## Fehlerbehebung

### Häufige Fehler und Migration

Wenn Fehlermeldungen im Zusammenhang mit einer nicht existierenden `Card.astro` oder `InvalidComponentArgs` auftreten:

1. Stelle sicher, dass in Astro keine generische `Card.astro` importiert wird. Ersetze sie durch die passende spezialisierte Karte (`BlogCard.astro`, `StatsCard.astro`, `ToolCard.astro`) oder verwende ein semantisches `<div>` mit passenden Utility-Klassen.
2. In React-Komponenten stets `CardReact.jsx` verwenden und keine `.astro`-Komponenten importieren.
3. In dynamischen Listen/`.map()` in React immer `CardReact.jsx` verwenden.
4. Für komplexe Verschachtelungen in Astro ggf. Layout mit `<div>`/`section` und Tailwind-Klassen aufbauen.

## Architektur-Entscheidung

Die aktuelle Aufteilung (spezialisierte Astro-Karten + `CardReact.jsx`) spiegelt die Hybrid-Natur des Projekts (Astro + React) wider.

Langfristige Optionen:

1. **Generische Basis in Astro (Phase 2):** Eine `Card.astro` als Basiskomponente einführen und spezialisierte Astro-Karten darauf aufbauen (Ziel: weniger Duplication, konsistentes Styling).
2. **Klare Trennung:** UI-Bibliothek vollständig in React konsolidieren und React als Inseln verwenden, wo Interaktivität nötig ist.
3. **Islands-Only für Karten:** Spezialisierte Astro-Karten beibehalten, React-Karten nur für interaktive Bereiche.

Status: Für Phase 1 wurden die Dokumente aktualisiert; es erfolgen KEINE Codeänderungen.

## Phase 2 (Backlog)

Backlog: Erwäge die Einführung einer generischen `Card.astro` und einen Refactor der spezialisierten Astro-Karten, um Duplikate zu reduzieren und Konsistenz zu erhöhen. (Ausarbeitung als ADR in Phase 2.)
