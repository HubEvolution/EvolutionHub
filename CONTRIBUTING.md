# Contributing – AI Agent Playbook

Dieser Leitfaden richtet sich ausschließlich an AI-Agenten, die im Evolution-Hub-Repository arbeiten. Befolge ihn strikt, damit Änderungen sicher, konsistent und auditierbar bleiben.

## 1. Fundamentale Regeln

1. **Regelhierarchie beachten:**
   - Global Rules (`MEMORY[user_global]`), projektspezifische Regeln (`.windsurf/rules/*`), Dateikommentare.
   - README & aktuelle Tickets spiegeln den Projektstatus wider.
2. **Keine menschlichen Contributor-Annahmen:** Tools wie Git, npm etc. dürfen nur nach expliziter Freigabe des Users eingesetzt werden.
3. **Sicherheit & Compliance:** Keine Geheimnisse im Code, CSRF/Same-Origin-Regeln respektieren, `/r2-ai/**` niemals gate’n.
4. **Kommunikation:** Sei präzise, dokumentiere jede Annahme. Unsichere Sachverhalte eskalieren, statt zu improvisieren.

## 2. Arbeitsablauf für Tasks

1. **Kontext sammeln**
   - Ticket/User-Request lesen.
   - Relevante Regeln/Docs sehen (`code_search`, `find_by_name`, `read_file`).
2. **Planen**
   - Prüfen, ob Aufgabe komplex genug für einen Plan ist.
   - `update_plan` nutzen, Schritte nummerieren, bei Änderungen aktualisieren.
3. **Analyse**
   - Quellstellen identifizieren (Suche, Lesen).
   - Abhängigkeiten (Tests, Config) prüfen.
4. **Umsetzung**
   - Für Edits `apply_patch` nutzen (pro Datei, gezielt, mit Kontext).
   - Für neue Dateien `write_to_file`.
   - Shell-Kommandos nur über `run_command` nach Freigabe.
5. **Validierung**
   - Lint/Test/Build nur wenn ausdrücklich verlangt oder nötig.
   - Prüfen, ob Änderungen mit Regeln/Tests kompatibel sind.
6. **Berichten**
   - Zusammenfassung, Verweise (`@/path#start-end`).
   - Offene Punkte / Risiken benennen.

## 3. Coding & Style Quick Reference

- **TypeScript/JS**: strict, `no-explicit-any` (außer Tests warnend), Imports über `@/*`.
- **Formatting**: Prettier (2 Spaces, Single Quotes, 100 Width, Semicolons).
- **Linting**: ESLint config respektieren; keine neuen Warnungen erzeugen.
- **Tests**: Vitest (≥70 % Coverage), Playwright v2. Tests nur anpassen, wenn Änderung sie betrifft.
- **Docs**: Markdown lint rules (keine `<details>` ohne Notwendigkeit etc.).

## 4. Spezifische Leitplanken

- **APIs**: `withApiMiddleware` / `withAuthApiMiddleware`, `createApiSuccess/Error`, `createMethodNotAllowed`.
- **Validation**: Zod-Schemas, `safeParse`, `formatZodError`. OpenAPI Sync beachten.
- **Rate Limits / Quoten**: Presets aus `src/lib/rate-limiter.ts`, Limits aus `src/config/**`.
- **Security Header & CSRF**: HSTS, X-Frame-Options, `Retry-After`, Double-Submit Token, Allowed Origins.
- **Assets & R2**: `/r2-ai/**` öffentlich; keine Auth davor platzieren.

## 5. Interaktion mit Tools

- **`code_search`**: erster Schritt bei Unklarheit.
- **`find_by_name` / `grep_search`**: gezielte Suche.
- **`read_file`**: nur relevante Abschnitte, bei großen Dateien mit limit/offset.
- **`apply_patch`**: immer mit eindeutiger Kontextwahl (keine Full-File-Replacements, außer sehr klein oder komplette Neu-Inhalte).
- **`write_to_file`**: nur für neue Dateien.
- **`run_command`**: niemals `cd`; `cwd` setzen. Vor potenziell destruktiven Kommandos Freigabe einholen.

## 6. Review & Übergabe

- Änderungen immer referenzieren (`@/file#lines`).
- Erwähne Tests/Kommandos nur, wenn ausgeführt oder bewusst ausgelassen.
- Bei Risiken, TODOs oder Folgeaufgaben klar markieren.
- Offene Pläne (`update_plan`) schließen.

## 7. Eskalation

Unklare Anforderungen, widersprüchliche Regeln oder Sicherheitsbedenken → Arbeit stoppen, Nachfrage formulieren. Keine Annahmen ohne Bestätigung umsetzen.

---

Für weitere Details: README, `.windsurf/rules/`, `docs/`, `openapi.yaml`. Dieses Playbook ersetzt die frühere, human-orientierte Contributing-Anleitung.
