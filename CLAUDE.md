# CLAUDE.md — Globale Projektregeln, Policies & Subagents

## Zweck

Dieses Dokument steuert Claude Code (Sonnet 4.5, Pro) bei allen Änderungen in diesem Repository. Ziel: konsistente Code-Qualität, sichere Änderungen und reproduzierbare Deployments.

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

## 13) Empfohlene Start-Kommandos

1. `summarize repo and key files`
2. `use "Scout" to propose next 3 tasks`
3. `use "Stylist" to run eslint and apply safe autofixes`
4. `use "Type-Medic" to run typecheck and fix strict errors`
5. `use "Test-Fixer" to run unit tests; fix minimal issues; summarize diffs`
6. `show diff summary; generate a conventional commit message; commit`
