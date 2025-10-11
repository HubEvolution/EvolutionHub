---
description: Refactor and consolidate internal memories
---

# Refactor internal memories

## Goal

Unify and de-duplicate "internal memories" by:

- consolidating stable, canonical rules under `.windsurf/rules/`
- keeping architectural/history notes under `docs/architecture/` and `docs/development/`
- generating an index at `docs/_generated/memory-index.md`
- pruning superseded/duplicated items safely

## Prerequisites

- Node/npm installed
- Local repo clean (commit or stash changes)

## Steps

1. Inventory and classify current memories
   - Scan `.windsurf/rules/` and `docs/{architecture,development}/` for overlaps.
   - Classify: Rules (canonical), Status/History, Action Items.

2. Update Windsurf Rules metadata and normalize content
   - Run:

     ```sh
     npm run rules:update
     ```

   - Confirms priority frontmatter and normalizes globs/text.

3. Generate rules coverage report
   - Run:

     ```sh
     npm run rules:coverage
     ```

   - Output: `docs/_generated/cascade-rules-coverage.md`

4. Generate Memory Index
   - Run:

     ```sh
     npm run mem:index
     ```

   - Output: `docs/_generated/memory-index.md`

5. Prune/Archive
   - Remove or archive duplicated/obsolete notes (leave minimal, dated summary when removing).
   - Follow repo policy: deletions are allowed for no-longer-needed artifacts.

6. Review & Commit
   - Inspect changes under `docs/_generated/` and `.windsurf/rules/`.
   - Commit with message, e.g., `chore(mem): consolidate internal memories + regenerate indexes`.

## Notes

- Keep `/src/pages/r2-ai/**` publicly accessible per rules; do not gate or move.
- Respect security/API middleware conventions when moving any related docs.
- Re-run steps 2–4 whenever rules/docs change.
