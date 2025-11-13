# Cascade Hooks Scripts

Dieses Verzeichnis enthält alle Hook-Scripts für Windsurf Cascade Hooks.

## Übersicht

| Script | Trigger | Zweck | Blocking |
|--------|---------|-------|----------|
| `pre-read-security-check.mjs` | pre_read_code | Blockiert Zugriff auf sensible Dateien | ✅ Yes (exit 2) |
| `post-write-quality-check.mjs` | post_write_code | Auto-Lint und Formatierung | ❌ No |
| `post-write-typecheck.mjs` | post_write_code | Schnelle Type-Validierung | ❌ No |
| `post-command-logger.mjs` | post_run_command | Audit-Logging | ❌ No |

## Hook-Lifecycle

```
┌─────────────────────────────────────────┐
│  Cascade Event (read/write/command)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Windsurf lädt .windsurf/hooks.json    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Hook-Script wird aufgerufen            │
│  - JSON Context via stdin               │
│  - Timeout: 30s (default)               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Script verarbeitet Context             │
│  - Liest file_path/command              │
│  - Führt Checks/Actions aus             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Script gibt Exit Code zurück           │
│  - 0: Success (allow)                   │
│  - 2: Block (nur pre-hooks)             │
│  - >0: Error (logged)                   │
└─────────────────────────────────────────┘
```

## Entwicklung

### Neuen Hook erstellen

1. **Script erstellen:**
   ```bash
   touch scripts/hooks/my-hook.mjs
   chmod +x scripts/hooks/my-hook.mjs
   ```

2. **Template verwenden:**
   ```javascript
   #!/usr/bin/env node
   import { readFileSync } from 'node:fs';
   
   function main() {
     let context;
     try {
       const stdin = readFileSync(0, 'utf-8');
       if (!stdin.trim()) process.exit(0);
       context = JSON.parse(stdin);
     } catch {
       process.exit(0); // Graceful fallback
     }
     
     // Hook-Logic hier
     const filePath = context?.file_path || '';
     
     // ... validierung ...
     
     process.exit(0); // Success
   }
   
   main();
   ```

3. **In `.windsurf/hooks.json` registrieren:**
   ```json
   {
     "hooks": {
       "pre_read_code": [
         {
           "command": "node scripts/hooks/my-hook.mjs",
           "show_output": true,
           "description": "My custom hook"
         }
       ]
     }
   }
   ```

4. **Testen:**
   ```bash
   # Manueller Test
   echo '{"file_path": "src/test.ts"}' | node scripts/hooks/my-hook.mjs
   
   # Mit Debug-Output
   echo '{"file_path": "src/test.ts"}' | node --inspect scripts/hooks/my-hook.mjs
   ```

### Best Practices

**✅ Do:**
- Graceful fallback bei fehlenden Input
- Klare, actionable Output-Messages
- Schnelle Checks (< 5s wo möglich)
- Exit Code 0 bei Success
- Exit Code 2 nur für kritische Pre-Blocks

**❌ Don't:**
- Keine Network-Calls (langsam)
- Keine User-Input-Prompts
- Keine unbegrenzten Loops
- Keine Secrets im Code
- Keine System-Level Changes

### Debugging

**Hook läuft nicht:**
```bash
# Check Script-Syntax
node --check scripts/hooks/my-hook.mjs

# Check Permissions
ls -la scripts/hooks/my-hook.mjs

# Manual Run mit Context
echo '{"file_path": "src/test.ts", "command": "npm test"}' | \
  node scripts/hooks/my-hook.mjs
```

**Hook zu langsam:**
```bash
# Mit Timing
time echo '{"file_path": "src/test.ts"}' | \
  node scripts/hooks/my-hook.mjs

# Profiling
node --prof scripts/hooks/my-hook.mjs < /dev/stdin
```

**Hook gibt falschen Exit Code:**
```bash
# Check Exit Code
echo '{"file_path": "src/test.ts"}' | \
  node scripts/hooks/my-hook.mjs
echo "Exit code: $?"
```

## Context Schema

Hooks erhalten JSON-Context via stdin:

### Pre-Read / Post-Write Hooks
```json
{
  "file_path": "/absolute/path/to/file.ts",
  "relative_path": "src/components/MyComponent.tsx",
  "operation": "read" | "write",
  "timestamp": "2025-11-13T21:00:00.000Z"
}
```

### Post-Command Hooks
```json
{
  "command": "npm test",
  "exit_code": 0,
  "timestamp": "2025-11-13T21:00:00.000Z"
}
```

## Exit Codes

| Code | Bedeutung | Pre-Hook | Post-Hook |
|------|-----------|----------|-----------|
| 0 | Success, allow operation | ✅ Continue | ✅ Logged |
| 2 | Block operation | 🚫 Blocked | ❌ Not applicable |
| >0 | Error | ⚠️ Logged | ⚠️ Logged |

## Ressourcen

- **Full Docs:** [docs/development/cascade-hooks.md](../../docs/development/cascade-hooks.md)
- **Rule:** [.windsurf/rules/cascade-hooks.md](../../.windsurf/rules/cascade-hooks.md)
- **Config:** [.windsurf/hooks.json](../../.windsurf/hooks.json)
- **Official:** [Cascade Hooks Docs](https://docs.windsurf.com/windsurf/cascade/hooks)
