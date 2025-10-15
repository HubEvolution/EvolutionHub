---
description: Validate project health (files, fences, rules count) without writes
auto_execution_mode: 1
---

# Workflow: health_check

/name: health_check
/description: Verify codemaps, rules, fenced sync blocks, and dashboards are present and consistent.
/params:

- minFeatureRules=8

/log 🩺 Project Health Check (no writes)...

/analyze Collect inventory:

- Codemaps in .windsurf/codemaps/\*.md
- Feature rules in .windsurf/rules/\*.md (exclude .pending)
- AGENTS.md fenced block (sync:codex) and anchors (## Intro, ## Sync (auto))
- CLAUDE.md fenced block (sync:claude) and anchors (## Intro, ## Sync (auto))
- .kilocode/\*_/_.md fenced blocks (sync:kilocode:<filename>)
- Workflows: context_refresh.md, agent_knowledge_sync.md, status_refresh.md
- Memories: .windsurf/memories/project.json

/exec Checks:

- count(codemaps) >= 8 -> OK/FAIL
- count(.windsurf/rules/\*.md) >= ${minFeatureRules} -> OK/FAIL
- AGENTS.md has anchors and sync:codex -> OK/FAIL
- CLAUDE.md has anchors and sync:claude -> OK/FAIL
- At least one .kilocode/\* has sync:kilocode:<file> -> OK/FAIL
- Required workflows exist -> OK/FAIL
- Project memory exists -> OK/FAIL

/report Health Summary (Area | Expectation | Result | Details)

/log Tip: Promote staged rules from .windsurf/rules.pending/ to .windsurf/rules/ to satisfy rules count.
