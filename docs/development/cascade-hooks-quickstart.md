# Cascade Hooks: Schnellstart-Anleitung

> **Zielgruppe:** Entwickler, die Windsurf IDE mit Cascade nutzen  
> **Zeit:** 5 Minuten  
> **Voraussetzungen:** Windsurf IDE mit Cascade aktiviert

## Was sind Cascade Hooks?

Cascade Hooks sind automatische Shell-Commands, die bei bestimmten Events in der Windsurf IDE ausgeführt werden:

- **Pre-Read:** Vor dem Lesen von Dateien → Security-Checks
- **Post-Write:** Nach dem Schreiben von Code → Auto-Lint, Format, TypeCheck
- **Post-Command:** Nach Command-Ausführung → Audit-Logging

## Quick Start

### 1. Hooks sind bereits aktiv! 🎉

Die Hooks sind in `.windsurf/hooks.json` konfiguriert und werden automatisch ausgeführt. Keine Installation erforderlich.

### 2. Was passiert automatisch?

#### Beim Lesen von Dateien (Pre-Read)
```
❌ Blockiert werden:
- .env* Dateien
- Secrets (secrets.json, private keys)
- Auth-Tokens (.npmrc, .yarnrc.yml)
- Build-Artefakte (dist/, node_modules/)
- Logs und Reports

⚠️  Warnung bei:
- Database Migrations
- CI/CD Workflows
- Deployment Scripts
```

#### Beim Schreiben von Code (Post-Write)
```
✅ Automatisch ausgeführt:
1. Prettier Format (für .ts, .tsx, .astro, .json, .md, etc.)
2. ESLint Auto-Fix (für TypeScript/Astro in src/)
3. Quick Type Check (für .ts/.tsx Dateien)

Output:
🔍 Quality Check: src/components/Button.tsx
   ✓ Running Prettier...
   ✓ Formatted successfully
   ✓ Running ESLint...
   ✓ Linting passed
   ✓ Quick type check...
   ✓ Type check passed
   ✅ All checks passed!
```

#### Bei Command-Ausführung (Post-Command)
```
✅ Automatisch geloggt in .logs/cascade-audit.log:
[2025-11-13T21:00:00.000Z] user=developer command="npm test"
```

### 3. Beispiel-Workflow

**Szenario:** Du bearbeitest eine TypeScript-Komponente

1. **Du öffnest Cascade** (Cmd/Ctrl + L)
2. **Cascade liest die Datei** → Pre-Read Hook prüft Security ✅
3. **Du lässt Cascade Code schreiben**
4. **Cascade schreibt die Datei** → Post-Write Hook:
   - Formatiert automatisch mit Prettier
   - Fixt ESLint-Probleme
   - Prüft TypeScript-Typen
5. **Du siehst die Ergebnisse** im Cascade-Output

**Kein manueller Schritt erforderlich!**

### 4. Was tun bei Blockierungen?

**Du siehst:**
```
❌ SECURITY: Access to sensitive file blocked: .env.local
   This file contains or may contain sensitive information.
   If you need to access this file, use your terminal directly.
```

**Lösung:**
- Nutze dein Terminal/Editor direkt für sensible Dateien
- Oder deaktiviere temporär den Hook (siehe unten)

### 5. Hooks deaktivieren (optional)

**Temporär für eine Session:**

Editiere `.windsurf/hooks.json`:
```json
{
  "settings": {
    "enabled": false
  }
}
```

**Spezifischen Hook deaktivieren:**
```json
{
  "hooks": {
    "pre_read_code": [],  // Leer = deaktiviert
    "post_write_code": [  // Nur Quality Check aktiv
      {
        "command": "node scripts/hooks/post-write-quality-check.mjs",
        "show_output": true
      }
    ]
  }
}
```

## Häufige Fragen

### Q: Sind Hooks langsam?
**A:** Nein. Hooks haben 30s Timeout, laufen aber meist in < 5s:
- Pre-Read: < 1s (nur Pattern-Matching)
- Post-Write Quality: 2-5s (Auto-Fix + Checks)
- Post-Command Logger: < 1s (nur Logging)

### Q: Was ist, wenn ein Hook fehlschlägt?
**A:** Post-Hooks sind non-blocking. Bei Fehlern siehst du Warnungen, aber Cascade läuft weiter.

### Q: Kann ich eigene Hooks hinzufügen?
**A:** Ja! Siehe [Hook Development Guide](./scripts/hooks/README.md).

### Q: Laufen Hooks auch in CI/CD?
**A:** Nein. Hooks laufen nur lokal in Windsurf IDE. CI/CD nutzt die normalen npm scripts.

### Q: Was ist mit den bestehenden Hygiene-Workflows?
**A:** Hooks ergänzen Hygiene, ersetzen es nicht:
- **Hooks:** Sofort, file-by-file, automatisch
- **Hygiene:** Umfassend, projekt-weit, manuell

## Weiterführende Dokumentation

- **Vollständige Docs:** [cascade-hooks.md](./cascade-hooks.md)
- **Development Rules:** [.windsurf/rules/cascade-hooks.md](../../.windsurf/rules/cascade-hooks.md)
- **Hook Scripts:** [scripts/hooks/README.md](../../scripts/hooks/README.md)
- **Official Docs:** [docs.windsurf.com/cascade/hooks](https://docs.windsurf.com/windsurf/cascade/hooks)

## Feedback & Support

**Probleme oder Verbesserungsvorschläge?**
- Issue erstellen mit Label `cascade-hooks`
- DevOps Team kontaktieren

---

**Happy Coding with Cascade! 🚀**
