---
description: 'Cascade Hooks – Workspace-Hooks und Guardrails für Evolution Hub'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-14'
codeRefs: '.windsurf/hooks.json, scripts/hooks/pre-run-command.mjs, scripts/hooks/pre-write-guard.mjs, scripts/hooks/post-write-quality.mjs'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Cascade Hooks – Workspace-Hooks für Evolution Hub

Cascade Hooks erweitern Cascade um **lokale Shell-Hooks**, die auf bestimmte Agent-Aktionen reagieren (Code lesen/schreiben, Commands, MCP). Dieses Dokument beschreibt die Evolution-Hub-spezifische Konfiguration.

## 1. Speicherorte

- **Workspace-Konfiguration**
  - `.windsurf/hooks.json`
- **Hook-Skripte (ESM, ohne neue Dependencies)**
  - `scripts/hooks/pre-run-command.mjs`
  - `scripts/hooks/pre-write-guard.mjs`
  - `scripts/hooks/post-write-quality.mjs`

Hooks werden von Windsurf automatisch geladen, wenn der Workspace geöffnet wird oder nach einem **Reload Window**.

## 2. Aktive Hook-Events

Evolution Hub nutzt aktuell drei Hook-Events:

- **`pre_run_command`**
  - Läuft **vor** Terminal-Kommandos, die Cascade ausführen möchte.
  - Kann gefährliche/bedeutende Commands blockieren (Exit-Code `2`).

- **`pre_write_code`**
  - Läuft **vor** Code-Edits durch Cascade.
  - Schützt kritische Dateien (SSoT/Infra) vor automatischen Writes.

- **`post_write_code`**
  - Läuft **nach** erfolgreichen Writes.
  - Gibt nur **Hinweise** auf passende Quality-Checks (Lint/TS/OpenAPI/Tests), führt sie aber nicht automatisch aus.

## 3. `.windsurf/hooks.json` – Struktur

```json
{
  "hooks": {
    "pre_run_command": [
      {
        "command": "node ./scripts/hooks/pre-run-command.mjs",
        "show_output": true,
        "working_directory": "."
      }
    ],
    "pre_write_code": [
      {
        "command": "node ./scripts/hooks/pre-write-guard.mjs",
        "show_output": true,
        "working_directory": "."
      }
    ],
    "post_write_code": [
      {
        "command": "node ./scripts/hooks/post-write-quality.mjs",
        "show_output": true,
        "working_directory": "."
      }
    ]
  }
}
```

> Hinweis: `show_output: true` sorgt dafür, dass relevante Hook-Ausgaben im Cascade-UI sichtbar sind (z. B. Block-Meldungen oder Quality-Hinweise).

## 4. `pre_run_command` – Command-Guard

**Datei:** `scripts/hooks/pre-run-command.mjs`

### Zweck

- Verhindert, dass Cascade automatisch **Deployments**, **Secrets-Kommandos** oder offensichtlich destruktive Shell-Kommandos ausführt.
- Ergänzt die bestehenden Sicherheitsregeln (`.windsurf/rules/api-and-security.md`, `tooling-and-style.md`) um eine IDE-seitige Schutzschicht.

### Geblockte Kommandotypen (Auszug)

- `npm run deploy*`
- `npm run secrets*`
- `wrangler publish`, `wrangler deploy`
- `git push`, `git commit`
- Shell-Patterns wie `rm -rf`, `rm -r`, `chmod -R`, `chown -R`

### Verhalten

- Bei Treffer:
  - Log-Eintrag unter `.logs/cascade-pre-run-command.log` (best-effort).
  - Fehlermeldung auf `stderr` (im Cascade-UI sichtbar).
  - Exit-Code `2` → Cascade bricht das Command ab.
- Für **Dev-Kommandos** (`npm run dev`, `npm run dev:e2e`, `npm run dev:worker*`, `npm run dev:open`, `npm run dev:pages-fallback`) wird vor Ausführung geprüft, ob Port `8787` bereits von einem lokalen Dev-Server belegt ist. Falls ja, versucht der Hook, die entsprechenden Prozesse (PIDs) per `kill` zu beenden und protokolliert dies im Output. Schlägt das fehl, wird der Dev-Command nicht geblockt – der eigentliche Befehl kann dann ggf. mit "Port already in use" fehlschlagen.
- Andernfalls: Exit-Code `0` → Command ist erlaubt.

## 5. `pre_write_code` – Schutz kritischer Dateien

**Datei:** `scripts/hooks/pre-write-guard.mjs`

### Zweck

- Schützt **Single Sources of Truth** und sicherheitsrelevante Dateien vor automatischen Writes durch Cascade.
- Entwickler:innen können diese Dateien weiterhin manuell bearbeiten.

### Geschützte Pfade

- `.env`, `.env.*`
- `wrangler.toml`, `wrangler.ci.toml`
- `.windsurf/rules/**`
- `openapi.yaml`
- `migrations/**`

### Verhalten

- Bei Write auf einen geschützten Pfad:
  - Log-Eintrag unter `.logs/cascade-pre-write-guard.log` (best-effort).
  - Fehlermeldung auf `stderr` (im Cascade-UI sichtbar).
  - Exit-Code `2` → Cascade blockiert den Write.
- Andere Dateien werden nicht beeinflusst (Exit-Code `0`).

## 6. `post_write_code` – Quality-Hinweise

**Datei:** `scripts/hooks/post-write-quality.mjs`

### Zweck

- Unterstützt die bestehenden **Testing- & CI-Regeln**, ohne sie zu ersetzen.
- Erinnert nach Writess durch Cascade an sinnvolle Checks, statt automatisch vollständige Pipelines zu starten.

### Pfadklassen & Hinweise

- Dateien unter `src/pages/api/**`:
  - Hinweis: `npm run openapi:validate` und `npm run test:integration`.
  - Bei größeren Änderungen zusätzlich `.windsurf/rules/api-and-security.md` und `openapi.yaml` bewusst prüfen.
- Dateien unter `src/lib/validation/schemas/**`:
  - Hinweis: passende Tests für Validierung (valid/invalid Cases) ergänzen/prüfen.
  - Bei API-relevanten Schemas zusätzlich `npm run openapi:validate`.
- Astro-UI-Dateien unter `src/**/*.astro`:
  - Hinweis: `npm run lint` und `npm run astro:check:ui`.
  - Bei betroffenen UI-Flows ggf. relevante E2E-Tests prüfen.
- Sonstige Dateien unter `src/**` (TS/TSX etc.):
  - Hinweis: `npm run lint` und `npm run typecheck:src`.
  - Erinnerung: TypeScript ist strict; bitte keine neuen `any` in `src/**` einführen.
- Dateien unter `tests/**`:
  - Erinnerung: In Tests kein direktes `JSON.parse` verwenden, sondern `safeParseJson` aus `tests/shared/http.ts`.
  - Bei größeren Änderungen Tests mit `npm run test:once` oder passenden Teilkommandos laufen lassen.
- Dateien unter `docs/**`:
  - Hinweis: Frontmatter (`lastSync`, `codeRefs`, `testRefs`) aktualisieren und bei strukturellen Änderungen `npm run docs:lint` und `npm run docs:links` prüfen.
- Dateien unter `.windsurf/rules/**`:
  - Hinweis: `.windsurf/rules` sind Single Source of Truth für Leitplanken. Prüfe, ob zugehörige Docs (z. B. unter `docs/development` oder `docs/security`) und ggf. Changelogs angepasst werden sollten.
- `openapi.yaml`:
  - Hinweis: `npm run openapi:validate` ausführen und relevante API-Dokumentation prüfen.

Es werden **keine** Lints, Tests oder Builds automatisch gestartet. Die Hooks ergänzen lediglich die Empfehlungsliste aus `docs/development/ci-cd.md`.

## 7. Smoke-Check für Hooks

### Lokal verifizieren

1. **Windsurf neu laden** (oder Workspace neu öffnen), damit die Hooks geladen werden.
2. Cascade bitten, ein gefährliches Command auszuführen, z. B. `npm run deploy:production`.
   - Erwartung: `pre_run_command` blockiert das Command mit Hinweis.
3. Cascade bitten, `wrangler.toml` oder `.env` zu editieren.
   - Erwartung: `pre_write_code` blockiert den Write.
4. Cascade einen normalen Edit in `src/...` machen lassen (z. B. kleine UI-Änderung).
   - Erwartung: Edit läuft durch; im Cascade-UI erscheint ein Hinweis aus `post_write_code`.

### Logs prüfen (optional)

- `.logs/cascade-pre-run-command.log`
- `.logs/cascade-pre-write-guard.log`
- `.logs/cascade-post-write-quality.log`

Logging ist **best-effort** und kann über die Umgebungsvariable `CASCADES_HOOKS_DISABLE_LOG=1` deaktiviert werden.

## 8. Erweiterungsideen (Future Work)

Folgende Hooks sind bewusst **noch nicht** aktiviert, können aber später ergänzt werden:

- `pre_read_code` / `post_read_code` – z. B. für detailliertes Audit von Dateizugriffen.
- `pre_mcp_tool_use` / `post_mcp_tool_use` – z. B. um MCP-Nutzung zu loggen oder bestimmte Tools in bestimmten Environments zu blocken.

Änderungen an der Hook-Konfiguration sollten immer gegen die Baselines in `.windsurf/rules/*.md` geprüft und in dieser Dokumentation nachgezogen werden.
