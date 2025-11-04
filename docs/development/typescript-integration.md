---
description: 'TypeScript-Integration – Konfiguration, Best Practices und Build-Prozess'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-03'
codeRefs: 'tsconfig.json, src/**/*.ts, docs/development/typescript-integration.md'
---

<!-- markdownlint-disable MD051 -->

# TypeScript-Integration im Evolution Hub

Diese Dokumentation beschreibt die TypeScript-Integration im Evolution Hub Projekt, einschließlich Best Practices, Konfiguration und Build-Prozess.

## Inhaltsverzeichnis

- Übersicht
- TypeScript-Konfiguration
- Best Practices
- Build-Prozess
- Troubleshooting

---

## Übersicht {#overview}

Das Evolution Hub Projekt verwendet TypeScript für alle clientseitigen Skripte, um Typsicherheit, bessere Entwicklererfahrung und zuverlässigeren Code zu gewährleisten. Alle JavaScript-Dateien wurden in TypeScript-Dateien umgewandelt, und neue Funktionalitäten sollten ausschließlich in TypeScript implementiert werden.

### Vorteile der TypeScript-Integration

- **Typsicherheit**: Frühzeitige Erkennung von Fehlern während der Entwicklung

- **Bessere IDE-Unterstützung**: Automatische Vervollständigung, Refactoring und Navigation

- **Verbesserte Wartbarkeit**: Selbstdokumentierender Code durch Typdefinitionen

- **Moderne JavaScript-Features**: Zugriff auf neueste ECMAScript-Features mit Abwärtskompatibilität

---

## TypeScript-Konfiguration {#ts-config}

Die TypeScript-Konfiguration wird in der `tsconfig.json`-Datei im Wurzelverzeichnis des Projekts definiert.

### Wichtige Konfigurationsoptionen

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "public/scripts/**/*.ts"],
  "exclude": ["node_modules"]
}

```text

### Wichtige Einstellungen

- **esModuleInterop**: Ermöglicht die Interoperabilität zwischen CommonJS- und ES-Modulen

- **allowSyntheticDefaultImports**: Erlaubt Imports von Modulen ohne Default-Export

- **strict**: Aktiviert alle strikten Typ-Prüfungen

---

## Best Practices {#ts-best-practices}

### 1. Datei- und Codeorganisation

- Alle TypeScript-Dateien haben die Erweiterung `.ts`

- React-Komponenten mit JSX haben die Erweiterung `.tsx`

- Verwende aussagekräftige Dateinamen, die den Inhalt beschreiben

- Organisiere Code in logische Module und Verzeichnisse

### 2. Typisierung

- Verwende explizite Typen für Funktionsparameter und Rückgabewerte

- Nutze Interfaces für komplexe Datenstrukturen

- Vermeide `any` wo möglich, verwende stattdessen `unknown` für unbekannte Typen

- Nutze Generics für wiederverwendbare Typdefinitionen

### 3. Import/Export

- Bevorzuge ES6-Module-Syntax (`import`/`export`)

- Für CommonJS-Module (wie `toastr`) verwende die Syntax `import moduleName = require('module-name')`

- Vermeide Default-Exports, bevorzuge benannte Exports für bessere Refaktorierbarkeit

### 4. DOM-Manipulation

- Verwende Typ-Assertions (`as HTMLElement`) nur wenn nötig

- Prüfe immer auf Existenz von DOM-Elementen vor der Manipulation

- Verwende TypeScript-Event-Typen für Event-Handler

### 5. Build-Artefakte

- Generierte JavaScript-Dateien (`.js`) werden nicht im Repository gespeichert

- Die `.gitignore`-Datei enthält den Eintrag `public/scripts/**/*.js` um generierte JavaScript-Dateien auszuschließen

- JavaScript-Dateien werden während des Build-Prozesses generiert

---

## Build-Prozess {#ts-build-process}

Der Build-Prozess für TypeScript-Dateien ist in den allgemeinen Build-Prozess des Projekts integriert.

### Manuelle Kompilierung

Für die manuelle Kompilierung einzelner TypeScript-Dateien:

```bash
npx tsc path/to/file.ts --outDir path/to/output --esModuleInterop
```

### Automatisierter Build

Der automatisierte Build-Prozess wird durch npm-Skripte gesteuert:

```bash

# Entwicklungs-Build mit Watch-Modus

npm run build:watch

# Produktions-Build

npm run build

```text

### TypeScript-Kompilierung im CI/CD-Prozess

Im CI/CD-Prozess werden TypeScript-Dateien automatisch kompiliert. Die generierten JavaScript-Dateien werden für das Deployment verwendet, aber nicht ins Repository eingecheckt.

---

## Troubleshooting {#ts-troubleshooting}

### Häufige Fehler und Lösungen

#### 1. Property 'X' does not exist on type 'Element'

**Problem**: TypeScript erkennt nicht, dass ein DOM-Element eine bestimmte Methode oder Eigenschaft hat.

**Lösung**: Verwende eine Typ-Assertion, um den Typ zu spezifizieren:

```typescript
// Falsch
document.getElementById('element').focus();

// Richtig
(document.getElementById('element') as HTMLElement).focus();
```

#### 2. Cannot find name 'X'

**Problem**: Eine Variable oder Funktion ist außerhalb des aktuellen Scopes.

**Lösung**: Stelle sicher, dass die Variable im richtigen Scope definiert ist oder verwende Closures:

```typescript
// Falsch
const handler = (e) => { /* ... */ };
elements.forEach(el => el.addEventListener('click', handler));
// Später im Code
elements.forEach(el => el.removeEventListener('click', handler)); // Kann fehlschlagen

// Richtig
const handlers = new Map();
elements.forEach(el => {
  const handler = (e) => { /* ... */ };
  handlers.set(el, handler);
  el.addEventListener('click', handler);
});
// Später im Code
elements.forEach(el => {
  const handler = handlers.get(el);
  if (handler) el.removeEventListener('click', handler);
});

```text

#### 3. Module not found

**Problem**: TypeScript kann ein importiertes Modul nicht finden.

**Lösung**: Überprüfe die Import-Pfade und stelle sicher, dass die Modul-Auflösung korrekt konfiguriert ist. Für CommonJS-Module verwende die Syntax `import moduleName = require('module-name')`.

---

## Weitere Ressourcen

- [TypeScript-Dokumentation](https://www.typescriptlang.org/docs/)

- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

- [TypeScript-Styleguide](https://google.github.io/styleguide/tsguide.html)

```text
