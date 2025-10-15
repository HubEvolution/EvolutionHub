---
description:
auto_execution_mode: 1
---

/name: context_refresh
/description: Affected-only sync for Codemaps, Rules, Knowledge (AGENTS.md, CLAUDE.md, .kilocode/\*\*), Docs and Memories.
/params:

- applyChanges=false
- deepScan=false
- allowFullRewrite=false
- allowList=docs/\_generated/**,.kilocode/**

/log Starting Context Refresh (affected-only)...
/analyze Classify changes (deepScan=${deepScan}) into: code|rules|knowledge|docs|memories|workflows.

/if changed:code
/log 🧩 Code changed — rebuilding affected Codemaps...
/exec Rebuild only codemaps intersecting changed paths. Rebuild global codemap nur bei entrypoint/router-Änderungen.

/if changed:rules
/log 📜 Rules changed — validate inheritance & links...
/exec Audit global_rules + feature rules. Update NUR betroffene Files; erzwinge Pflicht-Sektionen.

/if changed:knowledge or upstream:rules or upstream:code
/log 🧠 Knowledge impacted — validate agent brains...
/exec Validate AGENTS.md / CLAUDE.md / .kilocode/\*_ gegen /.windsurf/context/agent_profiles.json.
/exec Rebuild knowledge_index.json; generate fenced patch previews gemäß Profilen (sync:codex / sync:claude / sync:kilocode:_).
/exec Wenn allowFullRewrite==true UND Datei in allowList UND ownership != human: full-rewrite (preview+backup+gate).

/if changed:docs or changed:ADR/\*\*
/log 📚 Docs/ADRs changed — sync & cross-ref...
/exec Rebuild docs_index.json; mark ok|missing|mismatch (Truth: Code > Rules > Knowledge > Docs).

/if changed:memories or upstream:code or upstream:rules or upstream:knowledge or upstream:docs
/log 🗂️ Update project memories (merge, non-destructive)...
/exec Merge .windsurf/memories; attach doc_sync_status + knowledge_status; rebuild docs/\_generated/memory-index.md.

/if changed:workflows
/log 🔁 Workflows changed — validate schema/params/links...
/exec Validate .windsurf/workflows/\*.md; ensure common params and proper @codemap/@rules/@knowledge/@docs links.

/if changed:knowledge or upstream:rules or upstream:docs or upstream:code
/log 🧷 Invoke /agent_knowledge_sync for agent-specific formatting...
/run /agent_knowledge_sync applyChanges=${applyChanges} deepScan=${deepScan} allowFullRewrite=${allowFullRewrite} allowList=${allowList}

/if ${applyChanges}==true
/commit chore(context): affected-only refresh (codemaps, rules, knowledge, docs, memories)
/else
/log 🧪 Dry-run — no writes.

/report Context Refresh Summary (Area | Changes | Action | Result)
