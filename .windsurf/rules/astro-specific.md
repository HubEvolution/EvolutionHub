---
trigger: always_on
description: Astro 5.x + React 18 Specific Rules
---

# Astro-Specific Rules

## Component Organization
- Platziere alle UI-Komponenten in /src/components/
- Verwende eine flache Komponentenstruktur ohne tiefe Verschachtelung
- Benenne Komponenten mit PascalCase
- Exportiere Komponenten als default export

## API Route Structure
- Erstelle API-Routen in /src/pages/api/
- Verwende REST-konforme Endpunkte
- Implementiere eine einheitliche Response-Struktur
- Verwende TypeScript-Typen für Request/Response

## Import Aliases
- Verwende @/lib/ für alle Bibliotheks-Imports
- Verwende @/components/ für Komponenten-Imports
- Vermeide relative Imports bei Komponenten und Bibliotheken
- Definiere Aliase in der astro.config.mjs

## Framework Integration
- Nutze Astro Islands-Architektur für interaktive Komponenten
- Verwende React 18 für clientseitige Interaktivität
- Minimiere clientseitiges JavaScript
- Implementiere View Transitions für SPA-ähnliches Verhalten