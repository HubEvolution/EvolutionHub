# Cascade Hooks Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Windsurf IDE / Cascade                     │
│                                                                 │
│  ┌───────────┐   ┌──────────────┐   ┌─────────────────────┐   │
│  │  Editor   │   │  AI Agent    │   │  Terminal/Commands  │   │
│  └─────┬─────┘   └──────┬───────┘   └─────────┬───────────┘   │
│        │                │                      │               │
└────────┼────────────────┼──────────────────────┼───────────────┘
         │                │                      │
         │ read/write     │ read/write           │ command
         │                │                      │
         ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cascade Hooks Layer                          │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Pre-Read Hooks  │  │ Post-Write Hooks │  │ Post-Command │ │
│  │                  │  │                  │  │    Hooks     │ │
│  │  • Security      │  │  • Quality Check │  │  • Logger    │ │
│  │  • Compliance    │  │  • TypeCheck     │  │  • Audit     │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘ │
│           │                     │                    │         │
└───────────┼─────────────────────┼────────────────────┼─────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Hook Scripts (Node.js)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ pre-read-security-check.mjs                             │   │
│  │  • Reads: JSON context via stdin                        │   │
│  │  • Checks: File patterns (BLOCKED_PATTERNS)             │   │
│  │  • Action: Exit 2 = Block | Exit 0 = Allow              │   │
│  │  • Output: Security warnings                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ post-write-quality-check.mjs                            │   │
│  │  • Reads: File path from context                        │   │
│  │  • Actions:                                             │   │
│  │    1. Prettier --write (auto-format)                    │   │
│  │    2. ESLint --fix (auto-fix lint)                      │   │
│  │    3. tsc --noEmit (quick type check)                   │   │
│  │  • Output: ✓ checks passed / ⚠️ issues detected         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ post-write-typecheck.mjs                                │   │
│  │  • Reads: File path (only .ts/.tsx in src/)             │   │
│  │  • Action: tsc --noEmit --incremental                   │   │
│  │  • Output: Type errors (non-blocking)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ post-command-logger.mjs                                 │   │
│  │  • Reads: Command from context                          │   │
│  │  • Action: Append to .logs/cascade-audit.log            │   │
│  │  • Format: [timestamp] user=X command="Y"               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       External Tools                            │
│                                                                 │
│  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────────┐ │
│  │ Prettier │  │ ESLint  │  │   tsc   │  │  Filesystem      │ │
│  │ (format) │  │ (lint)  │  │ (types) │  │  (.logs/)        │ │
│  └──────────┘  └─────────┘  └─────────┘  └──────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Configuration & Tests                        │
│                                                                 │
│  .windsurf/hooks.json          → Hook registration             │
│  scripts/test-hooks.mjs        → Automated testing             │
│  .windsurf/workflows/          → Validation workflows          │
│  docs/development/             → User documentation            │
│  .windsurf/rules/              → Development rules             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Pre-Read Flow
```
File Access Attempt
    ↓
Cascade → pre-read-security-check.mjs
    ↓
Context: {"file_path": ".env.local"}
    ↓
Pattern Match: .env* → MATCH
    ↓
Exit Code: 2 (BLOCK)
    ↓
❌ Access Denied
```

### Post-Write Flow
```
Code Written to File
    ↓
Cascade → post-write-quality-check.mjs (parallel)
         → post-write-typecheck.mjs
    ↓
Context: {"file_path": "src/Button.tsx"}
    ↓
Quality Check:
  1. Prettier → Format Applied
  2. ESLint → Auto-fixes Applied
  3. tsc → Types Validated
    ↓
TypeCheck:
  tsc --incremental → Fast Validation
    ↓
Exit Code: 0 (non-blocking)
    ↓
✅ All Checks Complete
```

### Post-Command Flow
```
Command Executed
    ↓
Cascade → post-command-logger.mjs
    ↓
Context: {"command": "npm test"}
    ↓
Create Log Entry:
[2025-11-13T21:00:00.000Z] user=dev command="npm test"
    ↓
Append to .logs/cascade-audit.log
    ↓
Exit Code: 0
    ↓
✅ Logged
```

## Hook Lifecycle

```
┌─────────────────────┐
│   Cascade Event     │
│   (read/write/cmd)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Load hooks.json    │
│  Find matching hook │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Execute hook       │
│  - Pass JSON stdin  │
│  - Timeout: 30s     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Hook processes     │
│  context & logic    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Return exit code   │
│  - 0: Success       │
│  - 2: Block (pre)   │
│  - >0: Error        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Cascade handles    │
│  - Allow/Block      │
│  - Show output      │
│  - Log errors       │
└─────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                    Repository Tools                     │
│                                                         │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │ npm run     │   │ .windsurf/   │   │  CI/CD     │  │
│  │ hygiene     │   │ workflows/   │   │  Pipeline  │  │
│  └──────┬──────┘   └──────┬───────┘   └─────┬──────┘  │
│         │                 │                  │         │
└─────────┼─────────────────┼──────────────────┼─────────┘
          │                 │                  │
          │  Complementary  │  Validation      │  Separate
          │  (umfassend)    │  (lokale tests)  │  (CI only)
          │                 │                  │
          ▼                 ▼                  ▼
     ┌─────────────────────────────────────────────┐
     │          Cascade Hooks (lokal)              │
     │       (sofort, file-by-file, auto)          │
     └─────────────────────────────────────────────┘
```

## Security Model

```
┌────────────────────────────────────────────────┐
│            Blocked Resources (Pre-Read)        │
│                                                │
│  .env* files          → Secrets                │
│  secrets.json         → API Keys               │
│  *.pem, *.pfx, *.p12  → Certificates           │
│  .npmrc, .yarnrc.yml  → Auth Tokens            │
│  .git/config          → Git Credentials        │
│  node_modules/        → Dependencies           │
│  dist/, out/          → Build Artifacts        │
│  reports/, .logs/     → Sensitive Data         │
│                                                │
└────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────┐
│           Warnings (Pre-Read)                  │
│                                                │
│  migrations/          → Requires Approval      │
│  .github/workflows/   → Critical Infra         │
│  scripts/deploy/      → Production Access      │
│                                                │
└────────────────────────────────────────────────┘
```

## Performance Characteristics

```
Hook Type          Avg Time    Max Timeout    Blocking
─────────────────────────────────────────────────────
Pre-Read Security  < 100ms     30s            Yes (exit 2)
Post-Write Quality 2-5s        30s            No
Post-Write Type    1-3s        30s            No
Post-Command Log   < 50ms      30s            No

Total Impact: Minimal (async execution, non-blocking post-hooks)
```
