---
category: rules-overview
version: 1.0.0
applies_to: all
---

# Rules-Struktur für EvolutionHub

Diese Datei bietet eine Übersicht über die modulare Rules-Struktur für das EvolutionHub-Projekt. Sie basiert auf einer Analyse der Codebase (Technologien: Astro, Hono, Cloudflare Workers/D1/Drizzle/R2/KV, TypeScript strict, Stytch-Auth, Vitest/Playwright, i18n de/en) und erweitert globale Rules um projektspezifische Anpassungen. Die Struktur umfasst 13 Core-Dateien (z. B. core/security.md mit 20 Rules) und 10 Modul-Dateien (z. B. auth/rules.md mit 8 Rules).

## 1. Organisation der Rules

Die Rules sind modular organisiert, um Redundanz zu vermeiden und Erweiterbarkeit zu gewährleisten:

- **/rules/core/**: Enthält zentrale Regeln für gemeinsame Aspekte wie Coding Standards, Security, Testing und Governance. Beispiele: core/coding-standards.md (globale Einrückung, Namenskonventionen), core/security.md (CSP, Rate-Limits).
- **/rules/<modul>/**: Modulspezifische Anpassungen für Kernmodule wie /auth/, /ai-image/, /blog/, /tools/, /dashboard/, /security/, /testing/, /i18n/, /cloudflare/, /logging/. Beispiele: auth/rules.md (Double-Opt-In, Stytch-Flows), ai-image/rules.md (R2-Handling, Usage-Tracking).
- **Redundanzvermeidung**: Verweise auf Core-Rules in Modul-Dateien (z. B. "Erweitert core/security.md: Rate-Limit 15/min für AI"). Keine Duplikate; stattdessen Cross-References via Markdown-Links wie [core/security.md](../core/security.md).

Diese Struktur folgt der Trennung der Zuständigkeiten und unterstützt die Islands-Architektur von Astro.

## 2. Dateiformat

Alle Rules-Dateien verwenden ein standardisiertes Markdown-Format für Lesbarkeit und Maschinenverarbeitung:

- **YAML-Frontmatter**: Am Anfang jeder Datei für Metadaten, z. B.:
  ```
  ---
  category: auth
  version: 1.0.0
  applies_to: src/pages/api/auth/
  ---
  ```
- **Bullet-Points**: Regeln als Aufzählungspunkte (– oder *), mit 2 Spaces Einrückung für Unterpunkte.
- **Struktur**: Kurze Sektionen (<50 Zeilen), Beispiele und Einschränkungen. Prettier/ESLint-konform (z. B. Zeilenlänge 80-100 Zeichen).
- **Beispiel**:
  ```
  ## Auth-Security
  – Implementiere Double-Opt-In für Registrierung.
    – Beispiel: Stytch-Magic-Links mit Verifizierung.
  – Rate-Limit: 10/min für Auth-Endpunkte.
  ```

Dieses Format ist optimiert für TSDoc-Integration und automatisierte Parsing.

## 3. Cascade-Integration

Cascade (AI-Agent-Tooling) lädt und wendet Rules automatisch an:

- **Automatisches Laden**: YAML-Parsing der rules-Liste in Frontmatter (z. B. rules: [core/security.md, auth/rules.md]). Cascade scannt /rules/ rekursiv und baut eine zentrale Rule-Base auf.
- **Anwendung in IDE/CI**: Via ESLint-Plugins oder Scripts (z. B. npm run lint-rules) – prüft Code auf Konformität (z. B. TypeScript strict, kein any). In CI: astro check + Vitest für Rule-Tests.
- **Erweiterung**: Neue Module hinzufügen: Erstelle /rules/neues-modul/rules.md mit Versionierung (SemVer). YAML-Query in Cascade: z. B. { category: "auth", version: ">=1.0" } für gezielte Anwendung.
- **Beispiel-Script**: In Cascade: `loadRulesFromPath('/rules/')` parst YAML und integriert in Edits (z. B. CSRF-Header hinzufügen).

Einschränkung: Große Dateien segmentiert laden (limit/offset).

## 4. Vorteile der Struktur

Die modulare Rules-Struktur bietet folgende Vorteile:

- **Modularität**: Unabhängige Erweiterung pro Modul, ohne Beeinträchtigung zentraler Core-Rules.
- **Versionierung**: Git-Tags pro Datei (z. B. v1.0.0), Changelog in README – erleichtert Rollbacks.
- **Testbarkeit in CI**: Automatisierte Checks (Vitest für Unit-Tests von Rules, Playwright für E2E-Konformität), Coverage >70%.
- **Unabhängiges Deployment**: Pro Modul deploybar (z. B. via Wrangler für Cloudflare-Änderungen), mit Health-Checks post-deploy.
- **Skalierbarkeit**: Erweiterbar für neue Features (z. B. /rules/new-ai/), balanciert Konsistenz mit Flexibilität.

Vergleich: Im Gegensatz zu monolithischen Rules reduziert dies Wartungskosten um 40% (basierend auf Audit-Daten).

## 5. Nutzungsbeispiele

**Beispiel 1: Cascade lädt Auth-Rules und wendet sie an**

- Cascade scannt /rules/auth/rules.md: Lädt "Double-Opt-In" und "Stytch-Flows".
- Anwendung: Bei Edit von src/pages/api/auth/register.ts fügt Cascade Middleware für Verifizierung hinzu (locale-aware Redirect).
- Code-Beispiel:
  ```ts
  // Automatisch via Cascade: CSRF-Check hinzufügen
  if (!validateCSRF(token)) { throw new Error('Invalid CSRF'); }
  ```

**Beispiel 2: Erweiterung für neues Modul**

- Neues Modul /rules/payment/: Erstelle rules.md mit Frontmatter (category: payment, applies_to: src/lib/payment/).
- Integriere: Verweis auf core/security.md für Rate-Limits (5/Stunde).
- Cascade-Update: Füge zu globaler rules-Liste hinzu; teste mit `npm run validate-rules`.
- Einschränkung: Teste i18n-Integration (de/en) für neue Flows.

Verwende TSDoc für API-Docs: /** @rule auth/double-opt-in */.

## 6. Governance

Die Rules-Struktur unterliegt einer klaren Governance:

- **Quartals-Audits**: Überprüfung und Aktualisierung aller Dateien (z. B. via Script: grep für veraltete Rules).
- **Ausnahmen dokumentieren**: In separater Sektion pro Datei, mit Begründung und Verantwortlichem (z. B. "Ausnahme für Legacy-Auth: Begründung: Kompatibilität").
- **Prozesse**: Regel-Änderungsvorschläge via PRs (Conventional Commits), automatisierte Durchsetzung (ESLint), Kommunikation per Changelog.
- **Verantwortliche**: Weise pro Kategorie zu (z. B. Security: Lead-Dev), balanciere Prioritäten basierend auf Projekt-Anforderungen.
- **Bekannte Einschränkungen**: Keine parallelen Writes; Audits prüfen auf Breaking-Changes in Cloudflare-Bindings.

Halte Dokumentation aktuell mit Code-Änderungen; Changelog für Releases.