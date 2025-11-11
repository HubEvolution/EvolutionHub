---
description: 'Coverage-Roadmap zu 95% – Phasenplan für Tests & CI'
owner: 'Testing & CI Team'
priority: 'high'
lastSync: '2025-11-04'
codeRefs: 'vitest.config.ts, .github/workflows/unit-tests.yml, docs/testing/coverage-roadmap-to-95.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Coverage-Roadmap zu 95% – Strategischer Plan

## Einleitung

Basierend auf der Baseline-Coverage-Messung (konfiguriert in [`vitest.config.ts`](../../vitest.config.ts)) liegt die aktuelle Code-Abdeckung bei:

- Statements: 2.71%

- Branches: 68.29%

- Functions: 50.61%

- Lines: 2.71%

Signifikante Lücken existieren in kritischen Bereichen wie AI-Services, UI-Komponenten und Hilfsfunktionen. Das Ziel ist eine umfassende Abdeckung von 95% für alle Metriken, um die Projektregeln (>70%) zu übertreffen und Robustheit zu gewährleisten. Das Projekt nutzt Vitest für Unit- und Integrationstests, Playwright für E2E-Tests sowie CI-Integration via GitHub Actions ([`../../.github/workflows/e2e-tests.yml`](../../.github/workflows/e2e-tests.yml)).

Dieser Plan priorisiert Lücken nach Risiko, definiert phasierte Schritte, Ressourcen und Metriken. Die Umsetzung erfolgt iterativ, mit regelmäßigen Coverage-Runs zur Fortschrittsmessung.

## Priorisierung der Lücken

Die Lücken werden nach Risiko gruppiert:

- **Hoch (kritisch: Sicherheit, Core-Funktionen; hoher Impact bei Fehlern)**: AI-Services und API-Routen. Diese Bereiche handhaben sensible Daten (z.B. AI-Jobs, Bildgenerierung) und sind anfällig für Sicherheitslücken. Geschätzter Aufwand: 40-60 Stunden (komplexe Mocks für Cloudflare-Bindings). Betroffene Dateien/Verzeichnisse:

  - `src/lib/services/ai-image-service.ts` (0%)

  - `src/lib/services/ai-jobs-service.ts` (0%)

  - `src/pages/api/ai-image/jobs/[id].ts` (0%)

  - `src/pages/api/dashboard/*` (0%)

  - `src/lib/auth-v2.ts` (0%)
  Potenzielles Delta: +30-40% Coverage durch Unit/Integrationstests.

- **Mittel (mittlere Kritikalität: UI-Interaktionen; Benutzererfahrung)**: UI-Komponenten, die interaktive Features umsetzen. Weniger sicherheitskritisch, aber essenziell für Funktionalität. Geschätzter Aufwand: 20-40 Stunden (E2E-Tests mit Playwright). Betroffene Dateien/Verzeichnisse:

  - `src/components/tools/imag-enhancer/*` (0%)

  - `src/pages/r2/*` (0%)
  Potenzielles Delta: +20-30% Coverage.

- **Niedrig (niedriges Risiko: Hilfsfunktionen; intern, wiederverwendbar)**: Utility- und Hilfsdateien. Geringer Impact, aber notwendig für Vollständigkeit. Geschätzter Aufwand: 10-20 Stunden (einfache Unit-Tests). Betroffene Dateien/Verzeichnisse:

  - `src/lib/db/helpers.ts` (0%)
  Potenzielles Delta: +10-15% Coverage.

Priorisierung basiert auf Kritikalität (Sicherheit/Core > UI > Utilities) und Aufwand (komplexe Dependencies zuerst angehen, um Reuse zu ermöglichen).

## Schritt-für-Schritt-Roadmap

Der Plan ist in 5 Phasen unterteilt, mit kumulativen Zielen (von aktuell ~30% Durchschnitt zu 95%). Jede Phase umfasst spezifische Tests, Meilensteine und CI-Anpassungen. Gesamtaufwand: ~100-150 Stunden, verteilt über 4-6 Wochen (bei 20h/Woche).

### Phase 1: Hochrisiko – AI-Services und API-Routen (Woche 1-2)

- **Ziel**: +25% Coverage (Ziel: Statements/Functions >30%). Fokus auf Core-Logik (z.B. Job-Handling, Auth-Integration).

- **Spezifische Test-Cases**:

  - Für `src/lib/services/ai-image-service.ts`: 5-10 Unit/Integration-Tests, z.B. generateImage() mit gültigen/ungültigen Prompts, uploadToR2() für erfolgreichen/ fehlgeschlagenen Upload, error-Handling für API-Fehler (z.B. Rate-Limits), Validierung von Bild-Parametern, Integration mit Drizzle für Job-Speicherung.

  - Für `src/lib/services/ai-jobs-service.ts`: 5-8 Tests, z.B. createJob(), getJobById(), updateJobStatus(), cancelJob(), error-Handling bei ungültigen IDs, Integration mit KV für Status-Tracking.

  - Für `src/pages/api/ai-image/jobs/[id].ts`: 6-10 Tests, z.B. GET für Job-Status, POST für Job-Updates, Auth-Validierung, Error-Responses bei nicht existierenden IDs, Rate-Limiting-Tests.

  - Für `src/pages/api/dashboard/*`: 8-12 Tests pro Route, z.B. fetchDashboardData() mit/ohne Auth, Error-Handling für DB-Fehler, Integration mit auth-v2 für User-Rechte.

  - Für `src/lib/auth-v2.ts`: 7-10 Tests, z.B. validateSession(), generateToken(), refreshAuth(), Error-Handling für abgelaufene Tokens, Integration mit KV/D1.

- **Benötigte Ressourcen**:

  - Mocks: vi.mock für Drizzle/R2/KV-Bindings, MSW für Hono-Requests und externe AI-APIs.

  - Neue Test-Dateien: z.B. `test-suite-v2/src/unit/services/ai-image-service.test.ts`, `test-suite-v2/src/integration/api/ai-jobs.test.ts`.

  - Dependencies: vi.mock('@cloudflare/workers-types'), @mswjs/interceptors für API-Mocking, vitest-mocks für Cloudflare-Env.

- **Geschätzte Tests und Aufwand**:

  - Gesamt: 20-30 Unit-Tests, 10 Integration-Tests, 5 E2E-Tests.

  - Aufwand pro Datei: 8-10h für ai-image-service.ts (komplexe Mocks), 6-8h für ai-jobs-service.ts, 7-9h für API-Routen, 10-12h für Dashboard (mehrere Dateien), 5-7h für auth-v2.ts.

  - Gesamtaufwand Phase 1: 40-50 Stunden.

- **Abhängigkeiten/Sequenz**:

  1. Mocks und Test-Setup konfigurieren (z.B. globale vi.mock in vitest.config.ts).
  1. Unit-Tests implementieren (isolierte Funktionen).
  1. Integration-Tests (mit Wrangler-Dev-Server für echte Bindings).
  1. E2E-Tests (Playwright gegen TEST_BASE_URL).
  1. CI-Anpassung (Threshold 30% in vitest.config.ts).

- **Schritte**:

  1. Unit-Tests für Services (z.B. `ai-image-service.ts`: Mock Cloudflare R2/D1, testen von generate/upload-Funktionen).
  1. Integrationstests für APIs (z.B. `ai-image/jobs/[id].ts`: Vitest mit Hono-Mocks, simulierte Requests).
  1. E2E-Tests für kritische Flows (Playwright: AI-Job-Submission).

- **Test-Typen**: 70% Unit, 20% Integration, 10% E2E.

- **CI-Integration**: Threshold in `vitest.config.ts` auf 30% anheben; automatisierte Runs in neuem Workflow `.github/workflows/unit-tests.yml` hinzufügen, der Unit- und Integration-Tests ausführt, Coverage-Reports generiert und bei <30% failt. Phase 1 fließt in CI durch parallele Jobs: unit-tests.yml für schnelle Feedback-Loops, integriert mit e2e-tests.yml für End-to-End-Validierung.

- **Meilenstein**: Coverage-Report generieren und Delta tracken (>20% Steigerung in AI-Dateien).

### Phase 2: Hochrisiko – Auth und Dashboard-APIs (Woche 2-3)

- **Ziel**: +20% Coverage (Ziel: Branches/Lines >50%). Fokus auf Auth und Dashboard-APIs, integrierend offene Lücken aus Phase 1 (Vollständige Dashboard-API-Coverage in src/pages/api/dashboard/*, E2E gegen ci.hub-evolution.com). Abweichung: Rate-Limiting extern in rate-limiter.ts implementiert.

- **Spezifische Test-Cases**:

  - 10-15 Unit-Tests für auth-v2.ts (validateSession(), createSession(), invalidateSession(), Session-Handling mit KV, Error-Handling für abgelaufene Tokens, Integration mit KV/D1).

  - 5-8 Unit-Tests für rate-limiter.ts (createRateLimiter(), IP-Keys-Generierung, Mock KV für TTL und Hit-Tracking, Edge-Cases wie Reset).

  - 6-10 Integration-Tests für api-middleware.ts (Rate-Limit-Tests: Mehrfache Requests mit 429-Responses, Integration mit auth-Routen, Mock KV für Limits).

  - 8 Integration-Tests für Dashboard-Routen (Mocks für KV/Sessions, z.B. fetchDashboardData() mit/ohne Auth, Error-Handling für DB-Fehler, Integration mit auth-v2 für User-Rechte, perform-action.ts mit verschiedenen User-Rollen).

  - 7-10 E2E-Tests (Dashboard-Navigation, API-Calls gegen ci.hub-evolution.com, Flows: Dashboard-Zugriff mit gültiger/invalider Auth, Auth-Error-Handling, Notifications- und Projects-Panel-Interaktionen, Rate-Limit-Simulation).

- **Benötigte Ressourcen**:

  - Erweiterte Mocks (MSW für Dashboard-Endpoints, vi.mock für KV/Sessions und externe APIs, speziell für Rate-Limiting mit Mock KV).

  - Neue Dateien: test-suite-v2/src/unit/security/rate-limiter.test.ts, test-suite-v2/src/integration/api/api-middleware.test.ts, test-suite-v2/src/integration/api/dashboard.test.ts, test-suite-v2/src/e2e/dashboard-flow.spec.ts.

  - Dependencies: @mswjs/interceptors für API-Mocking, Playwright mit BASE_URL=ci.hub-evolution.com für E2E.

- **Geschätzte Tests und Aufwand**:

  - Gesamt: 30-40 Unit-Tests, 14-18 Integration-Tests, 7-10 E2E-Tests.

  - Aufwand: +5-10h für Rate-Limiting-Tests und Abweichungen (gesamt 35-50h); Sequenz: Unit zuerst (15h), dann Integration (15h), E2E mit realer URL (10-15h).

- **Abhängigkeiten/Sequenz**:

  1. Unit-Tests für auth-v2.ts, rate-limiter.ts und Dashboard-Handler.
  1. Integration-Tests mit Mocks für KV/Sessions und Rate-Limiting.
  1. E2E-Tests gegen ci.hub-evolution.com (Playwright mit BASE_URL).

- **Schritte**:

  1. Integriere Tests für dashboard/* und rate-limiter.ts (Unit/Integration: API-Handler, Auth-Integration mit Middleware und Rate-Limiting).
  1. E2E gegen ci.hub-evolution.com (Playwright mit BASE_URL, Flows: Dashboard-Zugriff, Auth-Error-Handling, Rate-Limit-Überprüfung).

- **Test-Typen**: 55% Unit, 30% Integration, 15% E2E.

- **CI-Integration**: Threshold auf 50% anheben; unit-tests.yml erweitern um Rate-Limiting- und Middleware-Tests sowie E2E gegen ci.hub-evolution.com (parallele Jobs für Unit/Integration und E2E, Coverage-Reports mit Threshold-Check).

- **Meilenstein**: Alle API-Routen >80% abgedeckt, inklusive Dashboard-Lücken und Rate-Limiting; E2E-Tests laufen grün gegen ci.hub-evolution.com.

### Phase 3: Mittleres Risiko – UI-Komponenten (Woche 3-4)

- **Ziel**: +20% Coverage (Ziel: Functions >70%). Fokus auf Interaktivität (z.B. Image-Enhancer).

- **Schritte**:

  1. Unit-Tests für Hooks/Komponenten (z.B. `useValidation.ts` in imag-enhancer: Vitest mit React-Testing-Library).
  1. Integrationstests für R2-Uploads (Mock Storage).
  1. E2E-Tests für Tool-Flows (Playwright: Bild-Upload und Enhancement).

- **Test-Typen**: 40% Unit, 30% Integration, 30% E2E.

- **CI-Integration**: Threshold auf 70%; Visual-Regression-Tests in Playwright hinzufügen.

- **Meilenstein**: UI-Verzeichnisse >90% abgedeckt.

### Phase 4: Niedriges Risiko – Hilfsfunktionen und Refinements (Woche 4-5)

- **Ziel**: +15% Coverage (Ziel: Alle Metriken >85%). Abschluss der Utilities.

- **Schritte**:

  1. Unit-Tests für `db/helpers.ts` (Mock Drizzle-Queries).
  1. Refactoring bestehender Tests für bessere Branch-Coverage.
  1. Vollständige E2E-Suite für Cross-Features (z.B. Auth + AI).

- **Test-Typen**: 80% Unit, 10% Integration, 10% E2E.

- **CI-Integration**: Threshold auf 85%; `astro check` und Coverage in jeden PR.

- **Meilenstein**: Keine 0%-Dateien mehr.

### Phase 5: Finalisierung und Optimierung (Woche 5-6)

- **Ziel**: +5% Coverage (Ziel: 95% für alle). Polishing und Maintenance.

- **Schritte**:

  1. Code-Review aller neuen Tests.
  1. Accessibility- und Mobile-Tests (WCAG 2.1 AA via Playwright).
  1. CI-Threshold auf 95% setzen; automatisierte Smoke-Tests post-Deploy.

- **Test-Typen**: 50% E2E, 50% Refinements.

- **CI-Integration**: Vollständige Pipeline (Unit + E2E + Coverage); Fail bei <95%.

- **Meilenstein**: Grüner CI-Status bei 95%.

```mermaid
flowchart TD
    A[Start: Aktuelle Coverage ~30%] --> B[Phase 1: Hochrisiko AI/APIs +25%]
    B --> C[Phase 2: Auth/Dashboard +20%]
    C --> D[Phase 3: UI-Komponenten +20%]
    D --> E[Phase 4: Utilities +15%]
    E --> F[Phase 5: Optimierung +5%]
    F --> G[Ende: 95% Coverage]
    style A fill:#ff9999
    style G fill:#99ff99

```text

## Ressourcen und Best Practices

- **Mocking**:

  - Für DB/Cloudflare-Bindings (D1, KV, R2): `vi.mock` in Vitest oder MSW für API-Mocks. Beispiel: Mock Drizzle-ORM-Queries mit In-Memory-DB. Vermeide übermäßigen Mocking – priorisiere echte Bindings in Integrationstests via Wrangler.

  - Externe Services (z.B. AI-APIs): Fake-Responses mit `nock` oder Vitest-Mocks.

- **Tools**:

  - Vitest: Für Unit/Integration ( `--coverage` für Reports in `reports/coverage/`).

  - Playwright: E2E gegen `TEST_BASE_URL` (Cloudflare-Dev); integriere Accessibility-Checks.

  - CI: Erweitere `.github/workflows/` um Coverage-Thresholds (z.B. via `vitest --coverage --min-coverage 95`).

- **Messung**: Regelmäßige Runs mit `vitest run --coverage` (wöchentlich); generiere LCOV-Reports und vergleiche Deltas. Nutze `c8` oder Vitest-Plugins für detaillierte Branch-Coverage. Best Practice: Tests modular halten (<50 Zeilen pro Test), TSDoc für Dokumentation.

## Risiken und Metriken

- **Fortschrittstracking**:

  - Metriken: Delta pro Phase (z.B. +X% Statements); wöchentliche Reports in `reports/coverage/`. Tools: Vitest-Coverage-JSON parsen für Dashboards.

  - Erfolgsindikatoren: Grüner CI-Status; keine offenen 0%-Lücken; >95% in kritischen Pfaden.

- **Potenzielle Fallstricke**:

  - Übermäßiger Mocking: Führt zu falscher Sicherheit – balanciere mit realen Integrationstests (Risiko: 20% Zeitverlust).

  - Flaky Tests: Aufgrund asynchroner Cloudflare-Bindings – fixen mit Retries in Playwright.

  - Aufwand-Überraschungen: Komplexe Branches in APIs (Risiko: +20% Zeit); mitigieren durch Prototyping.

  - Abhängigkeiten: Updates von Vitest/Playwright könnten Coverage-Metriken beeinflussen – regelmäßige Audits.

Dieser Plan ist iterativ und anpassbar. Nach jeder Phase Coverage neu messen und anpassen.

```text
