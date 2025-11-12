---
status: active
date: '2023-10-25'
supersededBy: ''
description: 'ADR zur Astro-basierten Frontend-Architektur (Hybrid Rendering, React Islands, Tailwind).'
owner: 'team:architecture'
priority: 'medium'
lastSync: '2025-11-11'
codeRefs: 'astro.config.mjs, src/layouts/BaseLayout.astro, package.json'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# ADR 0003: Astro-basierte Frontend-Architektur

## Status

Angenommen

## Datum

2023-10-25

## Kontext

Evolution Hub benötigt eine moderne, performante und entwicklerfreundliche Frontend-Architektur. Wir müssen ein Framework wählen, das:

1. Exzellente Performance und SEO-Eigenschaften bietet
1. Flexible Rendering-Strategien unterstützt
1. Mit unserer Cloudflare-Infrastruktur kompatibel ist
1. Eine gute Entwicklererfahrung bietet
1. Zukunftssicher und gut unterstützt ist

## Entscheidung

Wir haben uns für Astro als primäres Frontend-Framework entschieden, mit folgender Konfiguration:

1. **Rendering-Strategie**: Hybrid-Rendering mit statischen Seiten und dynamischen Inseln
1. **UI-Komponenten**: React für interaktive Komponenten
1. **Styling**: Tailwind CSS für Styling und Design-System
1. **Routing**: Astro's dateibasiertes Routing
1. **API-Integration**: Astro API-Endpunkte für Backend-Kommunikation

## Begründung

### Warum Astro?

- **Performance-First**: Astro's "Zero JS by default"-Ansatz liefert extrem schnelle Ladezeiten

- **Islands-Architektur**: Ermöglicht selektive Hydration nur für interaktive Komponenten

- **Framework-Agnostik**: Unterstützt React, Vue, Svelte und andere UI-Frameworks

- **Dateibasiertes Routing**: Intuitives und einfach zu verstehendes Routing-System

- **SSG/SSR-Unterstützung**: Flexible Rendering-Strategien je nach Anforderung

- **Markdown/MDX-Integration**: Ideal für dokumentationslastige Anwendungen

- **Cloudflare-Kompatibilität**: Hervorragende Unterstützung für Cloudflare Pages

### Warum React für Inseln?

- **Ökosystem**: Umfangreiches Ökosystem an Bibliotheken und Tools

- **Teamexpertise**: Vorhandene Erfahrung im Team

- **Komponenten-Modell**: Deklaratives und kompositionelles Komponenten-Modell

- **TypeScript-Integration**: Hervorragende TypeScript-Unterstützung

### Warum Tailwind CSS?

- **Utility-First**: Schnelle Entwicklung durch Utility-Klassen

- **Performance**: Minimale CSS-Ausgabe durch Tree-Shaking

- **Konsistenz**: Einheitliches Design-System durch vordefinierte Werte

- **Responsiveness**: Einfache Implementierung responsiver Designs

- **Anpassbarkeit**: Einfache Erweiterung durch Konfiguration

## Konsequenzen

### Positive Konsequenzen

- **Verbesserte Performance**: Deutlich schnellere Ladezeiten durch minimales JavaScript

- **Bessere SEO**: Verbesserte Suchmaschinenoptimierung durch statisches Rendering

- **Entwicklungsgeschwindigkeit**: Schnellere Entwicklung durch intuitive APIs und Tools

- **Flexibilität**: Möglichkeit, verschiedene Rendering-Strategien je nach Anforderung zu wählen

- **Zukunftssicherheit**: Modernes Framework mit aktiver Entwicklung und Community

### Negative Konsequenzen

- **Lernkurve**: Neue Konzepte wie Islands-Architektur erfordern Einarbeitung

- **Ökosystem-Reife**: Astro ist neuer als etablierte Frameworks wie Next.js

- **Integration von Drittanbieter-Bibliotheken**: Kann bei einigen clientseitigen Bibliotheken komplex sein

- **Debugging-Komplexität**: Hybrides Rendering kann das Debugging erschweren

### Mitigationsstrategien

- **Schulung**: Umfassende Dokumentation und Schulung für das Entwicklungsteam

- **Komponenten-Bibliothek**: Aufbau einer internen Komponenten-Bibliothek für häufig verwendete Patterns

- **Klare Richtlinien**: Definierte Standards für die Verwendung von clientseitigem JavaScript

- **Entwicklungstools**: Nutzung von Astro-spezifischen Entwicklungstools und Erweiterungen

## Alternativen

### Next.js

- **Vorteile**: Größeres Ökosystem, mehr Beispiele und Integrationen, React-native

- **Nachteile**: Standardmäßig mehr JavaScript, komplexere Konfiguration, weniger flexibel bei Framework-Wahl

### SvelteKit

- **Vorteile**: Noch bessere Performance, weniger Boilerplate-Code, kompaktere Bundles

- **Nachteile**: Kleineres Ökosystem, weniger Entwickler mit Erfahrung, steilere Lernkurve für React-Entwickler

### Nuxt.js

- **Vorteile**: Umfassende Vue-Integration, etabliertes Framework, gute Dokumentation

- **Nachteile**: Vue statt React, weniger Flexibilität bei der Framework-Wahl, standardmäßig mehr JavaScript

## Implementierungsdetails

Die Astro-Frontend-Architektur wird wie folgt implementiert:

1. **Projektstruktur**:

   ```text
   src/
   ├── components/     # Wiederverwendbare UI-Komponenten
   │   ├── react/      # React-Komponenten für interaktive Elemente
   │   └── astro/      # Astro-Komponenten für statische Elemente
   ├── layouts/        # Seitenlayouts und Templates
   ├── pages/          # Routen und Seitenkomponenten
   │   └── api/        # API-Endpunkte
   ├── styles/         # Globale Styles und Tailwind-Konfiguration
   └── lib/            # Shared Utilities und Helpers
   ```

1. **Komponenten-Strategie**:
   - Statische UI-Elemente als Astro-Komponenten

   - Interaktive Elemente als React-Komponenten mit expliziter Hydration

   - Wiederverwendbare Komponenten in einer gemeinsamen Bibliothek

1. **Daten-Fetching**:
   - Server-seitiges Daten-Fetching in Astro-Komponenten

   - Client-seitiges Daten-Fetching in React-Komponenten für dynamische Updates

   - API-Endpunkte unter `/src/pages/api/` für Backend-Kommunikation

1. **Styling-Ansatz**:
   - Tailwind CSS für alle Styling-Bedürfnisse

   - Globale Styles für Typografie, Farben und Layout-Grundlagen

   - Komponenten-spezifische Styles durch Tailwind-Klassen

1. **Performance-Optimierungen**:
   - Selektive Hydration mit `client:idle`, `client:visible`, etc.

   - Bildoptimierung mit Astro's integrierten Bildkomponenten

   - Code-Splitting auf Routenebene

   - Prefetching für häufig besuchte Routen

## Referenzen

- [Astro Documentation](https://docs.astro.build)

- [Islands Architecture](https://jasonformat.com/islands-architecture/)

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

- [React Documentation](https://reactjs.org/docs)

- [Web Performance Best Practices](https://web.dev/performance-optimizing-content-efficiency/)
