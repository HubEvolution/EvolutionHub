---
category: core
version: 1.0
applies_to: global
rules:
  - Schreibe Unit-Tests für alle kritischen Funktionalitäten
  - Strebe hohe Testabdeckung an (Ziel: > 70%, flexibel je nach Projekt)
  - Implementiere Integrationstests für System-Schnittstellen
  - Verwende Vitest/Jest für Unit- und Integration-Tests
  - Verwende Playwright für E2E-Tests
  - Integration/E2E-Tests gegen Cloudflare Dev-Server (Wrangler) ausführen; `TEST_BASE_URL` verwenden; lokalen Dev-Server nur starten, wenn keine URL gesetzt ist (echte Bindings)
  - Integriere `astro check` in die Pipeline für TypeScript-Validierung
  - Verwende automatisierte Tests in der CI-Pipeline
  - Führe Code-Reviews vor dem Merging durch
  - Automatisiere Bereitstellungsprozesse
  - Führe Sicherheits-Scans als Teil der Pipeline durch
  - Halte separate Umgebungen für Entwicklung, Staging und Produktion
  - Nur Merge bei grünem CI-Status
  - Implementiere E2E-Tests mit Playwright für alle User-Flows
  - Teste Accessibility (WCAG 2.1 AA) für alle interaktiven Elemente
  - Implementiere Visual-Regression-Tests für UI-Komponenten
  - Teste Mobile-Responsiveness und Touch-Interaktionen
  - CI: Sicherheits-/Vulnerability-Scans (z. B. `npm audit`/Snyk) und Dependabot/Updates regelmäßig ausrollen
  - Vitest Workspace/Projects konsistent konfigurieren; `astro check` fest in CI verankern
  - Post-Deploy: E2E-Smoketests gegen `BASE_URL` je Environment (kritische Flows)
---

### Testing & CI/CD

– Schreibe Unit-Tests für alle kritischen Funktionalitäten
– Strebe hohe Testabdeckung an (Ziel: > 70%, flexibel je nach Projekt)
– Implementiere Integrationstests für System-Schnittstellen
– Verwende Vitest/Jest für Unit- und Integration-Tests
– Verwende Playwright für E2E-Tests
– Integration/E2E-Tests gegen Cloudflare Dev-Server (Wrangler) ausführen; `TEST_BASE_URL` verwenden; lokalen Dev-Server nur starten, wenn keine URL gesetzt ist (echte Bindings)
– Integriere `astro check` in die Pipeline für TypeScript-Validierung
– Verwende automatisierte Tests in der CI-Pipeline
– Führe Code-Reviews vor dem Merging durch
– Automatisiere Bereitstellungsprozesse
– Führe Sicherheits-Scans als Teil der Pipeline durch
– Halte separate Umgebungen für Entwicklung, Staging und Produktion
– Nur Merge bei grünem CI-Status
– Implementiere E2E-Tests mit Playwright für alle User-Flows
– Teste Accessibility (WCAG 2.1 AA) für alle interaktiven Elemente
– Implementiere Visual-Regression-Tests für UI-Komponenten
– Teste Mobile-Responsiveness und Touch-Interaktionen
– CI: Sicherheits-/Vulnerability-Scans (z. B. `npm audit`/Snyk) und Dependabot/Updates regelmäßig ausrollen
– Vitest Workspace/Projects konsistent konfigurieren; `astro check` fest in CI verankern
– Post-Deploy: E2E-Smoketests gegen `BASE_URL` je Environment (kritische Flows)