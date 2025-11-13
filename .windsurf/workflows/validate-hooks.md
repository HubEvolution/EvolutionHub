---
description: Validate and test Cascade Hooks configuration
auto_execution_mode: 3
---

# Cascade Hooks Validation

This workflow validates that all Cascade Hooks are properly configured and working. Use it after updating hooks or when troubleshooting hook issues.

## Prerequisites

- Node dependencies are installed (npm install or npm ci)
- Hooks scripts exist in `scripts/hooks/`

## 1) Validate hooks configuration

// turbo

```bash
echo "📋 Validating Cascade Hooks configuration..."
if [ -f .windsurf/hooks.json ]; then
  echo "✓ hooks.json exists"
  node -e "JSON.parse(require('fs').readFileSync('.windsurf/hooks.json', 'utf-8'))" && echo "✓ Valid JSON" || echo "❌ Invalid JSON"
else
  echo "❌ hooks.json not found"
fi
```

## 2) Check hook scripts

// turbo

```bash
echo "\n📁 Checking hook scripts..."
for hook in scripts/hooks/*.mjs; do
  if [ -f "$hook" ]; then
    echo "  Checking $(basename $hook)..."
    node --check "$hook" && echo "    ✓ Syntax OK" || echo "    ❌ Syntax Error"
    [ -x "$hook" ] && echo "    ✓ Executable" || echo "    ⚠️  Not executable (run: chmod +x $hook)"
  fi
done
```

## 3) Run hook tests

// turbo

```bash
echo "\n🧪 Running hook tests..."
node scripts/test-hooks.mjs
```

## 4) Test individual hooks manually

```bash
# Pre-Read Security Check
echo '{"file_path": "src/test.ts"}' | node scripts/hooks/pre-read-security-check.mjs
echo "Exit code: $?"

echo '{"file_path": ".env.local"}' | node scripts/hooks/pre-read-security-check.mjs
echo "Exit code: $? (should be 2 = blocked)"

# Post-Write Quality Check
echo '{"file_path": "src/components/Button.tsx"}' | node scripts/hooks/post-write-quality-check.mjs
echo "Exit code: $?"

# Post-Command Logger
echo '{"command": "npm test"}' | node scripts/hooks/post-command-logger.mjs
echo "Exit code: $?"

# Check audit log was created
if [ -f .logs/cascade-audit.log ]; then
  echo "✓ Audit log created"
  tail -n 3 .logs/cascade-audit.log
else
  echo "⚠️  Audit log not found (might be gitignored)"
fi
```

## 5) Validate hook integration

```bash
# Check that hooks don't break normal operations
echo "\n🔗 Testing hook integration..."

# Ensure hooks allow normal file reads
echo '{"file_path": "src/pages/index.astro"}' | node scripts/hooks/pre-read-security-check.mjs
[ $? -eq 0 ] && echo "✓ Normal files allowed" || echo "❌ Normal files blocked!"

# Ensure hooks don't cause timeout issues
timeout 5s bash -c 'echo "{\"file_path\": \"src/test.ts\"}" | node scripts/hooks/post-write-quality-check.mjs'
[ $? -ne 124 ] && echo "✓ Hooks complete within timeout" || echo "❌ Hook timeout!"
```

## 6) Summary

```bash
echo "\n" && echo "=" | head -c 50 && echo ""
echo "✅ Cascade Hooks Validation Complete"
echo ""
echo "Next steps:"
echo "  • Open Windsurf IDE and test with Cascade (Cmd/Ctrl + L)"
echo "  • Make a code change and observe auto-formatting"
echo "  • Try accessing .env file and verify blocking"
echo "  • Check .logs/cascade-audit.log for command history"
echo ""
echo "Documentation:"
echo "  • Quick Start: docs/development/cascade-hooks-quickstart.md"
echo "  • Full Docs: docs/development/cascade-hooks.md"
echo "  • Rules: .windsurf/rules/cascade-hooks.md"
```

## Troubleshooting

### Hook not executing

**Check:**

1. Windsurf IDE version (requires latest with hooks support)
2. Hooks enabled in `.windsurf/hooks.json` (`"enabled": true`)
3. Script is executable (`chmod +x scripts/hooks/*.mjs`)
4. No syntax errors (`node --check scripts/hooks/hook-name.mjs`)

### Hook too slow

**Solutions:**

1. Increase timeout in `hooks.json` (`"timeout_seconds": 60`)
2. Optimize hook script (remove expensive operations)
3. Use incremental checks instead of full project scans

### Hook blocking incorrectly

**Solutions:**

1. Check patterns in `pre-read-security-check.mjs`
2. Add whitelist for specific files
3. Temporarily disable hook to unblock work
