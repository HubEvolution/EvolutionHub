# Card-Komponenten in Evolution Hub

## Überblick

Evolution Hub verwendet zwei verschiedene Card-Komponenten-Implementierungen, um sowohl in Astro- als auch in React-Kontexten eine konsistente UI zu gewährleisten:

1. `Card.astro` - Für Verwendung in Astro-Komponenten und -Seiten
2. `CardReact.jsx` - Für Verwendung in React-Komponenten

Diese Trennung ist notwendig, da Astro-Komponenten nicht direkt in React-Komponenten verwendet werden können.

## Verwendungsrichtlinien

### Card.astro

```astro
---
// Import
import Card from '@/components/ui/Card.astro';
---

<!-- Korrekte Verwendung in Astro-Dateien -->
<Card>
  <h2>Titel</h2>
  <p>Inhalt</p>
</Card>
```

**Wichtig:** `Card.astro` darf nur in folgenden Kontexten verwendet werden:
- Direkt in Astro-Komponenten (`.astro`-Dateien)
- Als statisches Element (nicht in Schleifen oder als Funktionsaufruf)

**Bekannte Probleme:**
- Verwendung von `Card.astro` innerhalb von `.map()`-Funktionen kann zu `InvalidComponentArgs`-Fehlern führen
- Verwendung in React-Komponenten führt zu `InvalidComponentArgs`-Fehlern

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

### InvalidComponentArgs-Fehler

Wenn der Fehler `InvalidComponentArgs: Invalid arguments passed to <Card> component` auftritt:

1. Prüfen Sie, ob `Card.astro` in einer React-Komponente verwendet wird
2. Ersetzen Sie `Card.astro`-Importe in React-Komponenten durch `CardReact.jsx`
3. Prüfen Sie, ob `Card.astro` in einem `.map()`-Aufruf oder als Funktionsaufruf verwendet wird
4. Bei komplexen Verschachtelungen kann es helfen, die Komponente durch ein einfaches `<div>` zu ersetzen

## Architektur-Entscheidung

Die Verwendung von zwei separaten Card-Komponenten ist ein bewusstes Architektur-Pattern, das die Hybrid-Natur des Projekts (Astro + React) widerspiegelt. Langfristig sollte eine der folgenden Strategien in Betracht gezogen werden:

1. **Vereinheitlichung:** Eine gemeinsame Basis-Komponente entwickeln, die sowohl in Astro als auch React funktioniert
2. **Klare Trennung:** Die UI-Bibliothek vollständig in React implementieren und Astro nur für das Routing und Layout verwenden
3. **Astro-Islands:** Die React-Komponenten als Astro-Islands einbinden und die direkte Verwendung von React-Komponenten minimieren

Die aktuelle Lösung mit zwei parallelen Implementierungen ist ein pragmatischer Kompromiss, der die Entwicklung ermöglicht, während langfristige Architektur-Entscheidungen getroffen werden.
