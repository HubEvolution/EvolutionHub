# Windsurf Cascade Hooks Integration

> **Status:** ✅ Active  
> **Last Updated:** 2025-11-13  
> **Maintainer:** DevOps Team  
> **Related:** [Workflows](../workflows/), [AGENTS.md](/AGENTS.md)

## Zweck

Cascade Hooks sind Shell-Commands, die automatisch an Schlüsselpunkten im Cascade-Workflow ausgeführt werden. Diese Integration ermöglicht:

1. **Automatische Qualitätsprüfungen** nach Code-Änderungen
2. **Sicherheitskontrollen** beim Dateizugriff
3. **Compliance-Logging** für Audit-Trails
4. **Team-Standardisierung** durch automatische Formatierung und Linting

## Konfiguration

### Workspace-Level Configuration

Die Hooks sind in `.windsurf/hooks.json` definiert und gelten für alle Entwickler, die an diesem Projekt arbeiten:

```json
{
  "hooks": {
    "pre_read_code": [...],      // Vor dem Lesen von Code
    "post_write_code": [...],    // Nach dem Schreiben von Code
    "post_run_command": [...]    // Nach Command-Ausführung
  }
}
```

### Implementierte Hooks

#### 1. Pre-Read Security Check (`pre_read_security_check.mjs`)

**Trigger:** Vor dem Lesen von Dateien durch Cascade  
**Zweck:** Blockiert Zugriff auf sensible Dateien

**Geblockte Dateien:**
- `.env*` Dateien (alle Varianten)
- Private Keys (`.pem`, `.pfx`, `.p12`)
- Secrets (`secrets.json`, `wrangler.toml`)
- Auth-Tokens (`.npmrc`, `.yarnrc.yml`)
- Build-Artefakte (`dist/`, `out/`, `node_modules/`)
- Reports und Logs (`reports/`, `.logs/`)

**Warnungen für:**
- Database Migrations (`migrations/`)
- CI/CD Workflows (`.github/workflows/`)
- Deployment Scripts (`scripts/deploy/`)

**Exit Code 2:** Blockiert die Operation

#### 2. Post-Write Quality Check (`post_write_quality_check.mjs`)

**Trigger:** Nach dem Schreiben von Code durch Cascade  
**Zweck:** Automatisches Linting und Formatierung

**Aktionen:**
- **Auto-Format:** Prettier auf alle unterstützten Dateien
- **Auto-Lint:** ESLint mit `--fix` für TypeScript/Astro
- **Quick Type Check:** Schnelle Validierung für `.ts`/`.tsx` Dateien

**Unterstützte Extensions:**
- Linting: `.ts`, `.tsx`, `.astro`, `.js`, `.mjs`
- Formatting: `.ts`, `.tsx`, `.astro`, `.js`, `.mjs`, `.json`, `.md`, `.yaml`, `.yml`

**Exit Code:** Immer 0 (non-blocking)

#### 3. Post-Write TypeCheck (`post_write_typecheck.mjs`)

**Trigger:** Nach dem Schreiben von TypeScript-Dateien  
**Zweck:** Schnelle inkrementelle Type-Validierung

**Features:**
- Nur für `.ts`/`.tsx` in `src/`
- Inkrementeller Check (schnell)
- 10-Sekunden Timeout
- Non-blocking (informativ)

#### 4. Post-Command Logger (`post_command_logger.mjs`)

**Trigger:** Nach Command-Ausführung durch Cascade  
**Zweck:** Audit-Trail für Compliance

**Log-Format:**
```
[2025-11-13T21:00:00.000Z] user=developer command="npm test"
```

**Log-Location:** `.logs/cascade-audit.log`

## Verwendung

### Für Entwickler

Hooks werden **automatisch** ausgeführt, wenn Cascade Code liest/schreibt oder Commands ausführt. Keine manuelle Interaktion erforderlich.

**Bei blockierten Dateien:**
```
❌ SECURITY: Access to sensitive file blocked: .env.local
   This file contains or may contain sensitive information.
   If you need to access this file, use your terminal directly.
```

**Bei Quality Issues:**
```
🔍 Quality Check: src/components/MyComponent.tsx
   ✓ Running Prettier...
   ✓ Formatted successfully
   ✓ Running ESLint...
   ⚠️  Linting issues detected:
   💡 Tip: Run `npm run hygiene` for comprehensive validation
```

### Für Admins/DevOps

**Hooks deaktivieren (falls nötig):**
```json
{
  "settings": {
    "enabled": false
  }
}
```

**Timeout anpassen:**
```json
{
  "settings": {
    "timeout_seconds": 60
  }
}
```

**System-Level Hooks (optional):**
- macOS: `/Library/Application Support/Windsurf/hooks.json`
- Linux/WSL: `/etc/windsurf/hooks.json`
- Windows: `C:\ProgramData\Windsurf\hooks.json`

## Integration mit Repository-Workflows

### Hygiene Workflow

Cascade Hooks ergänzen den bestehenden Hygiene-Workflow:

```bash
npm run hygiene        # Vollständiger Hygiene-Check
npm run hygiene:full   # Mit Report-Generierung
```

**Unterschied:**
- **Hooks:** Automatisch, sofort, file-by-file
- **Hygiene:** Manuell, umfassend, projekt-weit

### CI/CD Integration

Hooks laufen **nur lokal** in der IDE. CI/CD verwendet weiterhin:
- `.github/workflows/` für GitHub Actions
- `npm run lint`, `npm run typecheck`, `npm run test:*`

## Best Practices

### Do's ✅

- Hooks als zusätzliche Sicherheitsebene nutzen
- Bei blockierten Dateien Terminal verwenden
- Quality-Warnings ernst nehmen
- Audit-Logs für Compliance nutzen

### Don'ts ❌

- Hooks nicht als Ersatz für CI/CD verwenden
- Keine sensiblen Daten in Hook-Output
- Hooks nicht für langlaufende Operationen (> 30s)
- Kein Bypass der Security-Checks

## Troubleshooting

### Hook schlägt fehl

**Symptom:** Hook-Fehler in Cascade  
**Lösung:**
1. Check Hook-Script: `node scripts/hooks/<hook-name>.mjs`
2. Prüfe Node-Version: `node --version` (>= 18.x)
3. Logs prüfen: `.logs/cascade-audit.log`

### Hook zu langsam

**Symptom:** Cascade wartet lange auf Hook  
**Lösung:**
1. Timeout erhöhen in `hooks.json`
2. Hook optimieren (weniger Checks)
3. Hook deaktivieren bei Bedarf

### Security-Block fälschlich

**Symptom:** Legitime Datei wird geblockt  
**Lösung:**
1. Pattern in `pre_read_security_check.mjs` anpassen
2. Whitelist für spezifische Dateien hinzufügen
3. Temporär Hook deaktivieren

## Erweiterungen (Roadmap)

### Phase 1 (Q1 2025) 🟡

- [ ] Pre-Write Hook für zusätzliche Validierung
- [ ] Integration mit Snyk Security Scans
- [ ] Custom Hook-Templates für Features
- [ ] Hook-Performance-Monitoring

### Phase 2 (Q2 2025) 🟢

- [ ] Team-spezifische Hook-Konfiguration
- [ ] Hook-Analytics Dashboard
- [ ] Integration mit Jira/Linear für Tracking
- [ ] Advanced Pattern-Matching für Security

## Referenzen

- **Official Docs:** [Cascade Hooks Documentation](https://docs.windsurf.com/windsurf/cascade/hooks)
- **Example Catalog:** [Cascade Customizations](https://github.com/Windsurf-Samples/cascade-customizations-catalog)
- **Blog Post:** [Wave 8: Cascade Customization](https://windsurf.com/blog/windsurf-wave-8-cascade-customization-features)

## Changelog

### 2025-11-13: Initial Implementation
- ✅ Workspace-level hooks configuration
- ✅ Pre-read security check
- ✅ Post-write quality check
- ✅ Post-write type check
- ✅ Post-command audit logger
- ✅ Documentation und Integration

## Kontakt

**Fragen/Feedback:** DevOps Team oder Issue mit Label `cascade-hooks`
