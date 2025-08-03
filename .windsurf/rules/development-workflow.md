---
trigger: always_on
description: Development Workflow Rules
---

# Development Workflow Rules

## Testing
- Verwende Vitest für Unit- und Integrationstests der Auth-Module
- Implementiere 100% Testabdeckung für kritische Auth-Funktionen
- Verwende Mocks für D1-Datenbank-Tests
- Schreibe Tests vor der Implementierung (TDD)

## End-to-End Testing
- Verwende Playwright für E2E-Tests der Login-Flows
- Teste alle möglichen User-Pfade (Login, Logout, Password Reset)
- Verwende spezifische Selektoren für stabile Tests
- Implementiere visuelle Regressionstests

## Local Development
- Verwende Wrangler für lokale D1-Entwicklung
- Konfiguriere Environment-Variablen für lokale Entwicklung
- Nutze Hot-Reload-Funktionen von Astro
- Implementiere einheitliche Logging-Ausgaben

## Code Quality
- Verwende ESLint mit projektweiten Regeln
- Implementiere Prettier für Code-Formatierung
- Führe automatische Code-Reviews durch
- Verwende Git-Hooks für Pre-Commit-Checks