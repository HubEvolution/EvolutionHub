---
description: 'Teststrategie, Coverage-Ziele, Testorganisation und Best Practices für Evolution Hub'
owner: 'QA Team'
priority: 'high'
lastSync: '2025-10-27'
codeRefs: 'vitest.config.ts, playwright.config.ts, tests/'
testRefs: 'tests/unit, tests/integration, test-suite-v2'
---

<!-- markdownlint-disable MD051 -->

# Testing Documentation

**Scope** — Diese Kategorie definiert die Teststrategie, Coverage-Ziele und Best Practices für Evolution Hub. Umfasst Unit-, Integration- und E2E-Tests sowie Testwerkzeuge (Vitest, Playwright). Zielgruppe sind QA-Ingenieure und Entwickler. Nicht enthalten: Produktionsmonitoring (→ Ops-Kategorie) oder UI/UX-Testing-Details (→ Frontend-Kategorie).

## Primärdokumente

- **[Testing Strategy](./testing-strategy.md)** — **Hauptdokument** für umfassende Teststrategie (Philosophie, Ebenen, Tools)

- **[Coverage Roadmap](./coverage-roadmap-to-95.md)** — Strategischer Plan für 95% Coverage (Baseline, Phasen, Ressourcen)

## Sekundär-/Spezialdokumente

- **[Testing Guidelines](../development/testing-guidelines.md)** — Verbindliche Praktiken (AAA-Muster, Namenskonventionen)

- **[Test Setup](./test-setup.md)** — Konfiguration von Vitest, Playwright und Test-Utilities

- **[Mocking Guidelines](./mocking-guidelines.md)** — Mocking-Strategien für Services und APIs

## Test-Strategie im Detail

### Testebenen

#### 1. Unit-Tests

Unit-Tests prüfen einzelne Funktionen, Methoden oder Klassen in Isolation.

**Fokus:**

- Geschäftslogik in Services und Utilities

- Helper-Funktionen

- Einzelne Komponenten (ohne externe Abhängigkeiten)

**Ziel-Coverage:** 60% aller Tests

#### 2. Integrationstests

Integrationstests prüfen die Interaktion zwischen verschiedenen Komponenten oder Systemen.

**Fokus:**

- API-Endpunkte

- Datenbankinteraktionen (D1 via Drizzle)

- Service-Interaktionen

- Middleware-Funktionalität

**Ziel-Coverage:** 30% aller Tests

#### 3. End-to-End Tests (E2E)

E2E-Tests prüfen das gesamte System aus Benutzerperspektive.

**Fokus:**

- Benutzerflows (Login, Registrierung, Tool-Nutzung)

- Seitennavigation

- Formularinteraktionen

- Visuelle Regression

**Ziel-Coverage:** 10% aller Tests

### Testwerkzeuge

#### Vitest

Haupttestwerkzeug für Unit- und Integrationstests.

**Konfiguration:** `vitest.config.ts`, `vitest.workspace.ts`

**Wichtige Kommandos:**

```bash
npm test                  # Watch-Modus
npm run test:once         # Einzelner Run
npm run test:coverage     # Mit Coverage-Report

```bash

#### Playwright

E2E-Testing gegen Cloudflare Wrangler Dev oder Staging.

**Konfiguration:** `tests/e2e/config/playwright.config.ts`

**Wichtige Kommandos:**

```bash
npm run test:e2e          # Alle E2E-Tests
npm run test:e2e:ui       # Mit UI-Test-Runner
export BASE_URL="..." && npm run test:e2e  # Gegen Remote-Server
```

**BASE_URL:** Steuert Ziel-Environment (`http://127.0.0.1:8787` Standard, oder `https://staging.example.com`)

#### MSW (Mock Service Worker)

API-Mocking für Tests ohne echte Backend-Aufrufe.

**Verwendung:** `test/mocks/handlers.ts` für zentrale Mock-Definitionen

## Cross-Referenzen

- **[Development](../development/)** — Testing-Guidelines und CI/CD-Integration

- **[API](../api/)** — API-Test-Beispiele und Endpunkt-Validierung

- **[Frontend](../frontend/)** — UI-Komponenten-Tests und Accessibility-Testing

- **[Security](../security/)** — Security-Tests und Penetration-Testing

## Ownership & Maintenance

**Owner:** QA Team (Lead: QA Lead)
**Update-Frequenz:** Monatlich oder bei Änderungen der Test-Tools/Konfiguration
**Review-Prozess:** Peer-Review durch QA Team + Entwickler-Feedback
**Eskalation:** Bei Test-Infrastruktur-Problemen → Tech Lead

## Standards & Konventionen

- **Test-Format:** AAA-Muster (Arrange, Act, Assert)

- **Coverage-Ziel:** Global 70%, kritische Pfade 95%

- **Test-Organisation:** Unit-Tests neben Source-Code, Integration in `tests/integration/`, E2E in `test-suite-v2/`

- **Mocking:** MSW für API-Calls, Drizzle-Mocks für DB-Interaktionen

- **Sprache:** Englisch für Test-Namen und Kommentare

## Bekannte Lücken

- [TODO] Visuelle Regressionstests für UI-Komponenten

- [TODO] Performance-Tests für API-Endpunkte

- [TODO] Accessibility-Tests (a11y) für Frontend-Komponenten

## Übersicht

Evolution Hub nutzt einen umfassenden Testing-Ansatz:

- **Testing Framework**: Vitest für Unit- und Integrationstests

- **E2E Framework**: Playwright (gegen Wrangler Dev oder Staging)

- **Coverage-Ziel**: Minimum 70% (Projektvorgabe), Langfristziel 95%

- **Test-Pyramide**: 60% Unit, 30% Integration, 10% E2E

- **CI/CD-Integration**: Automatische Tests in GitHub Actions

Siehe auch: [../development/testing-guidelines.md](../development/testing-guidelines.md) für Entwicklungs-spezifische Richtlinien

## Strategische Dokumentation

### Test Strategy & Coverage

- **[Testing Strategy](./testing-strategy.md)** — **Hauptdokument** für umfassende Teststrategie

  - Testphilosophie (TDD, Automatisierung, Pyramidenansatz)

  - Testebenen (Unit, Integration, E2E)

  - Testwerkzeuge (Vitest, Playwright, MSW)

  - Testabdeckungsziele (80% gesamt, 90% kritisch)

  - Testorganisation und CI-Integration

  - Testdaten-Management und Mocking-Strategien

  - Fehlerbehebung und Debugging

- **[Coverage Roadmap zu 95%](./coverage-roadmap-to-95.md)** — Strategischer Plan für Coverage-Verbesserung

  - Baseline-Analyse (aktuell ~30%)

  - Gap-Priorisierung (Hochrisiko: AI-Services, Mittel: UI, Niedrig: Utilities)

  - 5-Phasen-Roadmap (AI/APIs → Auth/Dashboard → UI → Utilities → Optimierung)

  - Ressourcen und Aufwandsschätzung (100-150 Stunden über 4-6 Wochen)

  - Risiken und Fortschrittstracking

  - CI-Threshold-Strategie

## Praktische Richtlinien

- **[Testing Guidelines](../development/testing-guidelines.md)** — Verbindliche Praktiken für Tests

  - AAA-Muster (Arrange, Act, Assert)

  - Namenskonventionen und Struktur

  - Cleanup und Mock-Verwaltung

  - Test-Layer-Definitionen

## Coverage-Ziele

### Aktuelle Coverage (Baseline)

- **Statements:** 2.71%

- **Branches:** 68.29%

- **Functions:** 50.61%

- **Lines:** 2.71%

### Projektregeln (Minimum)

- **Gesamt:** ≥70%

- **Kritische Module:** ≥90% (Auth, API, Security)

- **UI-Komponenten:** ≥70%

### Langfristziel (Coverage Roadmap)

- **Alle Metriken:** 95%

- **Umsetzung:** 5 Phasen über 4-6 Wochen

Siehe: [coverage-roadmap-to-95.md](./coverage-roadmap-to-95.md) für detaillierten Plan

## Testorganisation

### Verzeichnisstruktur

```text
evolution-hub/
├── src/
│   ├── components/
│   │   └── Component.test.ts       # Komponenten-Tests
│   ├── lib/
│   │   └── util.test.ts            # Utility-Tests
│   └── pages/api/
│       └── endpoint.test.ts        # API-Tests
├── test/
│   ├── setup.ts                    # Testsetup
│   └── mocks/                      # Mock-Definitionen
└── tests/
    ├── e2e/                        # E2E-Tests
    └── integration/                # Integrationstests

```text

### Benennungskonventionen

- **Unit-Tests:** `*.test.ts` oder `*.spec.ts` neben der zu testenden Datei

- **Integrationstests:** `*.test.ts` oder `*.integration.test.ts`

- **E2E-Tests:** `*.spec.ts` im Verzeichnis `tests/e2e/`

## CI/CD-Integration

Tests sind vollständig in die CI/CD-Pipeline integriert:

### GitHub Actions Workflows

- **Unit Tests:** `.github/workflows/unit-tests.yml` (Vitest)

- **E2E Tests:** `.github/workflows/e2e-tests.yml` (Playwright)

- **Coverage Gates:** Automatisches Fail bei Coverage < Threshold

### CI-Gates (alle müssen grün sein)

- Lint/Format (ESLint, Prettier)

- TypeScript-Check (`astro check`)

- Unit/Integration-Tests

- E2E-Smoke-Tests

- Security-Scan (`npm audit`)

Siehe: [../development/ci-cd.md](../development/ci-cd.md) für vollständige CI/CD-Dokumentation

## Best Practices

### Mocking-Strategien

- **Minimales Mocking:** Bevorzuge echte Integrationstests via Wrangler

- **Cloudflare-Bindings:** `vi.mock` für D1/R2/KV in Unit-Tests

- **API-Mocks:** MSW für externe API-Aufrufe

- **Test-Isolation:** `afterEach(() => vi.restoreAllMocks())`

### Test-Daten

- **Fest codierte Daten:** Für einfache Tests

- **Factories:** Für komplexe Testdaten mit Variationen (`test/factories/`)

- **Fixtures:** Für wiederverwendbare Testdaten (`test/fixtures/*.json`)

### Debugging

```bash
# Debug-Ausgabe aktivieren
DEBUG=true npm test

# Einzelnen Test ausführen
npm test -- -t "sollte X tun"

# Tests mit Breakpoints debuggen
npm run test:debug
```

## Weitere Dokumentation

- **[Development Documentation](../development/)** — CI/CD und Entwicklungs-Workflows

- **[Architecture Documentation](../architecture/)** — Systemarchitektur für Test-Szenarien

- **[API Documentation](../api/)** — API-Endpunkte für Integrationstests

## Schnellreferenzen

### Wichtige Testkommandos

```bash

# Unit & Integration Tests

npm test                  # Watch-Modus
npm run test:once         # Einzelner Run
npm run test:coverage     # Mit Coverage-Report

# E2E Tests

npm run test:e2e          # Alle E2E-Tests (lokal gegen Wrangler)
npm run test:e2e:ui       # Mit UI-Test-Runner
npm run test:e2e -- --project=chromium  # Nur Chromium

# Debugging

npm run test:debug        # Unit-Tests mit Debugger
npm run test:e2e -- --debug  # E2E-Tests mit Debugger

```text

### Test-Template (AAA-Pattern)

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('Modul XYZ', () => {
  it('sollte erwartetes Ergebnis liefern', () => {
    // Arrange (Setup)
    const input = 'test';

    // Act (Ausführung)
    const result = myFunction(input);

    // Assert (Erwartungen)
    expect(result).toBe('expected');
  });
});
```

### Coverage-Threshold (vitest.config.ts)

```typescript
coverage: {
  reporter: ['text', 'json', 'html'],
  lines: 70,
  branches: 70,
  functions: 70,
  statements: 70
}

```text

```text
