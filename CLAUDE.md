# CLAUDE.md — Globale Projektregeln, Policies & Subagents

## Zweck & Dokumenten-Beziehung

Dieses Dokument dient als **"Quick Reference" für Claude Code** (Sonnet 4.5, Pro) und enthält die wichtigsten Richtlinien für alle Änderungen in diesem Repository. 

**📋 Dokumenten-Hierarchie:**
- **[CLAUDE.md]** → Quick Reference für Claude Code (Subagents, Edit-Regeln, Bestätigungs-Gates)
- **[GLOBAL_RULES.md]** → Authoritative Technical Reference ([Pfad](cci:7://file:///Users/lucas/.codeium/windsurf/memories/global_rules.md:0:0-0:0))

**Ziel:** Konsistente Code-Qualität, sichere Änderungen und reproduzierbare Deployments.

**Letzte Aktualisierung:** 2025-10-03 (Synchronisiert mit GLOBAL_RULES.md v2025-10-01)

---

## 1) Arbeitsstil & Autonomie

- **Autonomie-Level:** „assistiert-autonom“
  Plane Schritte, führe kleine bis mittlere Änderungen selbst aus. Frage **immer** nach Bestätigung bei: API-/Schema-Änderungen, Security-relevanten Stellen, DB-Migrations, neuen Abhängigkeiten, CI/Build-Änderungen, Diffs > 300 Zeilen oder > 5 Dateien.
- **Kontextquellen (lesen bevor du änderst):** `package.json`, `tsconfig.json`, `.eslintrc*`, `.prettierrc*`, `astro.config.*`, `wrangler.toml`, `README.md`, `docs/`, `src/`, `tests/`.
- **Suchpfade:** `src/`, `tests/`, `docs/`
- **Excludes:** `dist/`, `node_modules/`, `.wrangler/`, `coverage/`, `.backups/`, `reports/`, `favicon_package/`
- **Keine Navigation:** niemals `cd`; arbeite im Repo-Root (CWD).

---

## 2) Coding Standards

- Einrückung: 2 Leerzeichen für `.astro`, `.ts`, `.tsx`, `.js`
- Benennung: `camelCase` (Variablen/Funktionen), `PascalCase` (Klassen/Komponenten)
- TypeScript: `strict`; **kein** `any`. Bevorzuge `interface` statt `type` für Objekte.
- Funktionen & Methoden: < 50 Zeilen; max. 3 Ebenen Verschachtelung.
- Zeilenlänge: 80–100 Zeichen.
- Format/Lint: Prettier & ESLint strikt anwenden.
- Architektur: Trennung der Zuständigkeiten; modular & wiederverwendbar; Komposition > Vererbung; klare Schichtgrenzen; Server/Client strikt trennen (Astro Islands).

---

## 3) Security & Compliance (hart)

- Niemals Secrets im Code speichern. Nur via ENV (`.env.local`), `.gitignore` schützt.
- CSP konfigurieren; Cookies `HttpOnly`, `Secure`, `SameSite`.
- Eingaben bereinigen; HTTPS only; regelmäßige Dependency-Updates.
- Principle of Least Privilege; Fehlerbehandlung ohne sensitive Details.
- **Registrierung:** Double-Opt-In; unverifizierte Nutzer erhalten keine Session.
- **Middleware:** unverifizierte Nutzer per Locale redirect auf `/<locale>/verify-email?email=…`; Logs redakten.

---

## 4) API, Middleware & Edge

- **API (Hono):** `{ success: boolean, data?: T, error?: { type: string; message: string; details?: unknown } }`
  Typed `APIContext`, zentrales Error-Handling, Input-Validierung per TS.
  **429:** `Retry-After` + optional `{ retryAfter: number }`. **405:** standardisiert (z. B. `createMethodNotAllowed`).
- **Security-Header:** HSTS, COOP, X-Frame-Options; CSP-Nonce für HTML.
- **Rate-Limits:** `aiGenerate: 15/min`, `auth: 10/min`, `sensitiveAction: 5/h`, `api: 30/min`.
- **Cloudflare:** D1 via Drizzle (typisiert); R2 Upload/Download mit Fehlerpfaden; KV für Sessions (TTL).
  Bundle optimieren (Tree-Shaking, Code-Splitting); Graceful-Degradation Offline/Cache.

---

## 5) Feature Flags & Rollout

- Flags standardmäßig **aus**; pro Environment aktivieren (Dev → Staging → Prod).
- Client-exponierte Flags **müssen** mit `PUBLIC_` beginnen (z. B. `PUBLIC_ENHANCER_PLAN_GATING_V1`).
- Rollout: Canary 5–10% → 50% → 100% mit Telemetrie/Monitoring.
- CI: Smoke-Tests (EN/DE) für kritische Flows.

---

## 6) Testing & CI/CD

- Unit/Integration: Vitest/Jest; Ziel-Coverage ≥ 70% (projektspezifisch).
- E2E: Playwright; zusätzlich Accessibility (WCAG 2.1 AA), Visual-Regression, Mobile-Responsiveness.
- Astro: `astro check` in CI; Integration/E2E bevorzugt gegen Cloudflare Dev (Wrangler) via `TEST_BASE_URL`.
- **CI Gates (alle müssen grün sein):** Lint/Format, TS-Check, Unit/Integration, E2E-Smoke, Security-Scan (`npm audit`/Snyk`).
- Environments: getrennt Dev/Staging/Prod; **keine** implizite Binding-Vererbung (Wrangler).
- Deploy: Health-Check; Deployment als fehlgeschlagen markieren, wenn Health-Check scheitert.

---

## 7) Observability & Logging

- Strukturierte JSON-Logs (`debug|info|warn|error`); Request-ID je Request; keine PII.
- Access-Logs: Methode, Pfad, Status, Dauer, RateLimit-Hits.
- Client-Telemetrie: PII-frei, konsistente Namespaces (z. B. `enhancer_*`).
- Stacktraces säubern.

---

## 8) Edit-Regeln (für alle Agents)

- Kleine, fokussierte Patches; Imports oben; strikte Typen; kein `any`.
- Große Dateien segmentiert lesen (`limit`/`offset`); keine Binär-/Bilddateien öffnen.
- Nur **lesende** Shell-Befehle automatisch; mutierende Befehle (Install/Migration/Push) **immer bestätigen**.
- Parallele Schreibvorgänge vermeiden; Lese-Suchen dürfen parallel laufen.

---

## 9) Commit-, Branch- & Release-Konventionen

- Branches: `feature/*`, `bugfix/*`, `hotfix/*`, `release/*`.
- **Conventional Commits:** `feat: …`, `fix: …`, `chore: …`, `refactor: …`, `test: …`, `docs: …`
- Commits fokussiert/atomar; Squash wenn sinnvoll; lineare Historie bevorzugt.
- Tags: SemVer `vMAJOR.MINOR.PATCH`.
- Changelog pflegen.

---

## 10) Doku-Pflichten

- Öffentliche APIs mit TSDoc dokumentieren; Autogen in CI.
- Architekturentscheidungen (ADR) festhalten.
- Setup/Install, Beispiele, bekannte Einschränkungen & Workarounds pflegen.

---

## 11) Governance

- Regeln quartalsweise prüfen/aktualisieren; Ausnahmen dokumentieren (mit Begründung).
- Durchsetzung automatisieren (ESLint, Prettier, CI-Gates).
- Verantwortliche je Kategorie festlegen; Änderungen transparent kommunizieren.

---

## 12) Subagents (Profile)

> **Nutzung:** Schreibe z. B. _use `Scout`_ im Prompt, um das Profil zu aktivieren.
> **Gemeinsame Defaults:** Keine Secrets anfassen; keine `cd`; Diffs > 300 Zeilen oder > 5 Dateien nur mit Plan & Review.

### A) **Scout** — Analyse & Planung

- **Ziel:** Verständnis, Impact, Änderungsplan.
- **Scope:** _read-only_ (Code, Configs, Tests, Logs).
- **Aktionen:** Lesen, Suchen, Summaries; KEINE Schreib-/Install-/Git-Befehle.
- **Output:** Liste oder Zusammenfassung (statt plan.md).
- **Gate:** Plan muss bestätigt werden.

### B) **Stylist** — Format, Lint, Hygiene

- **Ziel:** Stil-Konsistenz.
- **Scope:** Prettier, ESLint-Fixes, tote Imports.
- **Befehle:** `npm run format`, `npm run lint:fix`.
- **Beschränkung:** Keine API-/Schema-/Build-Änderungen.
- **Gate:** Auto-Commit nur wenn Tests grün.

### C) **Type-Medic** — TypeScript-Strenge

- **Ziel:** TS-Fehler beheben, Typen härten.
- **Scope:** TS-Fehler, Interfaces statt `type`, Rückgabetypen präzisieren.
- **Befehle:** `npm run typecheck`; gezielte Code-Patches.
- **Gate:** > 5 Dateien oder > 200 Zeilen Diff → Plan/Approval.

### D) **Test-Fixer** — Tests stabilisieren

- **Ziel:** Tests grün; Flakes reduzieren.
- **Scope:** Unit/Integration/E2E; Mocks.
- **Befehle:** `npm test`, `npm run test:e2e`.
- **Beschränkung:** Produktionscode nur minimal anpassen; größere Refactors → **Refactorist**.
- **Gate:** Kurzbegründung pro Fix (root cause).

### E) **Refactorist** — Struktur & Lesbarkeit

- **Ziel:** Verständlichkeit/Modularität erhöhen ohne Verhalten zu ändern.
- **Scope:** Extraktion, Aufteilung großer Dateien, bessere Benennungen.
- **Beschränkung:** Max 300 Zeilen / 5 Dateien je Lauf; keine API-Kontraktänderungen.
- **Gate:** Diff-Summary + Motivation; Tests grün.

### F) **Edge-Guardian** — Security & Middleware

- **Ziel:** CSP, Security-Header, Rate-Limits, Auth-Flows.
- **Scope:** Middleware, Headers, 429/405, Logging (PII-frei).
- **Gate:** Immer Plan + Review (Security-kritisch).

### G) **CF-Operator** — Cloudflare & Deployability

- **Ziel:** D1/R2/KV-Bindings korrekt; Bundle optimiert; Health-Checks.
- **Scope:** `wrangler.toml`, ENV-Checks, Dev/Staging/Prod.
- **Befehle:** Nur Lese-Shell; Deploy-Befehle erst nach Freigabe.
- **Gate:** Explizite Approval vor Änderungen an `wrangler.toml`/ENV.

---

## 13) AI-Agent Tooling & IDE-Integration (Windsurf/Cascade)

> **Referenz:** Für vollständige Details siehe [GLOBAL_RULES.md](cci:7://file:///Users/lucas/.codeium/windsurf/memories/global_rules.md:0:0-0:0) "AI-Agent Tooling & IDE-Integration"

- **Suchpfade:** `src/`, `tests/`, `docs/`
- **Excludes:** `dist/`, `node_modules/`, `.wrangler/`, `coverage/`, `.backups/`, `reports/`, `favicon_package/`
- **Suchregeln:** `grep_search` immer mit `Includes` einschränken; `MatchPerLine` nur bei enger Suche
- **Datei-Zugriff:** Große Dateien segmentiert lesen (`limit`/`offset`); keine Binär-/Bilddateien öffnen
- **Parallelisierung:** Nur unabhängige Lese-/Suchen parallel; keine parallelen Schreibvorgänge
- **Terminal:** Niemals `cd`; CWD setzen; nur lesende Befehle automatisch; mutierende Befehle immer bestätigen
- **Code-Edits:** Imports oben; kleine, fokussierte Patches; TS strict; kein `any`
- **Diff-Grenzen:** > 300 LOC oder > 5 Dateien → Plan & Approval

---

## 14) Erweiterte Cloudflare Environment-Bindings

> **Referenz:** Für vollständige Details siehe [GLOBAL_RULES.md](cci:7://file:///Users/lucas/.codeium/windsurf/memories/global_rules.md:0:0-0:0) "Cloudflare Environments & Bindings"

### Pro Environment vollständige & explizite Bindings (keine Vererbung annehmen):
- **D1:** `DB` (Datenbank-Binding)
- **R2:** `R2_AVATARS`, `R2_LEADMAGNETS`, `R2_AI_IMAGES` (Storage-Buckets)
- **KV:** `SESSION`, `KV_AI_ENHANCER` (Key-Value-Namespaces)
- **Vars:** `ENVIRONMENT`, `BASE_URL`, Pricing-Tabellen (`PRICING_TABLE*`), Stytch-Flags (`AUTH_PROVIDER`, `E2E_FAKE_STYTCH`), Feature-Flags

### Deployment-Anforderungen:
- [ ] Routen pro Env (`routes` Blöcke) gepflegt
- [ ] Post-Deploy Health-Check/Smoke-Test implementiert
- [ ] Deployment als fehlgeschlagen markieren, wenn Health-Check scheitert
- [ ] Wrangler aktuell halten (Minor), Breaking-Changes-Changelog geprüft

---

## 15) Testing-Strategien & CI/CD

> **Referenz:** Für vollständige Details siehe [GLOBAL_RULES.md](cci:7://file:///Users/lucas/.codeium/windsurf/memories/global_rules.md:0:0-0:0) "Testing-Strategien & CI/CD"

### Test-Arten & Coverage:
- **Unit & Integration:** Vitest/Jest; Ziel-Coverage ≥ 70%
- **E2E:** Playwright (Chromium/FF/WebKit), `TEST_BASE_URL` bevorzugt
- **Astro:** `astro check` in CI via `tsconfig.astro-check.json`
- **OpenAPI:** Workflow-Validierung (`openapi:validate`)

### CI Gates (alle müssen grün sein):
- [ ] Lint/Format (ESLint/Prettier, markdownlint für `docs/**/*.md`)
- [ ] TypeScript Check (inkl. astro-check)
- [ ] Unit/Integration Tests
- [ ] E2E Smokes (Enhancer, Prompt-Enhancer, Pricing)
- [ ] OpenAPI Validate
- [ ] Security-Scans (`npm audit`/Snyk)

### E2E Besonderheiten:
- [ ] Cookie-Consent-Dismiss implementiert
- [ ] Frischer `guest_id` pro Run
- [ ] Route-Fallback EN/DE
- [ ] Robuste Selektoren verwenden

---

## 16) AI Image Enhancer – Spezifische Regeln

> **Referenz:** Für vollständige Details siehe [GLOBAL_RULES.md](cci:7://file:///Users/lucas/.codeium/windsurf/memories/global_rules.md:0:0-0:0) "AI Image Enhancer – Spezifische Regeln"

### Model-Capabilities & Entitlements:
- [ ] Model-Capabilities (Flags): UI blendet Controls je Fähigkeit
- [ ] Server validiert strikt
- [ ] Entitlements/Plan-Gating: `usage.limit` ist maßgeblich
- [ ] Gäste mit separatem KV-Limit

### Provider-Error-Mapping:
- [ ] 401/403 → `forbidden`
- [ ] 4xx → `validation_error`
- [ ] 5xx → `server_error`
- [ ] Einheitliche Darstellung in Responses

### Jobs-Service:
- [ ] Unterstützt Monthly Credits Bypass mit KV
- [ ] Logging von `credits_consumed`/`credits_missing`
- [ ] OpenAPI dokumentiert Limits-/Mapping-Semantik
- [ ] UI zeigt Plan-Badge & Upgrade-CTA

---

## 17) Validation Checklist (für PRs & Audits)

> **Referenz:** Für vollständige Details siehe [GLOBAL_RULES.md](cci:7://file:///Users/lucas/.codeium/windsurf/memories/global_rules.md:0:0-0:0) "Validation Checklist"

### Security-Validierung
- [ ] Keine Widersprüche zu [CLAUDE.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/CLAUDE.md:0:0-0:0) (Subagent-Scopes, Edit-Regeln, Security)
- [ ] Security enthält: CSP/Headers, Rate-Limits, Auth-Flows, Secrets-Handhabung
- [ ] API-Formate konsistent: `{ success, data? }` / `{ success: false, error: {…} }`
- [ ] 429 mit `Retry-After`; 405 standardisiert
- [ ] CSRF/CORS/Origin-Regeln eingehalten (Double-Submit; `Origin` in Tests)

### Cloudflare & Infrastructure
- [ ] Cloudflare Envs/Bindings explizit (keine Vererbung)
- [ ] Post-Deploy Health-Checks vorhanden
- [ ] Wrangler aktuell (Minor-Updates); Breaking-Changes geprüft

### Internationalisierung & Testing
- [ ] i18n: EN/DE, erforderliche Keys vorhanden (Prompt-Enhancer)
- [ ] Route-Konsistenz gewährleistet
- [ ] Testing: Vitest/Jest, Playwright E2E, `astro check`
- [ ] Coverage-Policy (Ziel ≥ 70%), CI-Gates grün

### Feature Flags & Documentation
- [ ] Feature Flags: `PUBLIC_*` Namensschema, kontrollierter Rollout
- [ ] Commits/Branches: Conventional Commits, SemVer Tags, Changelog gepflegt

---

## 15) Empfohlene Start-Kommandos

1. `summarize repo and key files`
2. `use "Scout" to propose next 3 tasks`
3. `use "Stylist" to run eslint and apply safe autofixes`
4. `use "Type-Medic" to run typecheck and fix strict errors`
5. `use "Test-Fixer" to run unit tests; fix minimal issues; summarize diffs`
6. `show diff summary; generate a conventional commit message; commit`
