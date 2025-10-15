---
description: Affected-only sync for AGENTS.md (Codex), CLAUDE.md (Claude Code), and .kilocode/** with agent-specific formatting.
auto_execution_mode: 1
---

# Workflow: agent_knowledge_sync_apply_full

/name: agent_knowledge_sync_apply_full
/run /agent_knowledge_sync applyChanges=true allowFullRewrite=true allowList=AGENTS.md,CLAUDE.md,.kilocode/**,docs/\_generated/**
