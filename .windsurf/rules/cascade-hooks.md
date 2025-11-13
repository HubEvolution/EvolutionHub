---
trigger: always_on
scope: quality
priority: medium
extends:
  - ./tooling-and-style.md
  - ./testing-and-ci.md
lastUpdate: 2025-11-13
maintainer: DevOps
---

# Cascade Hooks Rules

## Zweck

Definiert Regeln für die Verwendung von Windsurf Cascade Hooks in diesem Repository. Cascade Hooks sind automatisierte Shell-Commands, die bei Schlüssel-Events im Entwicklungsprozess ausgeführt werden.

## Muss

### Hook-Konfiguration

- **Workspace-Level:** Alle Hooks MÜSSEN in `.windsurf/hooks.json` definiert sein
- **Versioniert:** Hook-Config MUSS im Git-Repository sein (für Team-Konsistenz)
- **Documented:** Jeder Hook MUSS in `docs/development/cascade-hooks.md` dokumentiert sein
- **Timeouts:** Hooks DÜRFEN NICHT länger als 30 Sekunden laufen (default timeout)

### Hook-Scripts

- **Location:** Hook-Scripts MÜSSEN in `scripts/hooks/` liegen
- **Executable:** Scripts MÜSSEN ausführbar sein (`chmod +x`)
- **Node-basiert:** Scripts MÜSSEN `.mjs` (ES Module) sein
- **Error-Handling:** Scripts MÜSSEN graceful fehlschlagen (keine uncaught exceptions)
- **Exit Codes:**
  - `0`: Success (allow operation)
  - `2`: Block operation (nur für pre-hooks)
  - Andere: Error (logged, aber non-blocking für post-hooks)

### Sicherheit

- **Sensitive Files:** Pre-read hooks MÜSSEN Zugriff auf `.env*`, Secrets, Keys blockieren
- **No Secrets:** Hook-Scripts DÜRFEN KEINE Secrets/Keys enthalten
- **No PII:** Hook-Output DARF KEINE PII (Personally Identifiable Information) enthalten
- **Audit-Trail:** Post-command hooks SOLLTEN für Compliance-Logging verwendet werden

### Input/Output

- **JSON Input:** Hooks MÜSSEN Context via stdin als JSON lesen
- **Graceful Fallback:** Bei fehlendem/invaliden Input MUSS Hook mit exit 0 beenden
- **Structured Output:** Output SOLLTE strukturiert und hilfreich sein
- **Show Output:** Kritische Hooks (Security) SOLLTEN `show_output: true` haben

## Sollte

### Performance

- **Quick Checks:** Post-write hooks SOLLTEN nur schnelle Checks ausführen
- **Incremental:** Type-Checks SOLLTEN inkrementell sein (nicht full project)
- **Cached:** Linting SOLLTE ESLint-Cache nutzen (`--cache`)
- **Parallel:** Unabhängige Checks SOLLTEN parallel laufen können

### User Experience

- **Informativ:** Hook-Output SOLLTE klar kommunizieren, was passiert
- **Actionable:** Bei Fehlern SOLLTE Hook konkrete Lösungsvorschläge geben
- **Non-Blocking:** Post-hooks SOLLTEN non-blocking sein (außer kritische Security)
- **Progress:** Bei langlaufenden Hooks SOLLTE Progress angezeigt werden

### Integration

- **Hygiene-Kompatibel:** Hooks SOLLTEN kompatibel mit `npm run hygiene` sein
- **CI-Aligned:** Hook-Checks SOLLTEN Subset von CI-Checks sein
- **Tool-Reuse:** Hooks SOLLTEN bestehende Tools nutzen (ESLint, Prettier, tsc)
- **Idempotent:** Hooks SOLLTEN idempotent sein (mehrfaches Ausführen safe)

## Nicht

### Verboten

- **❌ Sensitive Access:** Hooks DÜRFEN NICHT auf sensible Dateien zugreifen
- **❌ Network Calls:** Hooks DÜRFEN NICHT externe APIs/Services aufrufen (außer notwendig)
- **❌ State Mutation:** Pre-hooks DÜRFEN NICHT Dateien modifizieren
- **❌ User Input:** Hooks DÜRFEN NICHT auf User-Input warten
- **❌ Long-Running:** Hooks DÜRFEN NICHT länger als timeout laufen
- **❌ System Changes:** Hooks DÜRFEN NICHT System-Level Änderungen machen
- **❌ Git Operations:** Hooks DÜRFEN NICHT Git-Commands ausführen (außer read-only)

### Anti-Patterns

- Hooks als Ersatz für CI/CD
- Hooks für Build-Prozesse (zu langsam)
- Hooks mit Side-Effects auf Production-Systeme
- Hooks ohne Error-Handling
- Hooks mit hard-coded Pfaden (außer workspace-relative)
- Hooks die andere Hooks aufrufen (keine Chains)

## Checkliste

Bei Implementierung neuer Hooks:

- [ ] Hook-Script in `scripts/hooks/` erstellt
- [ ] Script ist executable (`chmod +x`)
- [ ] JSON-Input-Parsing mit Fallback
- [ ] Korrekter Exit-Code bei Success/Failure/Block
- [ ] Keine Secrets/PII im Code/Output
- [ ] Timeout < 30s (oder konfiguriert)
- [ ] Hook in `.windsurf/hooks.json` registriert
- [ ] Dokumentation in `docs/development/cascade-hooks.md` aktualisiert
- [ ] Manueller Test: `echo '{}' | node scripts/hooks/<hook>.mjs`
- [ ] Integration mit bestehendem Tooling validiert

Bei Änderungen an Hooks:

- [ ] Changelog in Hook-Script aktualisiert
- [ ] Dokumentation angepasst
- [ ] Kompatibilität mit alten Cascade-Versionen geprüft
- [ ] Team informiert (breaking changes)
- [ ] Tests für Hook-Logic (falls komplex)

## Code-Anker

### Hook-Konfiguration

- `.windsurf/hooks.json` — Workspace-level hook configuration
- `scripts/hooks/` — All hook scripts

### Implementierte Hooks

- `scripts/hooks/pre-read-security-check.mjs` — Security pre-read hook
- `scripts/hooks/post-write-quality-check.mjs` — Auto-lint/format hook
- `scripts/hooks/post-write-typecheck.mjs` — Type checking hook
- `scripts/hooks/post-command-logger.mjs` — Audit logging hook

### Dokumentation

- `docs/development/cascade-hooks.md` — Vollständige Hooks-Dokumentation

## CI/Gates

Keine direkten CI-Gates für Hooks (laufen nur lokal). Aber:

```bash
# Validierung der Hook-Scripts (Syntax)
node --check scripts/hooks/*.mjs

# Manuelle Hook-Tests
echo '{"file_path": "src/test.ts"}' | node scripts/hooks/pre-read-security-check.mjs
echo '{"file_path": "src/test.ts"}' | node scripts/hooks/post-write-quality-check.mjs
```

## Referenzen

### Interne Docs

- [Cascade Hooks Dokumentation](../../docs/development/cascade-hooks.md)
- [Agentic Workflow Rule](./agentic-workflow.md) — SOP für Agenten
- [Tooling & Style Rule](./tooling-and-style.md) — Linting/Formatting Standards
- [Testing & CI Rule](./testing-and-ci.md) — Testing Standards

### Externe Ressourcen

- [Official Cascade Hooks Docs](https://docs.windsurf.com/windsurf/cascade/hooks)
- [Cascade Customizations Catalog](https://github.com/Windsurf-Samples/cascade-customizations-catalog)
- [Windsurf Blog: Cascade Customization](https://windsurf.com/blog/windsurf-wave-8-cascade-customization-features)

## Beispiele

### Pre-Read Hook (Security)

```javascript
import { readFileSync } from 'node:fs';

const BLOCKED = [/\.env/, /secrets\.json/];

function main() {
  let context;
  try {
    context = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    process.exit(0); // Graceful fallback
  }

  const path = context?.file_path || '';
  for (const pattern of BLOCKED) {
    if (pattern.test(path)) {
      console.error(`❌ Blocked: ${path}`);
      process.exit(2); // Block operation
    }
  }
  process.exit(0); // Allow
}

main();
```

### Post-Write Hook (Auto-Fix)

```javascript
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function main() {
  let context;
  try {
    context = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    process.exit(0);
  }

  const path = context?.file_path || '';
  if (!path.endsWith('.ts')) {
    process.exit(0);
  }

  try {
    execSync(`npx prettier --write "${path}"`, { stdio: 'pipe' });
    console.log(`✓ Formatted: ${path}`);
  } catch (err) {
    console.warn(`⚠️  Format failed: ${path}`);
  }

  process.exit(0); // Non-blocking
}

main();
```

## Changelog

### 2025-11-13: Initial Rule

- ✅ Hook-Konfiguration definiert
- ✅ Security-Requirements festgelegt
- ✅ Performance-Guidelines
- ✅ Integration mit bestehendem Tooling
- ✅ Code-Anker und Referenzen
