---
description: Build & update a compact project dashboard (status.md) from codemaps, knowledge, docs, memories and workflows (affected-only)
auto_execution_mode: 3
---

/name: status_refresh
/description: Build & update a compact project dashboard (status.md) from codemaps, knowledge, docs, memories and workflows (affected-only).
/params:

- applyChanges=false
- deepScan=false

/log 📊 Building status dashboard (affected-only)...

/exec Ensure context indexes exist or create empty seeds if missing:

- .windsurf/context/knowledge_index.json
- .windsurf/context/docs_index.json
- .windsurf/context/codemap_index.json # will be created/updated here if missing

/exec Collect metrics:

- Codemaps: detect last rebuild times (global + features) from codemap metadata or file mtimes under .windsurf/codemaps/\*\*; if not present, infer from last context_refresh commits; write/update .windsurf/context/codemap_index.json { mapName, lastRebuildISO, scopePaths }
- Rules: count feature rules present & missing required sections
- Knowledge: load knowledge_index.json → count {ok, missingRefs, mismatch}
- Docs: load docs_index.json → count {ok, missing, mismatch}
- Memories: check .windsurf/memories/\*\* existence & latest timestamp
- Workflows: enumerate .windsurf/workflows/\*.md present

/exec Build a compact Markdown table payload for status.md fenced block:

- Overall Summary (counts)
- Codemap Status (global + 8 features with lastRebuildISO or "unknown")
- Knowledge Status (Codex/Claude/Kilocode counts)
- Docs Sync (ok/missing/mismatch)
- Next Actions (ordered by priority: fix mismatches > rebuild needed > missing rules/docs)

/exec Prepare fenced patch for status.md limited to `sync:status` block only.

/if ${applyChanges}==true
/log ✅ Writing status.md fenced block and updating codemap_index.json if needed...
/commit chore(status): refresh dashboard (status.md) + codemap_index.json
/else
/log 🧪 Dry-run — showing preview only (no writes).

/report Status Refresh — Summary (Area | Value | Notes)
