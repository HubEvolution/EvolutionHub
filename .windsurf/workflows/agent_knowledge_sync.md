---
description: Affected-only sync for AGENTS.md (Codex), CLAUDE.md (Claude Code), and .kilocode/** with agent-specific formatting.
auto_execution_mode: 1
---

/name: agent_knowledge_sync
/description: Affected-only sync for AGENTS.md (Codex), CLAUDE.md (Claude Code), and .kilocode/\*\* with agent-specific formatting.
/params:

- applyChanges=false
- deepScan=false
- allowFullRewrite=false
- allowList=AGENTS.md,CLAUDE.md,.kilocode/**,docs/\_generated/**

/log 🔄 Agent Knowledge Sync...
/analyze Detect changed sets (deepScan=${deepScan}); compute impact map {codex, claude, kilocode}.

/exec Load /.windsurf/context/agent_profiles.json (schemas).
/exec Validate source docs vs profile: anchors, style, forbidden strings; build knowledge_index.json.
/exec Prepare updates:

- fenced updates for sync blocks (sync:codex, sync:claude, sync:kilocode:<file>)
- if allowFullRewrite && file in allowList && ownership != human: prepare full rewrite (preview+backup)

/if impact:codex
/exec Update AGENTS.md fenced block (Entry Points from codemap deltas, rules links, docs/ADR refs; bullets, ≤100 chars).
/if impact:claude
/exec Update CLAUDE.md fenced block (Rationales + Do/Don't short bullets; ≤100 chars).
/if impact:kilocode
/exec Update each changed .kilocode file fenced block (contract/path/naming deltas).

/if ${applyChanges}==true
/commit chore(knowledge): sync fenced blocks + knowledge index (agent-specific)
/else
/log 🧪 Dry-run only — previews shown.

/report Agent Knowledge — (Agent | Affected | Action | Result)Ï
