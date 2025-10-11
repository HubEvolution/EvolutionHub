---
description: Validate and update Cloudflare rulesets JSON safely
auto_execution_mode: 3
---

# Global Cloudflare Rulesets Update

## Goal

Ensure Cloudflare ruleset JSON files are valid, use only allowed operators (eq, starts_with, contains), and that any changes are reviewed, documented, and committed safely.

## Files in scope

Ï

1. Root JSON files like:
   - `staging-rules.json`
   - `ruleset-current-staging.json`
   - `rulesets-staging-list.json`
   - `rulesets-list.json`
   - `existing-rules.json`, `combined-rules.json`
   - `cache-rules-*.json`, `cf-create-ruleset.json`

## Prerequisites

1. jq installed (brew install jq)

## Steps

### 1. Inventory the ruleset files

// turbo

Run:

```bash
ls -1 *.json | grep -E '(^|/)(rules|ruleset|cache-rules|staging).*\\.json$' || true

```

### 2. Validate JSON syntax (fail fast)

// turbo

Run:

```bash
for f in staging-rules.json ruleset-current-staging.json rulesets-staging-list.json rulesets-list.json existing-rules.json combined-rules.json cache-rules-*.json cf-create-ruleset.json 2>/dev/null; do
  [ -f "$f" ] || continue;
  echo "checking: $f";
  jq empty "$f" || exit 1;
done

```

### 3. Extract all expression strings (diagnostic)

// turbo

Run:

```bash
for f in staging-rules.json ruleset-current-staging.json rulesets-staging-list.json rulesets-list.json existing-rules.json combined-rules.json cache-rules-*.json cf-create-ruleset.json 2>/dev/null; do
  [ -f "$f" ] || continue;
  echo "\\n# $f";
  jq -r '..|objects|select(has("expression"))|.expression' "$f" | sed 's/^/  expr: /';
done

```

### 4. Enforce allowed operators (eq|starts_with|contains)

// turbo

Run:

```bash
disallowed=0
for f in staging-rules.json ruleset-current-staging.json rulesets-staging-list.json rulesets-list.json existing-rules.json combined-rules.json cache-rules-*.json cf-create-ruleset.json 2>/dev/null; do
  [ -f "$f" ] || continue;
  while IFS= read -r expr; do
    [ -z "$expr" ] && continue;
    echo "$expr" | grep -Eq '\\\\b(eq|starts_with|contains)\\\\b' || {
      echo "DISALLOWED in $f: $expr";
      disallowed=1;
    }
  done < <(jq -r '..|.expression? // empty' "$f")
done
exit $disallowed

```

### 5. Optional sanity checks

- Confirm phase: `http_request_cache_settings` where applicable.
- Ensure rules intended to BYPASS caching include the correct action JSON.

### 6. Document changes

- Update or create `docs/ops/cloudflare-rules.md` with:
  - What changed and why.
  - The exact expressions and phases.
  - Environments affected (CI, Staging, Prod).

### 7. Commit

// turbo

Run:

```bash
git add -A
git commit -m "chore(cf): validate/update Cloudflare rulesets (operators constrained, jq-verified)"

```

### 8. Rollout (manual)

- If rules are applied via API/CLI, follow internal runbook to update the zone rulesets.
- Re-run health or targeted page fetches to verify CF-Cache-Status behavior.
