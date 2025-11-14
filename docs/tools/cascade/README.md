---
description: 'Cascade & Cascade Hooks – Übersicht und Lokale Integration'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-13'
codeRefs: '.windsurf/hooks.json, scripts/hooks/*.mjs'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Cascade & Cascade Hooks

Diese Kategorie beschreibt, wie die agentische IDE **Cascade** in Evolution Hub eingesetzt wird – mit Fokus auf **Cascade Hooks** als lokale Guardrails und Quality-Helfer.

## Scope

- Cascade in Windsurf (Chat, Code, Workflows – nur kurz angerissen)
- Cascade Hooks Konfiguration auf Workspace-Ebene (`.windsurf/hooks.json`)
- Evolution-Hub-spezifische Hooks:
  - `pre_run_command`
  - `pre_write_code`
  - `post_write_code`
- Smoke-Checks & Troubleshooting

## Dokumente

- **[Cascade Hooks – Workspace Hooks für Evolution Hub](./hooks.md)**

## Verwandte Dokumentation

- **Development**: [docs/development/README.md](../../development/README.md)
- **CI/CD**: [docs/development/ci-cd.md](../../development/ci-cd.md)
- **Debug Panel**: [docs/tools/debug-panel.md](../debug-panel.md)
