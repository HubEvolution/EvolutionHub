---
description: One-click Hygiene Handoff (generate logs + report + clipboard)
auto_execution_mode: 3
---

# Hygiene Handoff — Generate, Summarize, Copy

Dieser Workflow erzeugt einen vollständigen Hygiene-Report, extrahiert relevante Logs (inkl. Debug-Reruns), schreibt eine maschinenlesbare Zusammenfassung und kopiert die kompakte Übergabe-Datei in die Zwischenablage — damit ich ohne weitere Eingaben direkt mit der Fehlerbehebung starten kann.

## Voraussetzungen

- Node-Dependencies installiert (npm install / npm ci)
- macOS (für automatisches Kopieren via pbcopy). Auf anderen OS bitte die Datei manuell öffnen.

## 1) Hygiene laufen lassen + Report erzeugen
// turbo

```bash
npm run hygiene:full
```

Erzeugt:
- reports/code-hygiene-last.log (Gesamtlog)
- reports/hygiene/*.log (pro Schritt)
- reports/code-hygiene-summary.json (Maschinenlesbar)
- reports/assistant-task.md (kompakte Übergabe an den Assistenten)

## 2) Optional: Automatisch in die Zwischenablage kopieren (macOS)
// turbo

```bash
npm run hygiene:handoff
```

- Kopiert reports/assistant-task.md in die Zwischenablage.
- Danach den Inhalt hier im Chat einfügen — ich übernehme direkt die gezielten Fixes.

## Hinweise
- Der Workflow arbeitet fail-soft und bricht nicht ab; alle Fehler werden gelabelt protokolliert.
- Bei Test- oder Docs-Fehlern laufen automatische Debug-Reruns/Exports, damit ich sofort verwertbare Details habe.